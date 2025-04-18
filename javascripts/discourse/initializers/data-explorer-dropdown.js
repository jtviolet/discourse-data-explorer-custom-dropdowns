import { withPluginApi } from "discourse/lib/plugin-api";
import { run } from "@ember/runloop";

export default {
  name: "data-explorer-dropdown",
  initialize() {
    console.log("DATA-EXPLORER-DROPDOWN: Initializer loaded");
    
    withPluginApi("0.8.31", (api) => {
      const PLUGIN_ID = "discourse-custom-data-explorer-dropdown";
      console.log(`${PLUGIN_ID}: Plugin API initialized`);

      api.modifyClass("component:data-explorer-query", {
        pluginId: PLUGIN_ID,
        
        didInsertElement() {
          console.log(`${PLUGIN_ID}: didInsertElement hook fired`);
          this._super(...arguments);
          
          // Debug the component instance
          console.log(`${PLUGIN_ID}: Component properties:`, {
            id: this.elementId,
            query: this.get('query'),
            hasQuery: !!this.get('query')
          });
          
          // Add a slight delay to ensure the DOM is ready
          run.later(() => {
            console.log(`${PLUGIN_ID}: Calling _checkAndHideParameter (delayed)`);
            this._checkAndHideParameter();
          }, 500);
        },

        _checkAndHideParameter() {
          console.log(`${PLUGIN_ID}: _checkAndHideParameter called`);
          
          // Debug the settings values
          console.log(`${PLUGIN_ID}: Theme settings:`, {
            target_query_id: settings.target_query_id,
            parameter_to_hide: settings.parameter_to_hide
          });
          
          // Wait for DOM to be fully loaded with query parameters
          run.scheduleOnce('afterRender', this, () => {
            console.log(`${PLUGIN_ID}: afterRender callback executing`);
            
            // Get current query ID
            const queryId = this.get('query.id');
            console.log(`${PLUGIN_ID}: Current query ID:`, queryId);
            
            if (!queryId) {
              console.log(`${PLUGIN_ID}: No query ID found, exiting`);
              return;
            }
            
            // Get settings
            const targetQueryId = settings.target_query_id;
            const paramToHide = settings.parameter_to_hide;
            
            console.log(`${PLUGIN_ID}: Targeting query ${targetQueryId}, parameter ${paramToHide}`);
            
            // Check if this is the target query
            if (parseInt(queryId, 10) !== parseInt(targetQueryId, 10)) {
              console.log(`${PLUGIN_ID}: Current query ${queryId} does not match target query ${targetQueryId}, exiting`);
              return;
            }
            
            // Check if param to hide is set
            if (!paramToHide) {
              console.log(`${PLUGIN_ID}: No parameter to hide specified, exiting`);
              return;
            }
            
            console.log(`${PLUGIN_ID}: Attempting to hide parameter ${paramToHide} for query ${targetQueryId}`);
            
            // Debug DOM structure
            console.log(`${PLUGIN_ID}: DOM structure of params container:`, {
              paramContainerExists: $('#query-params-container').length,
              totalParamElements: $('.param').length,
              paramElementsHTML: $('.param').map(function() { return this.outerHTML; }).get()
            });
            
            // Try multiple selector strategies to find the parameter
            let paramContainer = null;
            
            // Strategy 1: Try finding by control ID
            paramContainer = $(`#control-${paramToHide}`).closest('.param');
            console.log(`${PLUGIN_ID}: Strategy 1 (control ID) results:`, {
              controlElementExists: $(`#control-${paramToHide}`).length,
              paramContainerFound: paramContainer && paramContainer.length
            });
            
            // Strategy 2: If not found, try finding by data-name attribute
            if (!paramContainer || !paramContainer.length) {
              paramContainer = $(`[data-name="${paramToHide}"]`).closest('.param');
              console.log(`${PLUGIN_ID}: Strategy 2 (data-name) results:`, {
                dataNameElementExists: $(`[data-name="${paramToHide}"]`).length,
                paramContainerFound: paramContainer && paramContainer.length
              });
            }
            
            // Strategy 3: Try finding by label text
            if (!paramContainer || !paramContainer.length) {
              paramContainer = $(`label:contains("${paramToHide}")`).closest('.param');
              console.log(`${PLUGIN_ID}: Strategy 3 (label text) results:`, {
                labelElementExists: $(`label:contains("${paramToHide}")`).length,
                paramContainerFound: paramContainer && paramContainer.length
              });
            }
            
            // Strategy 4: Try finding more broadly
            if (!paramContainer || !paramContainer.length) {
              console.log(`${PLUGIN_ID}: Trying broader search strategies`);
              
              // Try to find by any element containing the param name
              paramContainer = $(`*:contains("${paramToHide}")`).closest('.param');
              console.log(`${PLUGIN_ID}: Broad search results:`, {
                anyElementExists: $(`*:contains("${paramToHide}")`).length,
                paramContainerFound: paramContainer && paramContainer.length
              });
              
              // Debug all form controls to help identify the right selector
              console.log(`${PLUGIN_ID}: All form controls:`, {
                inputFields: $('input').map(function() { 
                  return { 
                    id: this.id, 
                    name: this.name, 
                    'data-name': $(this).attr('data-name'),
                    class: this.className
                  }; 
                }).get(),
                
                formControls: $('.form-kit__field-input-text').map(function() { 
                  return { 
                    id: this.id, 
                    'data-name': $(this).attr('data-name'),
                    parent: $(this).parent().attr('class')
                  }; 
                }).get()
              });
            }
            
            if (!paramContainer || !paramContainer.length) {
              console.error(`${PLUGIN_ID}: Could not find parameter input with name ${paramToHide}`);
              return;
            }
            
            console.log(`${PLUGIN_ID}: Found parameter container:`, {
              html: paramContainer.prop('outerHTML')
            });
            
            // Hide the parameter container
            paramContainer.addClass('hidden-param-input');
            console.log(`${PLUGIN_ID}: Added 'hidden-param-input' class to parameter container`);
            
            // Double-check that the element is now hidden
            setTimeout(() => {
              console.log(`${PLUGIN_ID}: Verification check:`, {
                paramContainerHasClass: paramContainer.hasClass('hidden-param-input'),
                isParamContainerVisible: paramContainer.is(':visible')
              });
            }, 100);
          });
        }
      });
    });
  }
}; 