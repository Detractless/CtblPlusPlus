// ============================================================
// Chunk 25 of 28
// Original lines: 11205 - 11701 (497 lines)
// Contains: ensureStatsEnabled, getLockDurationWarningText, toTitleCase, toggleBlock, disableDeviceBlock, toggleBlockFeature, changeBlockMode, togglePasswordLockFeature, ...
// ============================================================
import { editAutostart } from '../AutostartEditor/AutostartEditor';
import { getMaxZ } from '../Modal/Modal';
import { getClosestTimeRange, zeroDate} from '../../utils/calculateTime';
import { updateBlocks } from '../../pages/BlocksPage/BlocksPage';
import { updateSettings } from '../../pages/SettingsPage/SettingsPage';
import { AppState } from '../../store/AppState';

export function ensureStatsEnabled(blockId, isLocked, callback) {
  var needsStats = false;
  var dialogSuffix = isLocked == true ? "-lock" : "";
  if (settings.blocks[blockId].type == "continuous" && settings.blocks[blockId].break.indexOf("allowance") == 0 || settings.blocks[blockId].break.indexOf("reward") == 0 || settings.blocks[blockId].break.indexOf("sessions") == 0 || !isNaN(settings.blocks[blockId].break)) {
    needsStats = true;
  } else if (settings.blocks[blockId].type == "scheduled") {
    $.each(settings.blocks[blockId].schedule, function (scheduleIndex, scheduleEntry) {
      if (typeof scheduleEntry.break != "undefined" && (scheduleEntry.break.indexOf("allowance") == 0 || scheduleEntry.break.indexOf("reward") == 0 || scheduleEntry.break.indexOf("sessions") == 0 || !isNaN(scheduleEntry.break))) {
        needsStats = true;
      }
    });
  }
  if (needsStats && (isLocked && (settings.settings.statsEnabled != "true" || settings.settings.statsEnabledIncognito != "true") || !isLocked && settings.settings.statsEnabled != "true")) {
    var $dialogEnableStats = $("#dialog-settings-enable-statistics" + dialogSuffix);
    $dialogEnableStats.dialog({
      modal: true,
      position: {
        my: "center",
        at: "center",
        of: $(".page-content-wrapper")
      },
      width: "350px",
      draggable: false,
      title: "Enable Statistics Feature",
      open: function () {
        var maxZIndex = getMaxZ($(".ui-widget-overlay"));
        $(".ui-widget-overlay").filter(function () {
          return $(this).css("z-index") == maxZIndex;
        }).off("click").on("click", function () {
          $dialogEnableStats.dialog("close");
        });
        $dialogEnableStats.parent().focus().off("keypress").on("keypress", function (event) {
          if (event.which == 13) {
            $(this).find(".btn-green-dialog").click();
          }
        });
      },
      close: function () {
        $dialogEnableStats.hide();
        $dialogEnableStats.dialog("destroy");
      },
      buttons: {
        "No, don't enable": {
          class: "btn-grey-dialog",
          text: "No, don't enable",
          click: function () {
            $dialogEnableStats.dialog("close");
            return;
          }
        },
        "Yes, enable": {
          class: "btn-green-dialog",
          text: "Yes, enable",
          click: function () {
            settings.settings.statsEnabled = "true";
            if (isLocked) {
              settings.settings.statsEnabledIncognito = "true";
            }
            $dialogEnableStats.dialog("close");
            callback();
          }
        }
      }
    }).show();
  } else {
    callback();
  }
}
