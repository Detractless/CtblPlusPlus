
import { AppState } from '../store/AppState';

export var AllowanceService = {
  getAllowances: function() {
    try {
      return JSON.parse(window.external.SendAllowanceUpdate());
    } catch (e) {
      console.error("Failed to parse AppState.allowances from external API", e);
      return {};
    }
  },
  getTrayText: function(trayText) {
    if (window.external && typeof window.external.GetTrayText === 'function') {
      window.external.GetTrayText(trayText);
    }
  }
};
