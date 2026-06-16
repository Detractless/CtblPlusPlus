
import { getMaxZ } from '../Modal/Modal';
import { getLockDurationWarningText } from '../../utils/calculateTime';
import { updateBlocks } from '../../pages/BlocksPage/BlocksPage';
import { updateOverview } from '../../pages/OverviewPage/OverviewPage';
import { editSchedule } from '../../pages/ScheduleEditorPage/ScheduleEditorPage';
import { updateSettings } from '../../pages/SettingsPage/SettingsPage';
import { makeTitleWithBlockName } from '../../utils/formatString';
import { findLockType } from '../../lockTypes';

export function toggleBlockFeature(settingName) {
  var $dialogBlockFeatureWarning = $("#dialog-settings-toggle-locked-block-warning");
  $dialogBlockFeatureWarning.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Are you sure?",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogBlockFeatureWarning.dialog("close");
      });
      $dialogBlockFeatureWarning.parent().focus();
    },
    close: function () {
      $dialogBlockFeatureWarning.dialog("destroy");
      $dialogBlockFeatureWarning.hide();
    },
    buttons: {
      "No, don't enable": {
        class: "btn-grey-dialog",
        text: "No, don't enable",
        click: function () {
          $dialogBlockFeatureWarning.dialog("close");
        }
      },
      "Yes, enable": {
        class: "btn-green-dialog",
        text: "Yes, enable",
        click: function () {
          $dialogBlockFeatureWarning.dialog("close");
          settings.settings[settingName] = "true";
          updateSettings(true);
          save();
        }
      }
    }
  }).show();
}

export function changeBlockMode(settingName, newValue, unusedParam) {
  var $dialogChangeBlockModeWarning = $("#dialog-settings-mode-locked-block-warning");
  $dialogChangeBlockModeWarning.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Are you sure?",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogChangeBlockModeWarning.dialog("close");
        updateSettings(true);
      });
      $dialogChangeBlockModeWarning.parent().focus();
    },
    close: function () {
      $dialogChangeBlockModeWarning.dialog("destroy");
      $dialogChangeBlockModeWarning.hide();
    },
    buttons: {
      "No, don't update": {
        class: "btn-grey-dialog",
        text: "No, don't update",
        click: function () {
          $dialogChangeBlockModeWarning.dialog("close");
          updateSettings(true);
        }
      },
      "Yes, update": {
        class: "btn-green-dialog",
        text: "Yes, update",
        click: function () {
          $dialogChangeBlockModeWarning.dialog("close");
          settings.settings[settingName] = newValue;
          updateSettings(true);
          save();
        }
      }
    }
  }).show();
}

export function changeBlockFeature(settingName, newValue, unusedParam2) {
  var $dialogChangeBlockFeatureWarning = $("#dialog-settings-change-locked-block-warning");
  $dialogChangeBlockFeatureWarning.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Are you sure?",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogChangeBlockFeatureWarning.dialog("close");
        updateSettings(true);
      });
      $dialogChangeBlockFeatureWarning.parent().focus();
    },
    close: function () {
      $dialogChangeBlockFeatureWarning.dialog("destroy");
      $dialogChangeBlockFeatureWarning.hide();
    },
    buttons: {
      "No, don't update": {
        class: "btn-grey-dialog",
        text: "No, don't update",
        click: function () {
          $dialogChangeBlockFeatureWarning.dialog("close");
          updateSettings(true);
        }
      },
      "Yes, update": {
        class: "btn-green-dialog",
        text: "Yes, update",
        click: function () {
          $dialogChangeBlockFeatureWarning.dialog("close");
          settings.settings[settingName] = newValue;
          updateSettings(true);
          save();
        }
      }
    }
  }).show();
}

