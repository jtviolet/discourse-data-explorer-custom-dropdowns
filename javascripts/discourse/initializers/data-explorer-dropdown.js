import { withPluginApi } from "discourse/lib/plugin-api";
import { later, cancel } from "@ember/runloop";

export default {
  name: "data-explorer-dropdown",
  initialize() {
    console.log("DATA-EXPLORER-DROPDOWN: Initializer loaded");
    
    withPluginApi("0.8.31", (api) => {
      const PLUGIN_ID = "discourse-custom-data-explorer-dropdown";
      console.log(`${PLUGIN_ID}: Plugin API initialized`);
      
      // Keep track of which queries we've already processed
      const processedQueries = new Set();
      
      // Track setTimeout references
      let pendingTimer = null;

      // Use page URL to determine if we're on a data explorer page
      function checkForDataExplorer() {
        try {
          // Cancel any pending timer to prevent double execution
          if (pendingTimer) {
            cancel(pendingTimer);
            pendingTimer = null;
          }
          
          // Check if URL contains data explorer
          if (window.location.href.includes("/admin/plugins/explorer")) {
            console.log(`${PLUGIN_ID}: This is a data explorer page`);
            
            // Process the data explorer page
            processDataExplorerPage();
          }
        } catch (error) {
          console.error(`${PLUGIN_ID}: Error in checkForDataExplorer:`, error.message);
        }
      }
      
      function processDataExplorerPage() {
        try {
          // Get settings
          const targetQueryId = settings.target_query_id;
          const paramToHide = settings.parameter_to_hide;
          
          if (!targetQueryId || !paramToHide) {
            console.log(`${PLUGIN_ID}: Missing settings, skipping`);
            return;
          }
          
          // Get the current query ID from the URL
          const urlMatch = window.location.href.match(/\/queries\/(\d+)/);
          const currentQueryId = urlMatch ? parseInt(urlMatch[1], 10) : null;
          
          if (!currentQueryId) {
            return;
          }
          
          // Check if this is the target query
          if (currentQueryId !== parseInt(targetQueryId, 10)) {
            return;
          }
          
          console.log(`${PLUGIN_ID}: Processing query ${currentQueryId}, parameter ${paramToHide}`);
          
          // Create a unique key for this query + parameter combination
          const processKey = `${currentQueryId}-${paramToHide}`;
          
          // If we've already processed and hidden this parameter, don't try again
          if (processedQueries.has(processKey)) {
            console.log(`${PLUGIN_ID}: Already processed this query+parameter`);
            return;
          }
          
          // Set a timeout to allow the page to fully render
          pendingTimer = later(() => {
            const result = hideParameterField(paramToHide);
            
            if (result) {
              console.log(`${PLUGIN_ID}: Successfully processed query ${currentQueryId}, parameter ${paramToHide}`);
              processedQueries.add(processKey);
            }
          }, 500);
        } catch (error) {
          console.error(`${PLUGIN_ID}: Error in processDataExplorerPage:`, error.message);
        }
      }
      
      function hideParameterField(paramToHide) {
        try {
          // Try with ID selector first (most reliable)
          let paramElement = document.getElementById(`control-${paramToHide}`);
          if (paramElement) {
            hideElement(findParentParam(paramElement));
            return true;
          }
          
          // Try with data-name attribute
          paramElement = document.querySelector(`[data-name="${paramToHide}"]`);
          if (paramElement) {
            hideElement(findParentParam(paramElement));
            return true;
          }
          
          // Try with span containing text
          const spans = document.querySelectorAll('span');
          for (let i = 0; i < spans.length; i++) {
            if (spans[i].textContent === paramToHide) {
              hideElement(findParentParam(spans[i]));
              return true;
            }
          }
          
          // Try finding by label
          const labels = document.querySelectorAll('label');
          for (let i = 0; i < labels.length; i++) {
            if (labels[i].textContent.includes(paramToHide)) {
              hideElement(findParentParam(labels[i]));
              return true;
            }
          }
          
          // As a last resort, try finding any elements with username_search in their HTML
          if (paramToHide === "username_search") {
            const allElements = document.querySelectorAll('*');
            for (let i = 0; i < allElements.length; i++) {
              if (allElements[i].id && allElements[i].id.includes("username_search")) {
                hideElement(findParentParam(allElements[i]));
                return true;
              }
            }
          }
          
          return false;
        } catch (error) {
          console.error(`${PLUGIN_ID}: Error in hideParameterField:`, error.message);
          return false;
        }
      }
      
      function findParentParam(element) {
        try {
          // Try to find the parent .param element
          let parent = element;
          let iterations = 0;
          
          while (parent && !parent.classList.contains('param') && iterations < 10) {
            parent = parent.parentElement;
            iterations++;
          }
          
          // If we couldn't find a .param parent, try other common container classes
          if (!parent || !parent.classList.contains('param')) {
            const formContainer = element.closest('.form-kit__container');
            if (formContainer) {
              return formContainer.parentElement || formContainer;
            }
            return element;
          }
          
          return parent;
        } catch (error) {
          console.error(`${PLUGIN_ID}: Error in findParentParam:`, error.message);
          return element;
        }
      }
      
      function hideElement(element) {
        try {
          if (!element) {
            return;
          }
          
          // Add our class
          element.classList.add('hidden-param-input');
          
          // Apply inline styles for redundancy
          element.style.display = 'none';
          element.style.visibility = 'hidden';
        } catch (error) {
          console.error(`${PLUGIN_ID}: Error in hideElement:`, error.message);
        }
      }
      
      // Set up page change handler with error handling
      api.onPageChange(() => {
        try {
          checkForDataExplorer();
        } catch (error) {
          console.error(`${PLUGIN_ID}: Error in onPageChange handler:`, error.message);
        }
      });
      
      // Initial check
      try {
        checkForDataExplorer();
      } catch (error) {
        console.error(`${PLUGIN_ID}: Error in initial check:`, error.message);
      }
    });
  }
}; 