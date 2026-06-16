// ============================================================
// Chunk 6 of 28
// Original lines: 2276 - 2364 (89 lines)
// Contains: showNoLockSetReminder, updateReminders, isTodayButAfterNow, isToday
// ============================================================
import { getMaxZ } from '../Modal/Modal';
import { updateSettings } from '../../pages/SettingsPage/SettingsPage';
import { AppState } from '../../store/AppState';

export function showNoLockSetReminder() {
  var $dialogNoLocksSet = $("#dialog-unlocked");
  $dialogNoLocksSet.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "600px",
    draggable: false,
    title: "No Locks Set on Any Blocks",
    open: function () {
      var maxZ1 = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ1;
      }).off("click").on("click", function () {
        $dialogNoLocksSet.dialog("close");
      });
      $dialogNoLocksSet.parent().focus();
    },
    close: function () {
      $dialogNoLocksSet.dialog("destroy");
      $dialogNoLocksSet.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          if ($("#dialog-unlocked-again").is(":checked")) {
            settings.settings.showNoLockSet = "false";
            updateReminders();
            updateSettings(true);
            save();
          }
          $dialogNoLocksSet.dialog("close");
        }
      }
    }
  }).show();
}
export function updateReminders() {
  var nowDate = new Date();
  var hasEnabledBlocks = false;
  var hasLockedBlocks = false;
  var hasEmptySchedule = false;
  $.each(settings.blocks, function (blockName, blockData) {
    if (blockData.enabled == "true") {
      hasEnabledBlocks = true;
      if (blockData.lock != "none") {
        hasLockedBlocks = true;
      } else if ((blockName == "Frozen Turkey" || blockName.indexOf("Frozen Turkey,") == 0) && blockData.timer.indexOf(",") > 0) {
        var timerParts = blockData.timer.split(",");
        var timerDate = new Date(timerParts[0], timerParts[1] - 1, timerParts[2], timerParts[3], timerParts[4], 0, 0);
        if (nowDate < timerDate) {
          hasLockedBlocks = true;
        }
      }
      if (blockData.type == "scheduled" && blockData.schedule.length == 0) {
        hasEmptySchedule = true;
      }
    }
  });
  if (hasEnabledBlocks && !hasLockedBlocks && AppState.passwordStrict.indexOf("lock") < 0 && settings.settings.showNoLockSet == "true") {
    $("#sidebar-button-lock-block").show();
  } else {
    $("#sidebar-button-lock-block").hide();
  }
  if (hasEmptySchedule && settings.settings.showNoSchedule == "true") {
    $("#sidebar-button-empty-schedule").show();
  } else {
    $("#sidebar-button-empty-schedule").hide();
  }
}
export function isTodayButAfterNow(targetDate1) {
  var nowDate2 = new Date();
  if (targetDate1 == undefined) {
    return false;
  }
  return targetDate1 > nowDate2 && targetDate1.getFullYear() === nowDate2.getFullYear() && targetDate1.getMonth() === nowDate2.getMonth() && targetDate1.getDate() === nowDate2.getDate();
}
export function isToday(targetDate2) {
  var nowDate3 = new Date();
  if (targetDate2 == undefined) {
    return false;
  }
  return targetDate2.getFullYear() === nowDate3.getFullYear() && targetDate2.getMonth() === nowDate3.getMonth() && targetDate2.getDate() === nowDate3.getDate();
}
