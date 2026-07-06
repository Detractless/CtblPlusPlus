
import { updateReminders } from '../Reminders/Reminders';
import { getMaxZ } from '../Modal/Modal';
import { updateSettings } from '../../pages/SettingsPage/SettingsPage';
import { AppState } from '../../store/AppState';

export function showEmptyCalendarReminder() {
  var emptyBlocksList = [];
  $.each(settings.blocks, function (blockName3, blockData3) {
    if (blockData3.enabled == "true") {
      if (blockData3.type == "scheduled" && blockData3.schedule.length == 0) {
        var strippedBlockName = blockName3;
        if (blockName3.indexOf("Frozen Turkey,") == 0) {
          strippedBlockName = blockName3.replace("Frozen Turkey,", "");
        } else if (blockName3.indexOf("Focused Turkey,") == 0) {
          strippedBlockName = blockName3.replace("Focused Turkey,", "");
        }
        emptyBlocksList.push(strippedBlockName);
      }
    }
  });
  if (emptyBlocksList.length > 0) {
    var $dialogEmptySchedule = $("#dialog-empty-schedule");
    $dialogEmptySchedule.dialog({
      modal: true,
      position: {
        my: "center",
        at: "center",
        of: $(".page-content-wrapper")
      },
      width: "600px",
      draggable: false,
      title: "No Blocks Added to a Scheduled Block",
      create: function () {
        $("#dialog-empty-schedule-blocks").empty();
        $.each(emptyBlocksList, function (emptyIndex, emptyBlockName) {
          $("#dialog-empty-schedule-blocks").append($("<li>").text(emptyBlockName));
        });
      },
      open: function () {
        var maxZ9 = getMaxZ($(".ui-widget-overlay"));
        $(".ui-widget-overlay").filter(function () {
          return $(this).css("z-index") == maxZ9;
        }).off("click").on("click", function () {
          $dialogEmptySchedule.dialog("close");
        });
        $dialogEmptySchedule.parent().focus();
      },
      close: function () {
        $dialogEmptySchedule.dialog("destroy");
        $dialogEmptySchedule.hide();
      },
      buttons: {
        Close: {
          class: "btn-green-dialog",
          text: "Close",
          click: function () {
            if ($("#dialog-empty-schedule-blocks-again").is(":checked")) {
              settings.settings.showNoSchedule = "false";
              updateReminders();
              updateSettings(true);
              save();
            }
            $dialogEmptySchedule.dialog("close");
          }
        }
      }
    }).show();
  }
}
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

window.showEmptyCalendarReminder = showEmptyCalendarReminder;
window.showNoLockSetReminder = showNoLockSetReminder;