export function showBlockLockedWarning(blockId, onYesCallback) {
  var matchedLockType = findLockType(blockId, settings.blocks[blockId]);
  var lockTypeWarning = matchedLockType ? matchedLockType.getLockedWarning(blockId, settings.blocks[blockId]) : null;
  var lockDurationText = lockTypeWarning != null ? lockTypeWarning : getLockDurationWarningText(settings.blocks[blockId].lock, settings.blocks[blockId].randomTextLength, settings.blocks[blockId].window);
  var $dialogBlockLockedWarning = $("#dialog-edit-block-starting-locked-warning");
  $dialogBlockLockedWarning.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "500px",
    draggable: false,
    title: "Lock " + lockDurationText + "?",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogBlockLockedWarning.dialog("close");
      });
      $dialogBlockLockedWarning.parent().focus();
    },
    close: function () {
      $dialogBlockLockedWarning.dialog("destroy");
      $dialogBlockLockedWarning.hide();
    },
    buttons: {
      "Wait, no!": {
        class: "btn-grey-dialog",
        text: "Wait, no!",
        click: function () {
          $dialogBlockLockedWarning.dialog("close");
        }
      },
      Yes: {
        class: "btn-green-dialog",
        text: "Lock " + lockDurationText.toLowerCase(),
        click: function () {
          $dialogBlockLockedWarning.dialog("close");
          onYesCallback();
        }
      }
    }
  }).show();
}

export function showListTooLargeError() {
  var $dialogBlockErrorTooLarge = $("#dialog-edit-block-error-too-large");
  $dialogBlockErrorTooLarge.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "File Is Too Big",
    open: function () {
      var maxZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ;
      }).off("click").on("click", function () {
        $dialogBlockErrorTooLarge.dialog("close");
      });
      $dialogBlockErrorTooLarge.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogBlockErrorTooLarge.dialog("destroy");
      $dialogBlockErrorTooLarge.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogBlockErrorTooLarge.dialog("close");
        }
      }
    }
  }).show();
}

export function resetPomodoro(blockName) {
  var displayBlockName = blockName;
  if (blockName.indexOf("Frozen Turkey,") == 0) {
    displayBlockName = blockName.replace("Frozen Turkey,", "");
  } else if (blockName.indexOf("Focused Turkey,") == 0) {
    displayBlockName = blockName.replace("Focused Turkey,", "");
  }
  var $dialogResetPomodoro = $("#dialog-reset-pomodoro");
  $dialogResetPomodoro.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "450px",
    draggable: false,
    title: makeTitleWithBlockName("Reset Pomodoro for '", displayBlockName, "'?", 450),
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogResetPomodoro.dialog("close");
      });
    },
    close: function () {
      $dialogResetPomodoro.hide();
      $dialogResetPomodoro.dialog("destroy");
    },
    buttons: {
      "No, don't reset": {
        class: "btn-grey-dialog",
        text: "No, don't reset",
        click: function () {
          $dialogResetPomodoro.dialog("close");
        }
      },
      Reset: {
        class: "btn-green-dialog",
        text: "Reset",
        click: function () {
          $dialogResetPomodoro.dialog("close");
          var currentDate = new Date();
          var resetTimeString = currentDate.getFullYear().toString() + "," + (currentDate.getMonth() + 1).toString() + "," + currentDate.getDate().toString() + "," + currentDate.getHours().toString() + "," + currentDate.getMinutes().toString();
          settings.blocks[blockName].pomodoroTime = resetTimeString;
          updateOverview();
          save();
        }
      }
    }
  }).show();
}

export function editBreakSchedule(blockIndex, scheduleId) {
  var $dialogScheduleWarning = $("#dialog-edit-block-scheduled-break-warning");
  $dialogScheduleWarning.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Editing Breaks of Scheduled Blocks",
    open: function () {
      var maxZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ;
      }).off("click").on("click", function () {
        $dialogScheduleWarning.dialog("close");
      });
      $dialogScheduleWarning.focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogScheduleWarning.hide();
      $dialogScheduleWarning.dialog("destroy");
    },
    buttons: {
      Cancel: {
        class: "btn-gray-dialog",
        text: "Cancel",
        click: function () {
          $dialogScheduleWarning.dialog("close");
        }
      },
      Continue: {
        class: "btn-green-dialog",
        text: "Continue",
        click: function () {
          if ($("#dialog-edit-block-scheduled-break-again").is(":checked")) {
            settings.settings.showEditBreakSchedule = "false";
            updateBlocks(false);
            updateSettings(true);
            save();
          }
          $dialogScheduleWarning.dialog("close");
          editSchedule(blockIndex, scheduleId);
        }
      }
    }
  }).show();
}
