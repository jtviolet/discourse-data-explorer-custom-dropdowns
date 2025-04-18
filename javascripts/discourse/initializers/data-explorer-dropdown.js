import { withPluginApi } from "discourse/lib/plugin-api";
import { later, cancel } from "@ember/runloop";

export default {
  name: "data-explorer-dropdown",
  initialize() {
    console.log("DATA-EXPLORER-DROPDOWN: Initializer loaded");
    
    withPluginApi("0.8.31", (api) => {
      const PLUGIN_ID = "discourse-custom-data-explorer-dropdown";
      console.log(`${PLUGIN_ID}: Plugin API initialized`);
      
      // Track processing state
      let initialCheckComplete = false;
      let isCurrentlyProcessing = false;
      const processedQueries = new Set();
      let pendingTimer = null;

      // Main handler function - used for both initial load and page changes
      function handlePage() {
        // Avoid concurrent processing
        if (isCurrentlyProcessing) {
          return;
        }
        
        try {
          isCurrentlyProcessing = true;
          
          // Cancel any pending operations
          if (pendingTimer) {
            cancel(pendingTimer);
            pendingTimer = null;
          }
          
          // Check if we're on a data explorer page
          if (!window.location.href.includes("/admin/plugins/explorer")) {
            isCurrentlyProcessing = false;
            return;
          }
          
          // Get settings
          const targetQueryId = settings.target_query_id;
          const paramToHide = settings.parameter_to_hide;
          
          if (!targetQueryId || !paramToHide) {
            isCurrentlyProcessing = false;
            return;
          }
          
          // Get the current query ID from the URL
          const urlMatch = window.location.href.match(/\/queries\/(\d+)/);
          const currentQueryId = urlMatch ? parseInt(urlMatch[1], 10) : null;
          
          if (!currentQueryId || currentQueryId !== parseInt(targetQueryId, 10)) {
            isCurrentlyProcessing = false;
            return;
          }
          
          // Create a unique key for this query + parameter combination
          const processKey = `${currentQueryId}-${paramToHide}`;
          
          // If we've already processed this query, don't do it again
          if (processedQueries.has(processKey)) {
            isCurrentlyProcessing = false;
            return;
          }
          
          // Only log once
          if (!initialCheckComplete) {
            console.log(`${PLUGIN_ID}: Processing query ${currentQueryId}, parameter ${paramToHide}`);
          }
          
          // Schedule the actual processing
          pendingTimer = later(() => {
            try {
              const result = hideParameterField(paramToHide);
              
              if (result) {
                console.log(`${PLUGIN_ID}: Successfully hidden parameter ${paramToHide}`);
                processedQueries.add(processKey);
              }
            } finally {
              // Always release the processing lock
              isCurrentlyProcessing = false;
              initialCheckComplete = true;
            }
          }, 500);
          
        } catch (error) {
          console.error(`${PLUGIN_ID}: Error in handlePage:`, error.message);
          isCurrentlyProcessing = false;
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
      
      // Set up page change handler
      api.onPageChange(() => {
        handlePage();
      });
      
      // Initial check - with a small delay to ensure everything is loaded
      later(handlePage, 100);
    });
  }
}; 