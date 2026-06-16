
import { getMaxZ } from '../Modal/Modal';
import { ensureStatsEnabled } from '../StatsEnabler/StatsEnabler';
import { updateBlocks, blockTabClick } from '../../pages/BlocksPage/BlocksPage';
import { AppState } from '../../store/AppState';
import { makeTitleWithBlockName } from '../../utils/formatString';

export function editAutostart(blockName, isLocked) {
  var currentAutostart = settings.blocks[blockName].autostart;
  var autostartType = "none";
  var isDateChanged = false;
  var displayBlockName = blockName;
  if (blockName.indexOf("Frozen Turkey,") == 0) {
    displayBlockName = blockName.replace("Frozen Turkey,", "");
  } else if (blockName.indexOf("Focused Turkey,") == 0) {
    displayBlockName = blockName.replace("Focused Turkey,", "");
  }
  var $dialogAutostartContent = $("#dialog-edit-autostart");
  $dialogAutostartContent.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "590px",
    draggable: false,
    title: makeTitleWithBlockName("Choose When '", displayBlockName, "' Autostarts", 590),
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogAutostartContent.dialog("close");
      });
      if (currentAutostart == undefined) {
        autostartType = "none";
      } else {
        autostartType = currentAutostart.split(",")[0];
      }
      $("#autostart-" + autostartType).trigger("click");
      var datetimeFormat;
      var timeFormat;
      if (settings.settings.show24hour === "true") {
        datetimeFormat = "HH:mm, D MMM YYYY";
        timeFormat = "HH:mm";
      } else {
        datetimeFormat = "h:mm a, D MMM YYYY";
        timeFormat = "h:mm a";
      }
      if (settings.settings.weekStart == "monday") {
        $(".saturday-first").hide();
        $(".sunday-first").hide();
        $(".monday-first").show();
      } else if (settings.settings.weekStart == "saturday") {
        $(".sunday-first").hide();
        $(".monday-first").hide();
        $(".saturday-first").show();
      } else {
        $(".monday-first").hide();
        $(".saturday-first").hide();
        $(".sunday-first").show();
      }
      if (settings.blocks[blockName].type == "continuous") {
        $("#autostart-schedule").hide();
      } else {
        $("#autostart-schedule").show();
      }
      var minDate = new Date();
      minDate.setSeconds(0, 0);
      var startDate = new Date();
      var maxDate = new Date(2037, 11, 31, 23, 59);
      var isTimerLocked = false;
      var windowTime = new Date();
      windowTime.setHours(9, 0, 0, 0);
      var windowDays = "0123456";
      if (currentAutostart == undefined) {} else if (currentAutostart.indexOf("time") == 0) {
        var timeParts = currentAutostart.replace("time,", "").split(",");
        startDate = new Date(timeParts[0], timeParts[1] - 1, timeParts[2], timeParts[3], timeParts[4], 0, 0);
        isTimerLocked = timeParts[5] == "true";
      } else if (currentAutostart.indexOf("window") == 0) {
        var windowParts = currentAutostart.replace("window,", "").split(",");
        var windowHours = parseInt(windowParts[0]);
        var windowMinutes = parseInt(windowParts[1]);
        windowTime.setHours(windowHours, windowMinutes, 0, 0);
        windowDays = windowParts[2];
      }
      $("#edit-autostart-for").val("custom");
      $("#edit-autostart-for").on("change", function (event) {
        if (this.value != "custom") {
          var addMinutes = parseInt(this.value, 10);
          isDateChanged = true;
          $("#edit-autostart-timer-datetime").data("DateTimePicker").date(moment(new Date()).add(addMinutes, "m").toDate());
        }
      });
      $("#edit-autostart-timer-datetime").datetimepicker({
        sideBySide: true,
        keepOpen: true,
        date: startDate > minDate ? startDate : minDate,
        minDate: minDate,
        maxDate: maxDate,
        format: datetimeFormat,
        widgetPositioning: {
          horizontal: "auto",
          vertical: "bottom"
        }
      }).on("dp.change", function (event) {
        if (isDateChanged) {
          isDateChanged = false;
        } else {
          $("#edit-autostart-for").val("custom");
        }
      });
      $("#edit-autostart-timer-lock").prop("checked", isTimerLocked);
      $("#edit-autostart-window-time").datetimepicker({
        keepOpen: true,
        date: moment(windowTime),
        format: timeFormat,
        widgetPositioning: {
          horizontal: "auto",
          vertical: "bottom"
        }
      });
      $(".edit-autostart-window-checkbox input").prop("checked", false);
      $.each(windowDays.split(""), function (dayIndex, dayVal) {
        var weekStartPrefix = "0";
        if (settings.settings.weekStart == "monday") {
          weekStartPrefix = "1";
        } else if (settings.settings.weekStart == "saturday") {
          weekStartPrefix = "6";
        }
        $("#autostart-" + weekStartPrefix + "-day-" + dayVal).prop("checked", true);
      });
      if (isLocked != "false") {
        $("#dialog-edit-autostart .nav-tabs a").on("click", blockTabClick).addClass("not-allowed-tab");
        $("#dialog-edit-autostart .nav-tabs li").addClass("not-allowed-tab-li");
        $("#autostart-" + autostartType).removeClass("not-allowed-tab");
        $("#autostart-" + autostartType).parent().removeClass("not-allowed-tab-li");
        $("#edit-autostart-timer-datetime").data("DateTimePicker").maxDate(startDate);
        $("#edit-autostart-for").prop("disabled", true);
        if ($("#edit-autostart-timer-lock").is(":checked")) {
          $("#edit-autostart-timer-lock").prop("disabled", true);
        }
        $("#edit-autostart-window-time").data("DateTimePicker").disable();
        $(".edit-autostart-window-checkbox input:checked").prop("disabled", true);
      } else {
        $("#dialog-edit-autostart .nav-tabs a").off("click", blockTabClick).removeClass("not-allowed-tab");
        $("#dialog-edit-autostart .nav-tabs li").removeClass("not-allowed-tab-li");
        $("#edit-autostart-for").prop("disabled", false);
        $("#edit-autostart-timer-lock").prop("disabled", false);
        $("#edit-autostart-window-time").data("DateTimePicker").enable();
        $(".edit-autostart-window-checkbox input").prop("disabled", false);
      }
    },
    close: function () {
      $("#dialog-edit-autostart .nav-tabs a").off("click", blockTabClick);
      $("#edit-autostart-timer-datetime").off("dp.change");
      $("#edit-autostart-timer-datetime").data("DateTimePicker").destroy();
      $("#edit-autostart-window-time").data("DateTimePicker").destroy();
      $("#edit-autostart-for").off("change");
      $dialogAutostartContent.hide();
      $dialogAutostartContent.dialog("destroy");
    },
    buttons: {
      "Close without saving": {
        class: "btn-grey-dialog",
        text: "Close without saving",
        click: function () {
          $dialogAutostartContent.dialog("close");
        }
      },
      Save: {
        id: "dialog-edit-lock-save",
        class: "btn-green-dialog",
        text: "Save",
        click: function () {
          var activeTab = $("#dialog-edit-autostart .nav-tabs li.active")[0].children[0].id.split("-")[1];
          var willLock = false;
          var newAutostart = settings.blocks[blockName].autostart;
          var incompatibleReason = 0;
          var saveTimerDate = null;
          switch (activeTab) {
            case "none":
              newAutostart = "none";
              break;
            case "time":
              var nowDate = new Date();
              var nowPlusOneMin = new Date(nowDate.getTime() + 60000);
              willLock = $("#edit-autostart-timer-lock").is(":checked");
              if ($("#edit-autostart-timer-datetime").data("DateTimePicker").date() != null) {
                saveTimerDate = $("#edit-autostart-timer-datetime").data("DateTimePicker").date().toDate();
                saveTimerDate.setSeconds(0, 0);
              }
              if (saveTimerDate == null || nowPlusOneMin >= saveTimerDate) {
                var $dialogAutostartTimerInvalid = $("#dialog-edit-autostart-timer-error-invalid");
                $dialogAutostartTimerInvalid.dialog({
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
                    var timerInvalidMaxZ = getMaxZ($(".ui-widget-overlay"));
                    $(".ui-widget-overlay").filter(function () {
                      return $(this).css("z-index") == timerInvalidMaxZ;
                    }).off("click").on("click", function () {
                      $dialogAutostartTimerInvalid.dialog("close");
                    });
                    $dialogAutostartTimerInvalid.parent().focus().off("keypress").on("keypress", function (keypressEvent) {
                      if (keypressEvent.which == 13) {
                        $(this).find(".btn-green-dialog").click();
                      }
                    });
                  },
                  close: function () {
                    $dialogAutostartTimerInvalid.hide();
                    $dialogAutostartTimerInvalid.dialog("destroy");
                  },
                  buttons: {
                    Close: {
                      class: "btn-green-dialog",
                      text: "Close",
                      click: function () {
                        $dialogAutostartTimerInvalid.dialog("close");
                      }
                    }
                  }
                }).show();
                return;
              }
              if (willLock) {
                if (settings.blocks[blockName].lock == "none") {
                  incompatibleReason = 1;
                } else if (settings.blocks[blockName].lock.indexOf("window") == 0) {
                  incompatibleReason = 1;
                } else if (settings.blocks[blockName].lock.indexOf("randomText") == 0 && settings.blocks[blockName].enabled == "true") {
                  incompatibleReason = 1;
                } else if (settings.blocks[blockName].lock.indexOf("delay") == 0 && settings.blocks[blockName].enabled == "true") {
                  incompatibleReason = 1;
                } else if (settings.blocks[blockName].lock.indexOf("schedule") == 0) {
                  incompatibleReason = 1;
                } else if (settings.blocks[blockName].lock.indexOf("restart") == 0) {
                  incompatibleReason = 1;
                } else if (settings.blocks[blockName].lock.indexOf("password") == 0 && settings.blocks[blockName].enabled == "true") {
                  incompatibleReason = 1;
                } else if (!isNaN(settings.blocks[blockName].lock.split(",")[0])) {
                  var lockDateParts = settings.blocks[blockName].lock.split(",");
                  var lockExpiryDate = new Date(lockDateParts[0], lockDateParts[1] - 1, lockDateParts[2], lockDateParts[3], lockDateParts[4], 0, 0);
                  if (nowDate >= lockExpiryDate) {
                    incompatibleReason = 1;
                  } else if (lockExpiryDate <= saveTimerDate) {
                    incompatibleReason = 1;
                  }
                }
              }
              newAutostart = "time," + saveTimerDate.getFullYear().toString() + "," + (saveTimerDate.getMonth() + 1).toString() + "," + saveTimerDate.getDate().toString() + "," + saveTimerDate.getHours().toString() + "," + saveTimerDate.getMinutes().toString() + "," + willLock.toString();
              break;
            case "window":
              var windowSaveDate = $("#edit-autostart-window-time").data("DateTimePicker").date().toDate();
              var windowSaveDays = "";
              $(".edit-autostart-window-checkbox input:checked").each(function () {
                windowSaveDays = windowSaveDays + this.id.slice(-1);
              });
              if (windowSaveDays.length == 0) {
                var $dialogAutostartDayInvalid = $("#dialog-edit-autostart-window-invalid");
                $dialogAutostartDayInvalid.dialog({
                  modal: true,
                  position: {
                    my: "center",
                    at: "center",
                    of: $(".page-content-wrapper")
                  },
                  width: "300px",
                  draggable: false,
                  title: "Invalid Time of Day",
                  open: function () {
                    var dayInvalidMaxZ = getMaxZ($(".ui-widget-overlay"));
                    $(".ui-widget-overlay").filter(function () {
                      return $(this).css("z-index") == dayInvalidMaxZ;
                    }).off("click").on("click", function () {
                      $dialogAutostartDayInvalid.dialog("close");
                    });
                    $dialogAutostartDayInvalid.parent().focus().off("keypress").on("keypress", function (keypressEvent) {
                      if (keypressEvent.which == 13) {
                        $(this).find(".btn-green-dialog").click();
                      }
                    });
                  },
                  close: function () {
                    $dialogAutostartDayInvalid.hide();
                    $dialogAutostartDayInvalid.dialog("destroy");
                  },
                  buttons: {
                    Close: {
                      class: "btn-green-dialog",
                      text: "Close",
                      click: function () {
                        $dialogAutostartDayInvalid.dialog("close");
                      }
                    }
                  }
                }).show();
                return;
              }
              newAutostart = "window," + windowSaveDate.getHours().toString() + "," + windowSaveDate.getMinutes().toString() + "," + windowSaveDays;
              break;
            case "login":
              if (settings.blocks[blockName].lock == "restart") {
                incompatibleReason = 2;
              }
              newAutostart = "login";
              break;
            case "schedule":
              newAutostart = "schedule";
              break;
            default:
              newAutostart = "none";
              break;
          }
          if (incompatibleReason > 0) {
            var $dialogAutostartLockInvalid = $("#dialog-edit-autostart-lock-error-invalid");
            $dialogAutostartLockInvalid.dialog({
              modal: true,
              position: {
                my: "center",
                at: "center",
                of: $(".page-content-wrapper")
              },
              width: "400px",
              draggable: false,
              title: "Incompatible Locks",
              create: function () {
                $(".invalid-autostart-reasons").hide();
                if (incompatibleReason == 1) {
                  $(".invalid-autostart-reasons.lock").show();
                } else if (incompatibleReason == 2) {
                  $(".invalid-autostart-reasons.login").show();
                }
              },
              open: function () {
                var lockInvalidMaxZ = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == lockInvalidMaxZ;
                }).off("click").on("click", function () {
                  $dialogAutostartLockInvalid.dialog("close");
                });
                $dialogAutostartLockInvalid.parent().focus().off("keypress").on("keypress", function (keypressEvent) {
                  if (keypressEvent.which == 13) {
                    $(this).find(".btn-green-dialog").click();
                  }
                });
              },
              close: function () {
                $dialogAutostartLockInvalid.hide();
                $dialogAutostartLockInvalid.dialog("destroy");
              },
              buttons: {
                Close: {
                  class: "btn-green-dialog",
                  text: "Close",
                  click: function () {
                    $dialogAutostartLockInvalid.dialog("close");
                  }
                }
              }
            }).show();
            return;
          }
          var startingLocked = settings.blocks[blockName].lock != "none" && newAutostart != "none";
          if (saveTimerDate == null) {
            saveTimerDate = new Date();
          }
          if (startingLocked && !isNaN(settings.blocks[blockName].lock.split(",")[0])) {
            var lockDateParts = settings.blocks[blockName].lock.split(",");
            var lockExpiryDate = new Date(lockDateParts[0], lockDateParts[1] - 1, lockDateParts[2], lockDateParts[3], lockDateParts[4], 0, 0);
            if (saveTimerDate >= lockExpiryDate) {
              startingLocked = false;
            }
          }
          if (willLock || startingLocked) {
            ensureStatsEnabled(blockName, true, function () {
              var $dialogLockedAutostartWarning = $("#dialog-edit-autostart-starting-locked-warning");
              $dialogLockedAutostartWarning.dialog({
                modal: true,
                position: {
                  my: "center",
                  at: "center",
                  of: $(".page-content-wrapper")
                },
                width: "500px",
                draggable: false,
                title: willLock ? "Lock This Block?" : "Autostart This Locked Block?",
                create: function () {
                  $(".warning-autostart-lock").hide();
                  if (willLock) {
                    $(".warning-autostart-lock.now").show();
                  } else {
                    $(".warning-autostart-lock.future").show();
                  }
                },
                open: function () {
                  var warningMaxZ = getMaxZ($(".ui-widget-overlay"));
                  $(".ui-widget-overlay").filter(function () {
                    return $(this).css("z-index") == warningMaxZ;
                  }).off("click").on("click", function () {
                    $dialogLockedAutostartWarning.dialog("close");
                  });
                  $dialogLockedAutostartWarning.parent().focus();
                },
                close: function () {
                  $dialogLockedAutostartWarning.dialog("destroy");
                  $dialogLockedAutostartWarning.hide();
                },
                buttons: {
                  "Wait, no!": {
                    class: "btn-grey-dialog",
                    text: "Wait, no!",
                    click: function () {
                      $dialogLockedAutostartWarning.dialog("close");
                    }
                  },
                  Yes: {
                    class: "btn-green-dialog",
                    text: willLock ? "Lock this block" : "Autostart locked block",
                    click: function () {
                      $dialogLockedAutostartWarning.dialog("close");
                      $dialogAutostartContent.dialog("close");
                      settings.blocks[blockName].autostart = newAutostart;
                      if (settings.blocks[blockName].startTime == "" || settings.blocks[blockName].enabled == "false") {
                        var nowSaveLocked = new Date();
                        var nowStringLocked = nowSaveLocked.getFullYear().toString() + "," + (nowSaveLocked.getMonth() + 1).toString() + "," + nowSaveLocked.getDate().toString() + "," + nowSaveLocked.getHours().toString() + "," + nowSaveLocked.getMinutes().toString();
                        settings.blocks[blockName].startTime = nowStringLocked;
                      }
                      updateBlocks(false);
                      save();
                    }
                  }
                }
              }).show();
            });
          } else {
            $dialogAutostartContent.dialog("close");
            settings.blocks[blockName].autostart = newAutostart;
            if (settings.blocks[blockName].startTime == "" || settings.blocks[blockName].enabled == "false") {
              var nowSave = new Date();
              var nowString = nowSave.getFullYear().toString() + "," + (nowSave.getMonth() + 1).toString() + "," + nowSave.getDate().toString() + "," + nowSave.getHours().toString() + "," + nowSave.getMinutes().toString();
              settings.blocks[blockName].startTime = nowString;
            }
            updateBlocks(false);
            save();
          }
        }
      }
    }
  }).show();
}
