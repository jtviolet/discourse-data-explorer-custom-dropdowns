import { withPluginApi } from "discourse/lib/plugin-api";
import { run } from "@ember/runloop";

export default {
  name: "data-explorer-dropdown",
  initialize() {
    withPluginApi("0.8.31", (api) => {
      const PLUGIN_ID = "discourse-custom-data-explorer-dropdown";

      api.modifyClass("component:data-explorer-query", {
        pluginId: PLUGIN_ID,
        
        didInsertElement() {
          this._super(...arguments);
          this._checkAndHideParameter();
        },

        _checkAndHideParameter() {
          // Wait for DOM to be fully loaded with query parameters
          run.scheduleOnce('afterRender', this, () => {
            // Get current query ID
            const queryId = this.get('query.id');
            if (!queryId) return;
            
            // Get settings
            const targetQueryId = settings.target_query_id;
            const paramToHide = settings.parameter_to_hide;
            
            // Check if this is the target query
            if (parseInt(queryId, 10) !== parseInt(targetQueryId, 10)) {
              console.log(`${PLUGIN_ID}: Current query ${queryId} does not match target query ${targetQueryId}`);
              return;
            }
            
            // Check if param to hide is set
            if (!paramToHide) {
              console.log(`${PLUGIN_ID}: No parameter to hide specified`);
              return;
            }
            
            console.log(`${PLUGIN_ID}: Attempting to hide parameter ${paramToHide} for query ${targetQueryId}`);
            
            // Try multiple selector strategies to find the parameter
            let paramContainer = null;
            
            // Strategy 1: Try finding by control ID
            paramContainer = $(`#control-${paramToHide}`).closest('.param');
            
            // Strategy 2: If not found, try finding by data-name attribute
            if (!paramContainer || !paramContainer.length) {
              paramContainer = $(`[data-name="${paramToHide}"]`).closest('.param');
            }
            
            // Strategy 3: Try finding by label text
            if (!paramContainer || !paramContainer.length) {
              paramContainer = $(`label:contains("${paramToHide}")`).closest('.param');
            }
            
            if (!paramContainer || !paramContainer.length) {
              console.error(`${PLUGIN_ID}: Could not find parameter input with name ${paramToHide}`);
              return;
            }
            
            // Hide the parameter container
            paramContainer.addClass('hidden-param-input');
            console.log(`${PLUGIN_ID}: Successfully hid parameter ${paramToHide}`);
          });
        }
      });
    });
  }
}; 