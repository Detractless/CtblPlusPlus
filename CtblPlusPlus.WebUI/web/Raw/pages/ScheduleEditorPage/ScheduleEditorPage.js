
import { getMaxZ } from '../../components/Modal/Modal';
import { updateBlocks } from '../BlocksPage/BlocksPage';
import { AppState } from '../../store/AppState';
import { makeTitleWithBlockName } from '../../utils/formatString';

export function editSchedule(blockId, isLockedStr) {
  AppState.schedule = [];
  AppState.scheduleModalOpenedOnDay = new Date().getDay();
  var isFrozenTurkey = false;
  var blockName = blockId;
  if (blockId.indexOf("Frozen Turkey") == 0) {
    isFrozenTurkey = true;
    if (blockId.indexOf("Frozen Turkey,") == 0) {
      blockName = blockId.replace("Frozen Turkey,", "");
    }
  } else if (blockId.indexOf("Focused Turkey,") == 0) {
    blockName = blockId.replace("Focused Turkey,", "");
  }
  var scheduleLockMinutes = 0;
  var scheduleLockEnabled = false;
  if (settings.blocks[blockId].lock.indexOf("schedule,") == 0) {
    scheduleLockMinutes = parseInt(settings.blocks[blockId].lock.replace("schedule,", "").split(",")[0]);
    scheduleLockEnabled = settings.blocks[blockId].lock.replace("schedule,", "").split(",")[1] == "true";
  }
  settings.blocks[blockId].schedule.forEach(function (scheduleEntry) {
    var currentDate = new Date();
    var isWithinLockedPeriod = false;
    var baseDate;
    var startDay;
    var endDay;
    var startTimeParts = scheduleEntry.startTime.split(",");
    var endTimeParts = scheduleEntry.endTime.split(",");
    var isNextWeek = false;
    var startOfWeekDate = new Date();
    startOfWeekDate.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeekDate.setHours(0, 0, 0, 0);
    var startDayIndex = parseInt(startTimeParts[0], 10);
    var entryStartDate = new Date();
    entryStartDate.setDate(currentDate.getDate() - currentDate.getDay() + startDayIndex);
    entryStartDate.setHours(startTimeParts[1]);
    entryStartDate.setMinutes(startTimeParts[2]);
    entryStartDate.setSeconds(0);
    entryStartDate.setMilliseconds(0);
    var lockedStartDate = moment(entryStartDate).subtract(scheduleLockMinutes, "minutes").toDate();
    if (lockedStartDate < startOfWeekDate && new Date().getDay() != 0) {
      lockedStartDate = moment(lockedStartDate).add(7, "days").toDate();
      isNextWeek = true;
    }
    var endDayIndex = parseInt(endTimeParts[0], 10);
    var entryEndDate = new Date();
    entryEndDate.setDate(currentDate.getDate() - currentDate.getDay() + endDayIndex);
    entryEndDate.setHours(endTimeParts[1]);
    entryEndDate.setMinutes(endTimeParts[2]);
    entryEndDate.setSeconds(0);
    entryEndDate.setMilliseconds(0);
    if (isNextWeek) {
      entryEndDate = moment(entryEndDate).add(7, "days").toDate();
    }
    if (lockedStartDate <= currentDate && currentDate < entryEndDate) {
      isWithinLockedPeriod = true;
    }
    if (settings.settings.weekStart == "monday") {
      startDay = parseInt(startTimeParts[0]) == 0 ? 6 : parseInt(startTimeParts[0]) - 1;
      if (parseInt(endTimeParts[0]) == 1 && parseInt(endTimeParts[1]) == 0 && parseInt(endTimeParts[2]) == 0) {
        endDay = 7;
      } else {
        endDay = parseInt(endTimeParts[0]) == 0 ? 6 : parseInt(endTimeParts[0]) - 1;
      }
      baseDate = new Date(2020, 6, 13, currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds());
    } else if (settings.settings.weekStart == "saturday") {
      startDay = parseInt(startTimeParts[0]) == 6 ? 0 : parseInt(startTimeParts[0]) + 1;
      if (parseInt(endTimeParts[0]) == 6 && parseInt(endTimeParts[1]) == 0 && parseInt(endTimeParts[2]) == 0) {
        endDay = 7;
      } else {
        endDay = parseInt(endTimeParts[0]) == 6 ? 0 : parseInt(endTimeParts[0]) + 1;
        if (endDay == 8) {
          endDay = 1;
        }
      }
      baseDate = new Date(2020, 6, 11, currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds());
    } else {
      startDay = parseInt(startTimeParts[0]);
      if (parseInt(endTimeParts[0]) == 0 && parseInt(endTimeParts[1]) == 0 && parseInt(endTimeParts[2]) == 0) {
        endDay = 7;
      } else {
        endDay = parseInt(endTimeParts[0]);
      }
      baseDate = new Date(2020, 6, 12, currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds());
    }
    var mappedStartDate = new Date(baseDate.getTime());
    var mappedEndDate = new Date(baseDate.getTime());
    mappedStartDate = mappedStartDate.addDays(startDay);
    mappedStartDate.setHours(parseInt(startTimeParts[1]));
    mappedStartDate.setMinutes(parseInt(startTimeParts[2]));
    mappedStartDate.setSeconds(0);
    mappedStartDate.setMilliseconds(0);
    mappedEndDate = mappedEndDate.addDays(endDay);
    mappedEndDate.setHours(parseInt(endTimeParts[1]));
    mappedEndDate.setMinutes(parseInt(endTimeParts[2]));
    mappedEndDate.setSeconds(0);
    mappedEndDate.setMilliseconds(0);
    var entryLocked = false;
    if (isLockedStr != "false") {
      entryLocked = !isWithinLockedPeriod && scheduleLockEnabled ? false : true;
    }
    AppState.schedule.push({
      id: parseInt(scheduleEntry.id, 10),
      start: mappedStartDate,
      end: mappedEndDate,
      blockId: blockId,
      break: scheduleEntry.break,
      locked: entryLocked,
      lockedStart: mappedStartDate,
      lockedEnd: mappedEndDate
    });
  });
  var $dialogEditSchedule = $("#dialog-edit-schedule");
  $dialogEditSchedule.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "90%",
    height: $(window).height(),
    draggable: false,
    title: makeTitleWithBlockName("When Is '", blockName, "' Blocked?", $(window).width() * 0.9),
    open: function () {
      var maxZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ;
      }).css({
        cursor: "default"
      });
      $dialogEditSchedule.focus().off("keydown").on("keydown", function (keydownEvent) {
        if (keydownEvent.which == 27) {
          return false;
        }
      });
      $("#calendarContainer").empty();
      $("#calendarContainer").append("<div id=\"calendar\"></div>");
      drawSchedule(blockId, isLockedStr);
      if (settings.blocks[blockId].type == "continuous") {
        $("#edit-schedule-continuous").prop("checked", true);
        $("#calendar").addClass("schedule-disable");
      } else {
        $("#edit-schedule-scheduled").prop("checked", true);
        $("#calendar").removeClass("schedule-disable");
      }
      if (isLockedStr != "false") {
        $("input[type=radio][name=type]").prop("disabled", true);
      } else {
        $("input[type=radio][name=type]").prop("disabled", false);
      }
      $("input[type=radio][name=type]").change(function () {
        if ($(this).hasClass("pro-cursor")) {
          $("#edit-schedule-continuous").prop("checked", true);
          return false;
        }
        if (this.value == "continuous") {
          $("#calendar").addClass("schedule-disable");
        } else {
          $("#calendar").removeClass("schedule-disable");
        }
      });
      if (typeof settings.additional.scheduleShowAll != "undefined" && settings.additional.scheduleShowAll == "true") {
        $("#edit-schedule-show-all").text("Hide other enabled scheduled blocks");
        showOthersOnSchedule(blockId);
      } else {
        $("#edit-schedule-show-all").text("Show other enabled scheduled blocks");
      }
      $("#edit-schedule-show-all").on("click", function () {
        if (typeof settings.additional.scheduleShowAll != "undefined" && settings.additional.scheduleShowAll == "true") {
          hideOthersOnSchedule(blockId);
          settings.additional.scheduleShowAll = "false";
          $("#edit-schedule-show-all").text("Show other enabled scheduled blocks");
        } else {
          showOthersOnSchedule(blockId);
          settings.additional.scheduleShowAll = "true";
          $("#edit-schedule-show-all").text("Hide other enabled scheduled blocks");
        }
        save();
      });
      $("#edit-schedule-remove-all").on("click", function () {
        deleteAllEvents(blockId);
      });
      $(".wc-scrollable-grid").scrollEnd(function () {
        $(".wc-cal-event").redraw();
      }, 300);
    },
    close: function () {
      $("#edit-schedule-show-all").off("click");
      $("#edit-schedule-remove-all").off("click");
      $("#calendar").remove();
      $dialogEditSchedule.hide();
      $dialogEditSchedule.dialog("destroy");
    },
    buttons: {
      "Close without saving": {
        class: "btn-grey-dialog",
        text: "Close without saving",
        click: function () {
          $dialogEditSchedule.dialog("close");
        }
      },
      Save: {
        class: "btn-green-dialog",
        text: "Save",
        click: function () {
          if ($(".schedule-overlapping-event").length > 0) {
            var $dialogScheduleOverlapError = $("#dialog-edit-schedule-error-overlap");
            $dialogScheduleOverlapError.dialog({
              modal: true,
              position: {
                my: "center",
                at: "center",
                of: $(".page-content-wrapper")
              },
              width: "400px",
              draggable: false,
              title: "Overlapping Blocks Detected",
              open: function () {
                var maxZOverlap = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == maxZOverlap;
                }).off("click").on("click", function () {
                  $dialogScheduleOverlapError.dialog("close");
                });
                $dialogScheduleOverlapError.focus().off("keypress").on("keypress", function (keypressEvent) {
                  if (keypressEvent.which == 13) {
                    $(this).find(".btn-green-dialog").click();
                  }
                });
              },
              close: function () {
                $dialogScheduleOverlapError.hide();
                $dialogScheduleOverlapError.dialog("destroy");
              },
              buttons: {
                Close: {
                  class: "btn-green-dialog",
                  text: "Close",
                  click: function () {
                    $dialogScheduleOverlapError.dialog("close");
                  }
                }
              }
            }).show();
            return;
          }
          if (AppState.scheduleModalOpenedOnDay != new Date().getDay() && AppState.scheduleModalOpenedOnDay == 6) {
            var $dialogScheduleNewWeekError = $("#dialog-edit-schedule-error-new-week");
            $dialogScheduleNewWeekError.dialog({
              modal: true,
              position: {
                my: "center",
                at: "center",
                of: $(".page-content-wrapper")
              },
              width: "400px",
              draggable: false,
              title: "Scheduling Error Detected",
              open: function () {
                var maxZNewWeek = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == maxZNewWeek;
                }).off("click").on("click", function () {
                  $dialogScheduleNewWeekError.dialog("close");
                });
                $dialogScheduleNewWeekError.focus().off("keypress").on("keypress", function (keypressEventNewWeek) {
                  if (keypressEventNewWeek.which == 13) {
                    $(this).find(".btn-green-dialog").click();
                  }
                });
              },
              close: function () {
                $dialogScheduleNewWeekError.hide();
                $dialogScheduleNewWeekError.dialog("destroy");
              },
              buttons: {
                Close: {
                  class: "btn-green-dialog",
                  text: "Close",
                  click: function () {
                    $dialogScheduleNewWeekError.dialog("close");
                  }
                }
              }
            }).show();
            return;
          }
          settings.blocks[blockId].type = $("#edit-schedule-continuous").is(":checked") ? "continuous" : "scheduled";
          settings.blocks[blockId].schedule = AppState.schedule.slice();
          if (isFrozenTurkey) {
            if (settings.blocks[blockId].type == "continuous") {
              var nowDate = new Date();
              var nowDateStr = nowDate.getFullYear().toString() + "," + (nowDate.getMonth() + 1).toString() + "," + nowDate.getDate().toString() + "," + nowDate.getHours().toString() + "," + nowDate.getMinutes().toString();
              settings.blocks[blockId].startTime = nowDateStr;
              settings.blocks[blockId].enabled = "false";
            }
          }
          if (settings.blocks[blockId].type == "scheduled") {
            settings.blocks[blockId].break = "none";
          } else {
            if (typeof settings.blocks[blockId].autostart == "string" && settings.blocks[blockId].autostart == "schedule") {
              settings.blocks[blockId].autostart = "none";
            }
            if (settings.blocks[blockId].lock.indexOf("schedule") == 0) {
              settings.blocks[blockId].lock = settings.settings.password != "" && AppState.passwordStrict.indexOf("lock") >= 0 ? "spassword" : "none";
            }
          }
          $dialogEditSchedule.dialog("close");
          updateBlocks(false);
          save();
        }
      }
    }
  }).show();
}

