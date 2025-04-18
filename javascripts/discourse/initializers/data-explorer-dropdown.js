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
          const dropdownOptions = parseDropdownOptions(settings.dropdown_options);
          
          if (!targetQueryId || !paramToHide || !dropdownOptions.length) {
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
              const result = replaceWithCustomDropdown(paramToHide, dropdownOptions);
              
              if (result) {
                console.log(`${PLUGIN_ID}: Successfully replaced parameter ${paramToHide} with custom dropdown`);
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
      
      // Parse the dropdown options from the settings
      function parseDropdownOptions(optionsStr) {
        if (!optionsStr) return [];
        
        const options = [];
        
        // Check if it's a string (from the default setting) or an array (from the actual list setting)
        const optionsArray = Array.isArray(optionsStr) ? optionsStr : [optionsStr];
        
        optionsArray.forEach(optionLine => {
          // Handle both comma-separated options (within a single line) and multiple lines
          const parts = optionLine.split(',');
          
          parts.forEach(part => {
            const [label, value] = part.split(':');
            if (label && value) {
              options.push({
                label: label.trim(),
                value: value.trim()
              });
            }
          });
        });
        
        return options;
      }
      
      // Find and replace parameter with custom dropdown
      function replaceWithCustomDropdown(paramToHide, dropdownOptions) {
        try {
          // First, find the parameter container
          const paramContainer = findParameterContainer(paramToHide);
          if (!paramContainer) {
            console.error(`${PLUGIN_ID}: Could not find parameter container for ${paramToHide}`);
            return false;
          }
          
          // Find the input field within the container
          const inputField = paramContainer.querySelector('input');
          if (!inputField) {
            console.error(`${PLUGIN_ID}: Could not find input field in parameter container`);
            return false;
          }
          
          // Get a user-friendly label text (capitalize and replace underscores with spaces)
          const friendlyLabel = paramToHide
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          // Hide the original parameter container
          hideElement(paramContainer);
          
          // Create custom dropdown
          const dropdownContainer = document.createElement('div');
          dropdownContainer.className = 'custom-dropdown-container param';
          
          // Create label
          const newLabel = document.createElement('label');
          newLabel.className = 'custom-dropdown-label';
          newLabel.textContent = friendlyLabel;
          dropdownContainer.appendChild(newLabel);
          
          // Create select wrapper for better styling
          const selectWrapper = document.createElement('div');
          selectWrapper.className = 'select-wrapper';
          
          // Create select element
          const selectElement = document.createElement('select');
          selectElement.className = 'custom-param-dropdown';
          
          // Add empty option first
          const emptyOption = document.createElement('option');
          emptyOption.value = '';
          emptyOption.textContent = `Select ${friendlyLabel}...`;
          selectElement.appendChild(emptyOption);
          
          // Add options from settings
          dropdownOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            selectElement.appendChild(optionElement);
          });
          
          // If the input field has a value, try to select the matching option
          if (inputField.value) {
            selectElement.value = inputField.value;
          }
          
          // Add change event listener
          selectElement.addEventListener('change', function() {
            // Update the hidden input field
            inputField.value = this.value;
            
            // Trigger change event on the hidden input
            const event = new Event('change', {
              bubbles: true,
              cancelable: true,
            });
            inputField.dispatchEvent(event);
            
            // Also trigger input event for good measure
            const inputEvent = new Event('input', {
              bubbles: true,
              cancelable: true,
            });
            inputField.dispatchEvent(inputEvent);
          });
          
          // Add select to wrapper, then wrapper to container
          selectWrapper.appendChild(selectElement);
          dropdownContainer.appendChild(selectWrapper);
          
          // Insert dropdown after the hidden parameter
          paramContainer.parentNode.insertBefore(dropdownContainer, paramContainer.nextSibling);
          
          return true;
        } catch (error) {
          console.error(`${PLUGIN_ID}: Error creating custom dropdown:`, error.message);
          return false;
        }
      }
      
      // Find parameter container using multiple strategies
      function findParameterContainer(paramToHide) {
        // Try with ID selector first (most reliable)
        let element = document.getElementById(`control-${paramToHide}`);
        if (element) {
          return findParentParam(element);
        }
        
        // Try with data-name attribute
        element = document.querySelector(`[data-name="${paramToHide}"]`);
        if (element) {
          return findParentParam(element);
        }
        
        // Try with span containing text
        const spans = document.querySelectorAll('span');
        for (let i = 0; i < spans.length; i++) {
          if (spans[i].textContent === paramToHide) {
            return findParentParam(spans[i]);
          }
        }
        
        // Try finding by label
        const labels = document.querySelectorAll('label');
        for (let i = 0; i < labels.length; i++) {
          if (labels[i].textContent.includes(paramToHide)) {
            return findParentParam(labels[i]);
          }
        }
        
        // Special case for username_search
        if (paramToHide === "username_search") {
          const allElements = document.querySelectorAll('*');
          for (let i = 0; i < allElements.length; i++) {
            if (allElements[i].id && allElements[i].id.includes("username_search")) {
              return findParentParam(allElements[i]);
            }
          }
        }
        
        return null;
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