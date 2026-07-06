
import { getMaxZ } from '../Modal/Modal';
import { getLockDurationWarningText } from '../../utils/calculateTime';
import { disableDeviceBlock } from '../../services/blockManager';
import { updateBlocks, blockTabClick } from '../../pages/BlocksPage/BlocksPage';
import { AppState } from '../../store/AppState';
import { makeTitleWithBlockName } from '../../utils/formatString';
import { findLockType } from '../../lockTypes';
import { cancelQueuedDelay, cancelListAction, cancelBlockConfigChange, cancelScheduleChange } from '../../services/CtblApiClient';

var currentDeviceBlockName = null;

export function editFrozenList(blockName, disableTabs) {
  var isNewBlock = false;
  var cleanBlockName;
  var actionType;
  var dialogTitle;
  var saveButtonText;
  if (typeof blockName == "undefined") {
    isNewBlock = true;
    actionType = "lock";
    dialogTitle = "Choose a Device Block Action";
    saveButtonText = "Save As...";
  } else {
    cleanBlockName = blockName.replace("Frozen Turkey,", "");
    actionType = typeof settings.blocks[blockName].apps[0] == "string" && settings.blocks[blockName].apps[0].indexOf("frozen:") == 0 ? settings.blocks[blockName].apps[0].substring(settings.blocks[blockName].apps[0].indexOf(":") + 1) : "lock";
    dialogTitle = makeTitleWithBlockName("Choose a Device Block Action for '", cleanBlockName, "'", 500);
    saveButtonText = "Save";
  }
  var $dialogFrozenList = $("#dialog-edit-device-block");
  $dialogFrozenList.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "500px",
    draggable: false,
    title: dialogTitle,
    open: function () {
      var maxZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ;
      }).off("click").on("click", function () {
        $dialogFrozenList.dialog("close");
      });
      $dialogFrozenList.parent().focus();
      $("#deviceblock-" + actionType).trigger("click");
      if (disableTabs != undefined && disableTabs != "false") {
        $("#dialog-edit-device-block .nav-tabs a").on("click", blockTabClick).addClass("not-allowed-tab");
        $("#dialog-edit-device-block .nav-tabs li").addClass("not-allowed-tab-li");
        $("#deviceblock-" + actionType).off("click", blockTabClick).removeClass("not-allowed-tab");
        $("#deviceblock-" + actionType).parent().removeClass("not-allowed-tab-li");
      } else {
        $("#dialog-edit-device-block .nav-tabs a").off("click", blockTabClick).removeClass("not-allowed-tab");
        $("#dialog-edit-device-block .nav-tabs li").removeClass("not-allowed-tab-li");
      }
      currentDeviceBlockName = blockName;
      var isContinuous = !isNewBlock && settings.blocks[blockName].type === "continuous";
      var matchedLockType = isNewBlock || isContinuous ? null : findLockType(blockName, settings.blocks[blockName]);
      if (matchedLockType) {
        $("#device-queue-section").show();
        loadDeviceQueueEntries(matchedLockType, blockName);
      } else {
        $("#device-queue-section").hide();
      }
      $("#device-queue-header").off("click").on("click", function () {
        var $content = $("#device-queue-content");
        if ($content.is(":visible")) {
          $content.hide();
          $("#device-queue-arrow").html("&#9656;");
        } else {
          $content.show();
          $("#device-queue-arrow").html("&#9662;");
        }
      });
    },
    close: function () {
      $("#dialog-edit-device-block .nav-tabs a").off("click", blockTabClick);
      $("#device-queue-header").off("click");
      $("#device-queue-section").hide();
      $("#device-queue-content").hide();
      $("#device-queue-arrow").html("&#9656;");
      $("#device-queue-entries").empty();
      currentDeviceBlockName = null;
      $dialogFrozenList.hide();
      $dialogFrozenList.dialog("destroy");
    },
    buttons: {
      "Close without saving": {
        class: "btn-grey-dialog",
        text: "Close without saving",
        click: function () {
          $dialogFrozenList.dialog("close");
        }
      },
      Save: {
        class: "btn-green-dialog",
        text: saveButtonText,
        click: function () {
          if (isNewBlock) {
            var $dialogSaveDeviceBlockAs = $("#dialog-edit-block-name");
            $dialogSaveDeviceBlockAs.dialog({
              modal: true,
              position: {
                my: "center",
                at: "center",
                of: $(".page-content-wrapper")
              },
              width: "400px",
              draggable: false,
              title: "Save New Device Block As...",
              open: function () {
                var maxZSaveAs = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == maxZSaveAs;
                }).off("click").on("click", function () {
                  $dialogSaveDeviceBlockAs.dialog("close");
                });
                $("#dialog-edit-block-name-text").val("").on("keypress", function (event) {
                  if (event.which == 13) {
                    event.preventDefault();
                    $("#dialog-edit-block-name-save-button").click();
                  }
                });
                $("#dialog-edit-block-name-text").focus();
              },
              close: function () {
                $("#dialog-edit-block-name-text").off("keypress");
                $dialogSaveDeviceBlockAs.dialog("destroy");
                $dialogSaveDeviceBlockAs.hide();
              },
              buttons: {
                "Close without saving": {
                  class: "btn-grey-dialog",
                  text: "Close without saving",
                  click: function () {
                    $dialogSaveDeviceBlockAs.dialog("close");
                  }
                },
                Save: {
                  class: "btn-green-dialog",
                  id: "dialog-edit-block-name-save-button",
                  text: "Save",
                  click: function () {
                    var newBlockName = $("#dialog-edit-block-name-text").val().normalizeOnlyHiddenChars();
                    if (newBlockName == "" || newBlockName.indexOf("\\") >= 0) {
                      var $dialogNameInvalid = $("#dialog-edit-block-name-invalid");
                      $dialogNameInvalid.dialog({
                        modal: true,
                        position: {
                          my: "center",
                          at: "center",
                          of: $(".page-content-wrapper")
                        },
                        width: "350px",
                        draggable: false,
                        title: "Invalid Block Name",
                        open: function () {
                          var maxZInvalid = getMaxZ($(".ui-widget-overlay"));
                          $(".ui-widget-overlay").filter(function () {
                            return $(this).css("z-index") == maxZInvalid;
                          }).off("click").on("click", function () {
                            $dialogNameInvalid.dialog("close");
                          });
                          $dialogNameInvalid.parent().focus().off("keypress").on("keypress", function (event) {
                            if (event.which == 13) {
                              $(this).find(".btn-green-dialog").click();
                            }
                          });
                        },
                        close: function () {
                          $dialogNameInvalid.dialog("destroy");
                          $dialogNameInvalid.hide();
                        },
                        buttons: {
                          Close: {
                            class: "btn-green-dialog",
                            text: "Close",
                            click: function () {
                              $dialogNameInvalid.dialog("close");
                            }
                          }
                        }
                      }).show();
                    } else if (typeof settings.blocks["Frozen Turkey," + newBlockName] != "undefined" || typeof settings.blocks["Focused Turkey," + newBlockName] != "undefined" || typeof settings.blocks[newBlockName] != "undefined") {
                      var $dialogNameDuplicate = $("#dialog-edit-block-name-duplicate");
                      $dialogNameDuplicate.dialog({
                        modal: true,
                        position: {
                          my: "center",
                          at: "center",
                          of: $(".page-content-wrapper")
                        },
                        width: "350px",
                        draggable: false,
                        title: "Name Already in Use",
                        open: function () {
                          var maxZDuplicate = getMaxZ($(".ui-widget-overlay"));
                          $(".ui-widget-overlay").filter(function () {
                            return $(this).css("z-index") == maxZDuplicate;
                          }).off("click").on("click", function () {
                            $dialogNameDuplicate.dialog("close");
                          });
                          $dialogNameDuplicate.parent().focus().off("keypress").on("keypress", function (event) {
                            if (event.which == 13) {
                              $(this).find(".btn-green-dialog").click();
                            }
                          });
                        },
                        close: function () {
                          $dialogNameDuplicate.dialog("destroy");
                          $dialogNameDuplicate.hide();
                        },
                        buttons: {
                          Close: {
                            class: "btn-green-dialog",
                            text: "Close",
                            click: function () {
                              $dialogNameDuplicate.dialog("close");
                            }
                          }
                        }
                      }).show();
                    } else {
                      $dialogSaveDeviceBlockAs.dialog("close");
                      $dialogFrozenList.dialog("close");
                      var selectedActionType = $("#dialog-edit-device-block .nav-tabs li.active")[0].children[0].id.split("-")[1];
                      var newBlockSettings = {
                        enabled: "false",
                        autostart: "none",
                        type: "continuous",
                        startTime: "",
                        pomodoroTime: "",
                        timer: ""
                      };
                      newBlockSettings.lock = settings.settings.password != "" && AppState.passwordStrict.indexOf("lock") >= 0 ? "spassword" : "none";
                      newBlockSettings.lockUnblock = "true";
                      newBlockSettings.restartUnblock = "true";
                      newBlockSettings.break = "none";
                      newBlockSettings.password = "";
                      newBlockSettings.randomTextLength = "";
                      newBlockSettings.window = "";
                      newBlockSettings.users = "all";
                      newBlockSettings.web = [];
                      newBlockSettings.exceptions = [];
                      newBlockSettings.apps = ["frozen:" + selectedActionType];
                      newBlockSettings.schedule = [];
                      newBlockSettings.customUsers = [];
                      settings.blocks["Frozen Turkey," + newBlockName] = newBlockSettings;
                      updateBlocks(false);
                      save();
                    }
                  }
                }
              }
            }).show();
          } else {
            $dialogFrozenList.dialog("close");
            var selectedActionTypeEdit = $("#dialog-edit-device-block .nav-tabs li.active")[0].children[0].id.split("-")[1];
            settings.blocks[blockName].apps = ["frozen:" + selectedActionTypeEdit];
            updateBlocks(false);
            save();
          }
        }
      }
    }
  }).show();
}
function loadDeviceQueueEntries(lockType, blockName) {
  $("#device-queue-entries").html("<div style='padding: 10px; text-align: center; opacity: 0.7;'>Loading...</div>");
  lockType.getQueueListEntries(blockName).then(function (html) {
    $("#device-queue-entries").html(html);
    var count = $("#device-queue-entries div.custom-option").length;
    $("#device-queue-count").text(count);
    if (count > 0) {
      $("#device-queue-content").show();
      $("#device-queue-arrow").html("&#9662;");
    } else {
      $("#device-queue-content").hide();
      $("#device-queue-arrow").html("&#9656;");
    }
  });
}

