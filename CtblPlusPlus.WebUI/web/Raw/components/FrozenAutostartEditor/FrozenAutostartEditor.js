
import { getMaxZ } from '../Modal/Modal';
import { updateBlocks } from '../../pages/BlocksPage/BlocksPage';
import { makeTitleWithBlockName } from '../../utils/formatString';

export function editFrozenAutostartTimer(blockName, isLocked) {
  var isDropdownChange = false;
  var displayBlockName = blockName.replace("Frozen Turkey,", "");
  var hasExistingAutostart = false;
  var $dialogFrozenAutostartTimer = $("#dialog-frozen-autostart-timer");
  $dialogFrozenAutostartTimer.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "565px",
    draggable: false,
    title: makeTitleWithBlockName("When Does '", displayBlockName, "' Autostart and End?", 565),
    open: function () {
      var maxZIndexOverlay = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndexOverlay;
      }).off("click").on("click", function () {
        $dialogFrozenAutostartTimer.dialog("close");
      });
      $dialogFrozenAutostartTimer.parent().focus();
      var datetimeFormat;
      if (settings.settings.show24hour === "true") {
        datetimeFormat = "HH:mm, D MMM YYYY";
      } else {
        datetimeFormat = "h:mm a, D MMM YYYY";
      }
      var currentMinStart = new Date();
      currentMinStart.setSeconds(0, 0);
      var autostartStartDate = new Date();
      autostartStartDate.setSeconds(0, 0);
      var maxStartDate = new Date(2037, 11, 31, 23, 59);
      var currentMinEnd = new Date();
      currentMinEnd.setSeconds(0, 0);
      var autostartEndDate = new Date();
      var maxEndDate = new Date(2037, 11, 31, 23, 59);
      var isAutostartLocked = false;
      if (settings.blocks[blockName].autostart == undefined) {} else if (settings.blocks[blockName].autostart.indexOf("time") == 0) {
        var autostartParts = settings.blocks[blockName].autostart.replace("time,", "").split(",");
        autostartStartDate = new Date(autostartParts[0], autostartParts[1] - 1, autostartParts[2], autostartParts[3], autostartParts[4], 0, 0);
        isAutostartLocked = autostartParts[5] == "true";
        hasExistingAutostart = true;
      }
      if (settings.blocks[blockName].timer.indexOf(",") > 0) {
        var timerParts = settings.blocks[blockName].timer.split(",");
        autostartEndDate = new Date(timerParts[0], timerParts[1] - 1, timerParts[2], timerParts[3], timerParts[4], 0, 0);
      }
      $("#frozen-timer-autostart-for-start").val("custom");
      $("#frozen-timer-autostart-for-start").on("change", function (startChangeEvent) {
        var offsetMinutesStart = 0;
        if (this.value != "custom") {
          offsetMinutesStart = parseInt(this.value, 10);
          isDropdownChange = true;
          $("#frozen-timer-autostart-datetime-start").data("DateTimePicker").date(moment(new Date()).add(offsetMinutesStart, "m").toDate());
        }
      });
      $("#frozen-timer-autostart-for-end").val("custom");
      $("#frozen-timer-autostart-for-end").on("change", function (endChangeEvent) {
        var offsetMinutesEnd = 0;
        if (this.value != "custom") {
          offsetMinutesEnd = parseInt(this.value, 10);
          isDropdownChange = true;
          $("#frozen-timer-autostart-datetime-end").data("DateTimePicker").date(moment($("#frozen-timer-autostart-datetime-start").data("DateTimePicker").date()).add(offsetMinutesEnd, "m").toDate());
        }
      });
      $("#frozen-timer-autostart-datetime-start").datetimepicker({
        sideBySide: true,
        keepOpen: true,
        date: autostartStartDate > currentMinStart ? autostartStartDate : currentMinStart,
        minDate: currentMinStart,
        maxDate: maxStartDate,
        format: datetimeFormat,
        widgetPositioning: {
          horizontal: "auto",
          vertical: "bottom"
        }
      }).on("dp.change", function (dpChangeStartEvent) {
        if (isDropdownChange) {
          isDropdownChange = false;
        } else {
          $("#frozen-timer-autostart-for-start").val("custom");
        }
        if (isLocked == "false") {
          $("#frozen-timer-autostart-datetime-end").data("DateTimePicker").minDate(dpChangeStartEvent.date);
        }
      });
      $("#frozen-timer-autostart-datetime-end").datetimepicker({
        sideBySide: true,
        keepOpen: true,
        date: autostartEndDate > currentMinEnd ? autostartEndDate : currentMinEnd,
        minDate: currentMinEnd,
        maxDate: maxEndDate,
        format: datetimeFormat,
        widgetPositioning: {
          horizontal: "auto",
          vertical: "bottom"
        }
      }).on("dp.change", function (dpChangeEndEvent) {
        if (isDropdownChange) {
          isDropdownChange = false;
        } else {
          $("#frozen-timer-autostart-for-end").val("custom");
        }
      });
      $("#frozen-timer-autostart-timer-lock").prop("checked", isAutostartLocked);
      if (isLocked != "false") {
        $("#frozen-timer-autostart-datetime-start").data("DateTimePicker").maxDate(autostartStartDate);
        $("#frozen-timer-autostart-datetime-end").data("DateTimePicker").minDate(autostartEndDate);
        $("#frozen-timer-autostart-for-start").prop("disabled", true);
        $("#frozen-timer-autostart-for-end").prop("disabled", true);
        if ($("#frozen-timer-autostart-timer-lock").is(":checked")) {
          $("#frozen-timer-autostart-timer-lock").prop("disabled", true);
        }
        $("#frozen-timer-autostart-cancel").hide();
      } else {
        $("#frozen-timer-autostart-for-start").prop("disabled", false);
        $("#frozen-timer-autostart-for-end").prop("disabled", false);
        $("#frozen-timer-autostart-timer-lock").prop("disabled", false);
        if (hasExistingAutostart) {
          $("#frozen-timer-autostart-cancel").show();
        } else {
          $("#frozen-timer-autostart-cancel").hide();
        }
      }
    },
    close: function () {
      $("#frozen-timer-autostart-datetime-start").off("dp.change");
      $("#frozen-timer-autostart-datetime-start").data("DateTimePicker").destroy();
      $("#frozen-timer-autostart-for-end").off("change");
      $("#frozen-timer-autostart-datetime-end").off("dp.change");
      $("#frozen-timer-autostart-datetime-end").data("DateTimePicker").destroy();
      $("#frozen-timer-autostart-for-start").off("change");
      $dialogFrozenAutostartTimer.hide();
      $dialogFrozenAutostartTimer.dialog("destroy");
    },
    buttons: {
      "Cancel autostart": {
        html: "Cancel autostart",
        id: "frozen-timer-autostart-cancel",
        class: "btn-red-dialog btn-float-left-dialog",
        click: function () {
          $dialogFrozenAutostartTimer.dialog("close");
          settings.blocks[blockName].autostart = "none";
          settings.blocks[blockName].timer = "";
          updateBlocks(false);
          save();
        }
      },
      "Close without starting": {
        class: "btn-grey-dialog",
        text: hasExistingAutostart ? "Close without saving" : "Close without starting",
        click: function () {
          $dialogFrozenAutostartTimer.dialog("close");
        }
      },
      Start: {
        class: "btn-green-dialog",
        text: "Start",
        click: function () {
          var currentMinute = moment().startOf("minute").toDate();
          var minValidStartDate = new Date(currentMinute.getTime() + 60000);
          var selectedStartDate = $("#frozen-timer-autostart-datetime-start").data("DateTimePicker").date().startOf("minute").toDate();
          var selectedEndDate = $("#frozen-timer-autostart-datetime-end").data("DateTimePicker").date().startOf("minute").toDate();
          if (minValidStartDate >= selectedStartDate) {
            var $dialogFrozenAutostartTimerInvalid = $("#dialog-edit-autostart-timer-error-invalid");
            $dialogFrozenAutostartTimerInvalid.dialog({
              modal: true,
              position: {
                my: "center",
                at: "center",
                of: $(".page-content-wrapper")
              },
              width: "300px",
              draggable: false,
              title: "Invalid Date & Time",
              open: function () {
                var maxZIndexInvalidStart = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == maxZIndexInvalidStart;
                }).off("click").on("click", function () {
                  $dialogFrozenAutostartTimerInvalid.dialog("close");
                });
                $dialogFrozenAutostartTimerInvalid.parent().focus().off("keypress").on("keypress", function (keypressEvent) {
                  if (keypressEvent.which == 13) {
                    $(this).find(".btn-green-dialog").click();
                  }
                });
              },
              close: function () {
                $dialogFrozenAutostartTimerInvalid.hide();
                $dialogFrozenAutostartTimerInvalid.dialog("destroy");
              },
              buttons: {
                Close: {
                  class: "btn-green-dialog",
                  text: "Close",
                  click: function () {
                    $dialogFrozenAutostartTimerInvalid.dialog("close");
                  }
                }
              }
            }).show();
            return;
          }
          var minValidEndDate = new Date(selectedStartDate.getTime() + 60000);
          if (minValidEndDate >= selectedEndDate) {
            var $dialogFrozenAutostartTimerInvalid = $("#dialog-edit-autostart-timer-end-error-invalid");
            $dialogFrozenAutostartTimerInvalid.dialog({
              modal: true,
              position: {
                my: "center",
                at: "center",
                of: $(".page-content-wrapper")
              },
              width: "300px",
              draggable: false,
              title: "Invalid Date & Time",
              open: function () {
                var maxZIndexInvalidEnd = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == maxZIndexInvalidEnd;
                }).off("click").on("click", function () {
                  $dialogFrozenAutostartTimerInvalid.dialog("close");
                });
                $dialogFrozenAutostartTimerInvalid.parent().focus().off("keypress").on("keypress", function (keypressEventEnd) {
                  if (keypressEventEnd.which == 13) {
                    $(this).find(".btn-green-dialog").click();
                  }
                });
              },
              close: function () {
                $dialogFrozenAutostartTimerInvalid.hide();
                $dialogFrozenAutostartTimerInvalid.dialog("destroy");
              },
              buttons: {
                Close: {
                  class: "btn-green-dialog",
                  text: "Close",
                  click: function () {
                    $dialogFrozenAutostartTimerInvalid.dialog("close");
                  }
                }
              }
            }).show();
            return;
          }
          var timeUntilStartText = moment(selectedStartDate).from(currentMinute, true);
          var blockDurationText = moment(selectedEndDate).from(moment(selectedStartDate), true);
          var $dialogFrozenAutostartWarning = $("#dialog-edit-frozen-starting-blocked-warning");
          $dialogFrozenAutostartWarning.dialog({
            modal: true,
            position: {
              my: "center",
              at: "center",
              of: $(".page-content-wrapper")
            },
            width: "500px",
            draggable: false,
            title: "Block This Device for " + blockDurationText + " in " + timeUntilStartText + "?",
            create: function () {
              $(".dialog-edit-frozen-starting-blocked-warning-now").hide();
              $(".dialog-edit-frozen-starting-blocked-warning-future").show();
            },
            open: function () {
              var maxZIndexWarning = getMaxZ($(".ui-widget-overlay"));
              $(".ui-widget-overlay").filter(function () {
                return $(this).css("z-index") == maxZIndexWarning;
              }).off("click").on("click", function () {
                $dialogFrozenAutostartWarning.dialog("close");
              });
              $dialogFrozenAutostartWarning.parent().focus();
            },
            close: function () {
              $dialogFrozenAutostartWarning.dialog("destroy");
              $dialogFrozenAutostartWarning.hide();
            },
            buttons: {
              "Wait, no!": {
                class: "btn-grey-dialog",
                text: "Wait, no!",
                click: function () {
                  $dialogFrozenAutostartWarning.dialog("close");
                }
              },
              "Yes, start now": {
                class: "btn-green-dialog",
                text: "Yes, block for " + blockDurationText + " in " + timeUntilStartText,
                click: function () {
                  $dialogFrozenAutostartWarning.dialog("close");
                  $dialogFrozenAutostartTimer.dialog("close");
                  var isTimerLocked = $("#frozen-timer-autostart-timer-lock").is(":checked");
                  selectedStartDate.setSeconds(0, 0);
                  settings.blocks[blockName].autostart = "time," + selectedStartDate.getFullYear().toString() + "," + (selectedStartDate.getMonth() + 1).toString() + "," + selectedStartDate.getDate().toString() + "," + selectedStartDate.getHours().toString() + "," + selectedStartDate.getMinutes().toString() + "," + isTimerLocked.toString();
                  settings.blocks[blockName].timer = selectedEndDate.getFullYear().toString() + "," + (selectedEndDate.getMonth() + 1).toString() + "," + selectedEndDate.getDate().toString() + "," + selectedEndDate.getHours().toString() + "," + selectedEndDate.getMinutes().toString();
                  updateBlocks(false);
                  save();
                }
              }
            }
          }).show();
        }
      }
    }
  }).show();
}
