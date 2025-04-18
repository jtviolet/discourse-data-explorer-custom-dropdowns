import { withPluginApi } from "discourse/lib/plugin-api";
import { later } from "@ember/runloop";

export default {
  name: "data-explorer-dropdown",
  initialize() {
    console.log("DATA-EXPLORER-DROPDOWN: Initializer loaded");
    
    withPluginApi("0.8.31", (api) => {
      const PLUGIN_ID = "discourse-custom-data-explorer-dropdown";
      console.log(`${PLUGIN_ID}: Plugin API initialized`);
      
      // Keep track of which queries we've already processed
      const processedQueries = new Set();

      // Use page URL to determine if we're on a data explorer page
      function checkForDataExplorer() {
        try {
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
          
          console.log(`${PLUGIN_ID}: Target query: ${targetQueryId}, Parameter: ${paramToHide}`);
          
          // Check if settings are valid
          if (!targetQueryId || !paramToHide) {
            console.log(`${PLUGIN_ID}: Missing settings, skipping`);
            return;
          }
          
          // Get the current query ID from the URL
          const urlMatch = window.location.href.match(/\/queries\/(\d+)/);
          const currentQueryId = urlMatch ? parseInt(urlMatch[1], 10) : null;
          
          if (!currentQueryId) {
            console.log(`${PLUGIN_ID}: Not on a specific query page`);
            return;
          }
          
          console.log(`${PLUGIN_ID}: Current query ID: ${currentQueryId}`);
          
          // Check if this is the target query
          if (currentQueryId !== parseInt(targetQueryId, 10)) {
            console.log(`${PLUGIN_ID}: Not the target query, skipping`);
            return;
          }
          
          // Create a unique key for this query + parameter combination
          const processKey = `${currentQueryId}-${paramToHide}`;
          
          // If we've already processed this query + parameter, don't do it again
          if (processedQueries.has(processKey)) {
            console.log(`${PLUGIN_ID}: Already processed query ${currentQueryId}, parameter ${paramToHide}`);
            return;
          }
          
          // Set a timeout to allow the page to fully render
          later(() => {
            if (hideParameterField(paramToHide)) {
              // Only mark as processed if we successfully hid the parameter
              processedQueries.add(processKey);
            } else {
              // If we fail to hide it, we'll try again next time
              console.log(`${PLUGIN_ID}: Failed to hide parameter, will try again on next event`);
            }
          }, 500);
        } catch (error) {
          console.error(`${PLUGIN_ID}: Error in processDataExplorerPage:`, error.message);
        }
      }
      
      function hideParameterField(paramToHide) {
        try {
          console.log(`${PLUGIN_ID}: Attempting to hide parameter: ${paramToHide}`);
          
          // Try with ID selector first (most reliable)
          let paramElement = document.getElementById(`control-${paramToHide}`);
          if (paramElement) {
            console.log(`${PLUGIN_ID}: Found element by ID`);
            hideElement(findParentParam(paramElement));
            return true;
          }
          
          // Try with data-name attribute
          paramElement = document.querySelector(`[data-name="${paramToHide}"]`);
          if (paramElement) {
            console.log(`${PLUGIN_ID}: Found element by data-name`);
            hideElement(findParentParam(paramElement));
            return true;
          }
          
          // Try with span containing text
          const spans = document.querySelectorAll('span');
          for (let i = 0; i < spans.length; i++) {
            if (spans[i].textContent === paramToHide) {
              console.log(`${PLUGIN_ID}: Found element by text content`);
              hideElement(findParentParam(spans[i]));
              return true;
            }
          }
          
          // Try finding by label
          const labels = document.querySelectorAll('label');
          for (let i = 0; i < labels.length; i++) {
            if (labels[i].textContent.includes(paramToHide)) {
              console.log(`${PLUGIN_ID}: Found by label containing text: ${paramToHide}`);
              hideElement(findParentParam(labels[i]));
              return true;
            }
          }
          
          // As a last resort, try finding any elements with username_search in their HTML
          if (paramToHide === "username_search") {
            const allElements = document.querySelectorAll('*');
            for (let i = 0; i < allElements.length; i++) {
              if (allElements[i].id && allElements[i].id.includes("username_search")) {
                console.log(`${PLUGIN_ID}: Found element with username_search in ID`);
                hideElement(findParentParam(allElements[i]));
                return true;
              }
            }
          }
          
          console.log(`${PLUGIN_ID}: Could not find parameter element`);
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
            console.log(`${PLUGIN_ID}: No element to hide`);
            return;
          }
          
          console.log(`${PLUGIN_ID}: Hiding element with ID: ${element.id || 'no-id'}`);
          
          // Add our class
          element.classList.add('hidden-param-input');
          
          // Apply inline styles for redundancy
          element.style.display = 'none';
          element.style.visibility = 'hidden';
          
          console.log(`${PLUGIN_ID}: Element hidden successfully`);
        } catch (error) {
          console.error(`${PLUGIN_ID}: Error in hideElement:`, error.message);
        }
      }
      
      // Set up page change handler with error handling
      api.onPageChange(() => {
        try {
          console.log(`${PLUGIN_ID}: Page changed`);
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