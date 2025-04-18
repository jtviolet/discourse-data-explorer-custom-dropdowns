import { withPluginApi } from "discourse/lib/plugin-api";
import { run } from "@ember/runloop";

export default {
  name: "data-explorer-dropdown",
  initialize() {
    console.log("DATA-EXPLORER-DROPDOWN: Initializer loaded");
    
    withPluginApi("0.8.31", (api) => {
      const PLUGIN_ID = "discourse-custom-data-explorer-dropdown";
      console.log(`${PLUGIN_ID}: Plugin API initialized`);

      // Use page URL to determine if we're on a data explorer page
      function checkForDataExplorer() {
        console.log(`${PLUGIN_ID}: Checking if this is a data explorer page`);
        
        // Check if URL contains data explorer
        if (window.location.href.includes("/admin/plugins/explorer")) {
          console.log(`${PLUGIN_ID}: This is a data explorer page`);
          
          // Add a mutation observer to catch when the query parameters load
          setupMutationObserver();
        } else {
          console.log(`${PLUGIN_ID}: Not a data explorer page, skipping`);
        }
      }
      
      function setupMutationObserver() {
        console.log(`${PLUGIN_ID}: Setting up mutation observer`);
        
        // Wait a moment for the page to render
        run.later(() => {
          // Get the main container - this might need adjustment
          const container = document.getElementById("main-outlet") || document.body;
          
          // Get settings
          const targetQueryId = settings.target_query_id;
          const paramToHide = settings.parameter_to_hide;
          
          console.log(`${PLUGIN_ID}: Settings loaded:`, {
            targetQueryId,
            paramToHide
          });
          
          // Check if settings are valid
          if (!targetQueryId || !paramToHide) {
            console.log(`${PLUGIN_ID}: Missing settings, aborting`);
            return;
          }
          
          // Get the current query ID from the URL
          const urlMatch = window.location.href.match(/\/queries\/(\d+)/);
          const currentQueryId = urlMatch ? parseInt(urlMatch[1], 10) : null;
          
          console.log(`${PLUGIN_ID}: Current query ID from URL: ${currentQueryId}`);
          
          // Check if this is the target query
          if (currentQueryId !== parseInt(targetQueryId, 10)) {
            console.log(`${PLUGIN_ID}: This is not the target query, skipping`);
            return;
          }
          
          console.log(`${PLUGIN_ID}: This is the target query (${currentQueryId}), looking for parameter to hide`);
          
          // Try to find and hide the parameter immediately
          attemptToHideParameter(paramToHide);
          
          // Set up observer to catch when parameters load
          const observer = new MutationObserver((mutations) => {
            console.log(`${PLUGIN_ID}: DOM mutation detected`);
            attemptToHideParameter(paramToHide);
          });
          
          // Start observing
          observer.observe(container, {
            childList: true,
            subtree: true
          });
          
          console.log(`${PLUGIN_ID}: Mutation observer setup complete`);
        }, 1000); // Wait 1 second for initial render
      }
      
      function attemptToHideParameter(paramToHide) {
        console.log(`${PLUGIN_ID}: Attempting to hide parameter: ${paramToHide}`);
        
        // Get all form control elements
        const formControls = document.querySelectorAll('.param, .form-kit__container, input, select, textarea');
        console.log(`${PLUGIN_ID}: Found ${formControls.length} potential form controls`);
        
        // DEBUG: Log all form controls to help identify patterns
        const formControlInfo = Array.from(formControls).map(el => ({
          id: el.id,
          className: el.className,
          tagName: el.tagName,
          dataName: el.getAttribute('data-name'),
          text: el.innerText ? el.innerText.substring(0, 30) : null
        }));
        console.log(`${PLUGIN_ID}: Form control details:`, formControlInfo);
        
        // Try multiple strategies to find the parameter
        
        // Strategy 1: Direct ID match
        let found = document.getElementById(`control-${paramToHide}`);
        if (found) {
          console.log(`${PLUGIN_ID}: Found by ID: #control-${paramToHide}`);
          hideElement(found.closest('.param') || found.closest('.form-kit__container') || found);
          return;
        }
        
        // Strategy 2: Data attribute match
        found = document.querySelector(`[data-name="${paramToHide}"]`);
        if (found) {
          console.log(`${PLUGIN_ID}: Found by data-name: ${paramToHide}`);
          hideElement(found.closest('.param') || found.closest('.form-kit__container') || found);
          return;
        }
        
        // Strategy 3: Look for labels containing the parameter name
        const labels = document.querySelectorAll('label');
        for (const label of labels) {
          if (label.textContent.includes(paramToHide)) {
            console.log(`${PLUGIN_ID}: Found by label text: ${label.textContent}`);
            hideElement(label.closest('.param') || label.closest('.form-kit__container') || label);
            return;
          }
        }
        
        // Strategy 4: Class-based approach for the username search
        if (paramToHide === "username_search") {
          found = document.getElementById('control-username_search');
          if (found) {
            console.log(`${PLUGIN_ID}: Found username search field`);
            hideElement(found.closest('.param') || found.closest('.form-kit__container') || found);
            return;
          }
        }
        
        console.log(`${PLUGIN_ID}: Could not find parameter ${paramToHide} using any strategy`);
      }
      
      function hideElement(element) {
        if (!element) {
          console.log(`${PLUGIN_ID}: No element to hide`);
          return;
        }
        
        console.log(`${PLUGIN_ID}: Hiding element:`, {
          id: element.id,
          className: element.className,
          html: element.outerHTML.substring(0, 100) + '...'
        });
        
        // Apply hidden class
        element.classList.add('hidden-param-input');
        
        // Force hide with inline styles as a backup
        element.style.display = 'none';
        element.style.visibility = 'hidden';
        
        console.log(`${PLUGIN_ID}: Element hidden, class list now:`, element.className);
      }
      
      // Set up page change handler
      api.onPageChange(() => {
        console.log(`${PLUGIN_ID}: Page changed, checking for data explorer`);
        checkForDataExplorer();
      });
      
      // Initial check
      checkForDataExplorer();
    });
  }
}; 