function cancelSelectedDeviceQueue() {
  var blockName = currentDeviceBlockName;
  if (!blockName) return;
  var $selected = $("#device-queue-entries div.custom-option.selected");
  if ($selected.length === 0) return;
  var promises = [];
  $selected.each(function () {
    var entryType = $(this).attr("data-entry-type");
    if (entryType === "block-unlock") {
      promises.push(cancelQueuedDelay(blockName).then(function () {
        var idx = AppState.queuedDelays ? AppState.queuedDelays.indexOf(blockName) : -1;
        if (idx > -1) AppState.queuedDelays.splice(idx, 1);
      }));
    } else if (entryType === "list-action") {
      promises.push(cancelListAction($(this).attr("data-request-id")));
    } else if (entryType === "block-config") {
      promises.push(cancelBlockConfigChange(blockName));
    } else if (entryType === "schedule-change") {
      promises.push(cancelScheduleChange(blockName));
    }
  });
  $.when.apply($, promises).then(function () {
    var matchedLockType = findLockType(blockName, settings.blocks[blockName]);
    if (matchedLockType) {
      loadDeviceQueueEntries(matchedLockType, blockName);
    }
  });
}

window.cancelSelectedDeviceQueue = cancelSelectedDeviceQueue;

export function editFrozenTimer(blockName, disableEdit) {
  var isDropdownChange = false;
  var cleanBlockName = blockName.replace("Frozen Turkey,", "");
  var $dialogFrozenTimer = $("#dialog-frozen-timer");
  $dialogFrozenTimer.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "565px",
    draggable: false,
    title: makeTitleWithBlockName("When Does '", cleanBlockName, "' End?", 565),
    open: function () {
      var maxZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ;
      }).off("click").on("click", function () {
        $dialogFrozenTimer.dialog("close");
      });
      $dialogFrozenTimer.parent().focus();
      var dateFormat;
      if (settings.settings.show24hour === "true") {
        dateFormat = "HH:mm, D MMM YYYY";
      } else {
        dateFormat = "h:mm a, D MMM YYYY";
      }
      var currentDate = new Date();
      currentDate.setSeconds(0, 0);
      var minDate = new Date();
      minDate.setSeconds(0, 0);
      var maxDate = new Date(2037, 11, 31, 23, 59);
      if (settings.blocks[blockName].timer.indexOf(",") > 0) {
        var timerParts = settings.blocks[blockName].timer.split(",");
        minDate = new Date(timerParts[0], timerParts[1] - 1, timerParts[2], timerParts[3], timerParts[4], 0, 0);
      }
      $("#frozen-timer-for").val("custom");
      $("#frozen-timer-for").on("change", function (event) {
        var minutesToAdd = 0;
        if (this.value != "custom") {
          minutesToAdd = parseInt(this.value, 10);
          isDropdownChange = true;
          $("#frozen-timer-datetime").data("DateTimePicker").date(moment(new Date()).add(minutesToAdd, "m").toDate());
        }
      });
      $("#frozen-timer-datetime").datetimepicker({
        sideBySide: true,
        keepOpen: true,
        date: minDate > currentDate ? minDate : currentDate,
        minDate: currentDate,
        maxDate: maxDate,
        format: dateFormat,
        widgetPositioning: {
          horizontal: "auto",
          vertical: "bottom"
        }
      }).on("dp.change", function (event) {
        if (isDropdownChange) {
          isDropdownChange = false;
        } else {
          $("#frozen-timer-for").val("custom");
        }
      });
      if (disableEdit != "false") {
        $("#edit-frozen-disable-button").hide();
        $("#frozen-timer-for").prop("disabled", true);
        $("#frozen-timer-datetime").data("DateTimePicker").minDate(minDate);
      } else {
        if (settings.blocks[blockName].enabled == "true") {
          $("#edit-frozen-disable-button").show();
        } else {
          $("#edit-frozen-disable-button").hide();
        }
        $("#frozen-timer-for").prop("disabled", false);
      }
    },
    close: function () {
      $("#frozen-timer-datetime").off("dp.change");
      $("#frozen-timer-datetime").data("DateTimePicker").destroy();
      $("#frozen-timer-for").off("change");
      $dialogFrozenTimer.hide();
      $dialogFrozenTimer.dialog("destroy");
    },
    buttons: {
      "Disable block": {
        class: "btn-red-dialog",
        id: "edit-frozen-disable-button",
        text: "Disable block",
        click: function () {
          disableDeviceBlock(blockName);
        }
      },
      "Close without starting": {
        class: "btn-grey-dialog",
        text: "Close without starting",
        click: function () {
          $dialogFrozenTimer.dialog("close");
        }
      },
      Start: {
        class: "btn-green-dialog",
        text: "Start",
        click: function () {
          var now = new Date();
          var minValidDate = new Date(now.getTime() + 60000);
          var selectedDate = $("#frozen-timer-datetime").data("DateTimePicker").date().toDate();
          var durationWarningText = getLockDurationWarningText(selectedDate.getFullYear().toString() + "," + (selectedDate.getMonth() + 1).toString() + "," + selectedDate.getDate().toString() + "," + selectedDate.getHours().toString() + "," + selectedDate.getMinutes().toString(), null, null);
          if (minValidDate >= selectedDate) {
            var $dialogFrozenTimerInvalid = $("#dialog-edit-lock-timer-error-invalid");
            $dialogFrozenTimerInvalid.dialog({
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
                var maxZInvalid = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == maxZInvalid;
                }).off("click").on("click", function () {
                  $dialogFrozenTimerInvalid.dialog("close");
                });
                $dialogFrozenTimerInvalid.parent().focus().off("keypress").on("keypress", function (event) {
                  if (event.which == 13) {
                    $(this).find(".btn-green-dialog").click();
                  }
                });
              },
              close: function () {
                $dialogFrozenTimerInvalid.hide();
                $dialogFrozenTimerInvalid.dialog("destroy");
              },
              buttons: {
                Close: {
                  class: "btn-green-dialog",
                  text: "Close",
                  click: function () {
                    $dialogFrozenTimerInvalid.dialog("close");
                  }
                }
              }
            }).show();
            return;
          }
          var $dialogFrozenWarning = $("#dialog-edit-frozen-starting-blocked-warning");
          $dialogFrozenWarning.dialog({
            modal: true,
            position: {
              my: "center",
              at: "center",
              of: $(".page-content-wrapper")
            },
            width: "500px",
            draggable: false,
            title: "Block This Device " + durationWarningText + "?",
            create: function () {
              $(".dialog-edit-frozen-starting-blocked-warning-future").hide();
              $(".dialog-edit-frozen-starting-blocked-warning-now").show();
            },
            open: function () {
              var maxZWarning = getMaxZ($(".ui-widget-overlay"));
              $(".ui-widget-overlay").filter(function () {
                return $(this).css("z-index") == maxZWarning;
              }).off("click").on("click", function () {
                $dialogFrozenWarning.dialog("close");
              });
              $dialogFrozenWarning.parent().focus();
            },
            close: function () {
              $dialogFrozenWarning.dialog("destroy");
              $dialogFrozenWarning.hide();
            },
            buttons: {
              "Wait, no!": {
                class: "btn-grey-dialog",
                text: "Wait, no!",
                click: function () {
                  $dialogFrozenWarning.dialog("close");
                }
              },
              "Yes, start now": {
                class: "btn-green-dialog",
                text: "Yes, block " + durationWarningText.toLowerCase(),
                click: function () {
                  $dialogFrozenWarning.dialog("close");
                  $dialogFrozenTimer.dialog("close");
                  if (settings.blocks[blockName].startTime == "" || settings.blocks[blockName].enabled == "false") {
                    var startDate = new Date();
                    var startTimeString = startDate.getFullYear().toString() + "," + (startDate.getMonth() + 1).toString() + "," + startDate.getDate().toString() + "," + startDate.getHours().toString() + "," + startDate.getMinutes().toString();
                    settings.blocks[blockName].startTime = startTimeString;
                  }
                  settings.blocks[blockName].enabled = "true";
                  settings.blocks[blockName].timer = selectedDate.getFullYear().toString() + "," + (selectedDate.getMonth() + 1).toString() + "," + selectedDate.getDate().toString() + "," + selectedDate.getHours().toString() + "," + selectedDate.getMinutes().toString();
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
