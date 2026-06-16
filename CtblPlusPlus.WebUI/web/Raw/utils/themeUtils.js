// ============================================================
// Chunk 3 of 28
// Original lines: 826 - 1319 (494 lines)
// Contains: updateTheme, switchTheme, updateWeekStart, showExtensionHelp, showUnblockTabHelp, showNotificationHelp, showZoomHelp, showPomodoroHelp, ...
// ============================================================
import { showExtensionHelp, showUnblockTabHelp, showNotificationHelp, showZoomHelp, showPomodoroHelp } from '../components/ThemeModal/ThemeModal';
import { stats } from '../components/StatsChart/StatsChart';

export function updateTheme() {
  if (settings.settings.theme == "system") {
    window.currentTheme = window.external.GetTheme();
  } else {
    window.currentTheme = settings.settings.theme;
  }
  switchTheme();
}
export function switchTheme() {
  switch (currentTheme) {
    case "light":
      $("#theme_dark").prop("disabled", true);
      $("#theme_light").prop("disabled", false);
      break;
    case "dark":
      $("#theme_light").prop("disabled", true);
      $("#theme_dark").prop("disabled", false);
      break;
    default:
      $("#theme_light").prop("disabled", true);
      $("#theme_dark").prop("disabled", false);
      break;
  }
}
export function updateWeekStart() {
  moment.locale("en");
  if (settings.settings.weekStart == "monday") {
    moment.updateLocale("en", {
      week: {
        dow: 1,
        doy: 4
      }
    });
  } else if (settings.settings.weekStart == "saturday") {
    moment.updateLocale("en", {
      week: {
        dow: 6,
        doy: 12
      }
    });
  } else {
    moment.updateLocale("en", {
      week: {
        dow: 0,
        doy: 6
      }
    });
  }
  $("#stats-blocked-web-timeframe").trigger("change");
  $("#stats-blocked-app-timeframe").trigger("change");
  $("#stats-web-timeframe").trigger("change");
  $("#stats-app-timeframe").trigger("change");
}
