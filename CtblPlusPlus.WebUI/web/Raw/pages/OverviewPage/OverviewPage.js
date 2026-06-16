
import { updateReminders } from '../../components/Reminders/Reminders';
import { isTodayButAfterNow, isToday } from '../../services/breakManager';
import { toHtml, emojiToText, createTextTable } from '../../utils/formatString';
import { getBlockMetadata, getLockText, getContinuousBreakText, getScheduledBreakText, renderBlockRow } from './OverviewRenderers';
import { AllowanceService } from '../../services/allowanceService';
import { AppState } from '../../store/AppState';
import { sortByIndex } from '../../utils/calculateTime';
import { getBreakText } from '../../utils/formatData';
import { resetPomodoro } from '../../components/BlockModal/BlockModalDialogs';
import { requestBreakRandomText, cancelBreakRandomText } from '../../components/RandomTextBreakModal/RandomTextBreakModal';
import { startDelayBreak, cancelDelayBreak } from '../../components/UnlockDelayModal/UnlockDelayModal';
import { refreshAllowances } from '../../services/breakManager';

export function updateOverview() {
  var nowDate = new Date();
  var timelineEvents = [];
  var upcomingBlocksData = [];
  var upcomingBlocksTextData = [];
  var activeBlocksData = [];
  var activeBlocksTextData = [];
  AppState.specialSeconds = [];
  AppState.lastRefreshedMinute = moment().minutes();
  AppState.allowances = AllowanceService.getAllowances();

  $.each(settings.blocks, function (blockName, blockData) {
    var meta = getBlockMetadata(blockName, blockData);
    var breakText = "No breaks";
    var breakTextCopy = breakText;
    var lockResult = getLockText(blockData, blockName, AppState.unlockedBlocks, nowDate, AppState.specialSeconds, settings);
    var lockText = lockResult.lockText;
    var lockTextCopy = lockResult.lockTextCopy;

    var autostartVal = blockData.autostart;
    var targetStartDate = undefined;
    var isLockedAutostart = false;
    var loginAutostart = "";
    if (typeof autostartVal != "string" || autostartVal == "none") {} else if (autostartVal.indexOf("time") == 0) {
      var timeParts = autostartVal.replace("time,", "").split(",");
      targetStartDate = new Date(timeParts[0], timeParts[1] - 1, timeParts[2], timeParts[3], timeParts[4], 0, 0);
      isLockedAutostart = timeParts[5] == "true";
    } else if (autostartVal.indexOf("window") == 0) {
      var windowParts = autostartVal.replace("window,", "").split(",");
      var currentDayIndex = new Date().getDay();
      if (windowParts[2].indexOf(currentDayIndex) > -1) {
        targetStartDate = new Date();
        targetStartDate.setHours(parseInt(windowParts[0]));
        targetStartDate.setMinutes(parseInt(windowParts[1]));
        targetStartDate.setSeconds(0, 0);
      }
    } else if (autostartVal.indexOf("login") == 0) {
      loginAutostart = "login";
    } else if (autostartVal.indexOf("schedule") == 0) {
      $.each(blockData.schedule, function (scheduleIndex, scheduleItem) {
        if (parseInt(scheduleItem.startTime.split(",")[0]) == new Date().getDay()) {
          var possibleAutostartDate = new Date();
          possibleAutostartDate.setHours(parseInt(scheduleItem.startTime.split(",")[1]));
          possibleAutostartDate.setMinutes(parseInt(scheduleItem.startTime.split(",")[2]));
          possibleAutostartDate.setSeconds(0);
          possibleAutostartDate.setMilliseconds(0);
          if (targetStartDate == undefined || possibleAutostartDate < targetStartDate) {
            targetStartDate = possibleAutostartDate;
          }
        }
      });
    }

    if (blockData.enabled == "true" && blockData.type == "continuous") {
      var timelineStartHour = 0;
      var timelineEndHour = 24;
      var endTimeTarget;
      var blockEndText = "Blocked at all times";
      
      if (blockData.startTime && blockData.startTime.indexOf(",") > 0) {
        var startTimeMoment = moment(blockData.startTime, ["YYYY,M,D,H,m"]).toDate();
        if (isToday(startTimeMoment)) {
          timelineStartHour = startTimeMoment.getHours() + startTimeMoment.getMinutes() / 60;
        }
      }
      if (blockData.timer.indexOf(",") > 0) {
        endTimeTarget = moment(blockData.timer, ["YYYY,M,D,H,m"]).toDate();
        if (isToday(endTimeTarget)) {
          timelineEndHour = endTimeTarget.getHours() + endTimeTarget.getMinutes() / 60;
        }
      } else if (blockData.lock.indexOf("delay,") == 0) {
        var delayLockParts = blockData.lock.replace("delay,", "").split(",");
        var isDelayLock = delayLockParts[2] == "true";
        if (isDelayLock) {
          endTimeTarget = new Date(delayLockParts[4], delayLockParts[5] - 1, delayLockParts[6], delayLockParts[7], delayLockParts[8], delayLockParts[9], 0);
          if (isToday(endTimeTarget)) {
            timelineEndHour = endTimeTarget.getHours() + endTimeTarget.getMinutes() / 60;
          }
        }
      } else if (blockData.lock.indexOf(",") == 4) {
        if (blockData.lockUnblock == "true") {
          endTimeTarget = moment(blockData.lock, ["YYYY,M,D,H,m"]).toDate();
          if (isToday(endTimeTarget)) {
            timelineEndHour = endTimeTarget.getHours() + endTimeTarget.getMinutes() / 60;
          }
        }
      }
      
      timelineEvents.unshift({
        start: timelineStartHour,
        end: timelineEndHour,
        title: "<i class=\"fa fa-" + meta.iconClass + "\" title=\"" + toHtml(meta.blockDisplayName) + ": " + meta.blockTypeDesc + "\"></i>&nbsp;&nbsp;" + toHtml(meta.blockDisplayName),
        description: toHtml(meta.blockDisplayName) + ": " + meta.blockDetails
      });

      var breakResult = getContinuousBreakText(blockData, blockName, AppState.allowances, nowDate, AppState.specialSeconds, meta.breakIconClass, meta.iconClass);
      breakText = breakResult.breakText;
      breakTextCopy = breakResult.breakTextCopy;

      if (endTimeTarget != undefined) {
        if (endTimeTarget < nowDate) {
          blockEndText = "Blocked at all times";
        } else {
          blockEndText = "Ending in " + moment(endTimeTarget).toNow(true).toLowerCase().replace("an hour", "1 hour").replace("a minute", "1 minute").replace("a few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "");
        }
      }
      
      activeBlocksData.push([meta.blockDisplayName, renderBlockRow(meta.blockDisplayName, meta.blockDetails, meta.iconClass, meta.blockTypeDesc, blockEndText, breakText, lockText)]);
      activeBlocksTextData.push([meta.blockDisplayName, blockEndText, emojiToText(breakTextCopy), emojiToText(lockText)]);
      
    } else if (blockData.enabled == "true" && blockData.type == "scheduled") {
      $.each(settings.blocks[blockName].schedule, function (schedIndex, schedItem) {
        if (parseInt(schedItem.startTime.split(",")[0]) == new Date().getDay()) {
          var schedStartTarget2 = new Date();
          schedStartTarget2.setHours(parseInt(schedItem.startTime.split(",")[1]));
          schedStartTarget2.setMinutes(parseInt(schedItem.startTime.split(",")[2]));
          schedStartTarget2.setSeconds(0);
          schedStartTarget2.setMilliseconds(0);
          var schedEndTarget2 = new Date();
          var schedEndHour2 = parseInt(schedItem.endTime.split(",")[1]);
          var schedEndMin2 = parseInt(schedItem.endTime.split(",")[2]);
          if (schedEndHour2 == 0 && schedEndMin2 == 0) {
            schedEndTarget2 = moment(schedEndTarget2).add(1, "days").toDate();
          }
          schedEndTarget2.setHours(schedEndHour2);
          schedEndTarget2.setMinutes(schedEndMin2);
          schedEndTarget2.setSeconds(0);
          schedEndTarget2.setMilliseconds(0);
          var timelineEndHour2 = schedEndHour2 + schedEndMin2 / 60 - 0.00001;
          timelineEndHour2 = timelineEndHour2 < 0 ? 24 : timelineEndHour2;
          
          if (blockData.lock.indexOf("delay,") == 0) {
            var delayLockParts2 = blockData.lock.replace("delay,", "").split(",");
            var isDelayLock2 = delayLockParts2[2] == "true";
            if (isDelayLock2) {
              var delayLockTarget2 = new Date(delayLockParts2[4], delayLockParts2[5] - 1, delayLockParts2[6], delayLockParts2[7], delayLockParts2[8], delayLockParts2[9], 0);
              if (schedStartTarget2 < delayLockTarget2 && delayLockTarget2 < schedEndTarget2) {
                schedEndTarget2 = delayLockTarget2;
                timelineEndHour2 = delayLockTarget2.getHours() + delayLockTarget2.getMinutes() / 60 - 0.00001;
                timelineEndHour2 = timelineEndHour2 < 0 ? 24 : timelineEndHour2;
              } else if (isToday(delayLockTarget2) && delayLockTarget2 <= schedStartTarget2) {
                return true;
              }
            }
          } else if (blockData.lock.indexOf(",") == 4) {
            if (blockData.lockUnblock == "true") {
              var delayLockTarget2 = moment(blockData.lock, ["YYYY,M,D,H,m"]).toDate();
              if (schedStartTarget2 < delayLockTarget2 && delayLockTarget2 < schedEndTarget2) {
                schedEndTarget2 = delayLockTarget2;
                timelineEndHour2 = delayLockTarget2.getHours() + delayLockTarget2.getMinutes() / 60 - 0.00001;
                timelineEndHour2 = timelineEndHour2 < 0 ? 24 : timelineEndHour2;
              } else if (isToday(delayLockTarget2) && delayLockTarget2 <= schedStartTarget2) {
                return true;
              }
            }
          }
          
          timelineEvents.push({
            start: parseInt(schedItem.startTime.split(",")[1]) + parseInt(schedItem.startTime.split(",")[2]) / 60,
            end: timelineEndHour2,
            title: "<i class=\"fa fa-" + meta.iconClass + "\" title=\"" + toHtml(meta.blockDisplayName) + ": " + meta.blockTypeDesc + "\"></i>&nbsp;&nbsp;" + toHtml(meta.blockDisplayName),
            description: toHtml(meta.blockDisplayName) + ": " + meta.blockDetails
          });
          
          if (moment().isBefore(schedStartTarget2)) {
            var upcomingStartText = "Starting in " + moment(schedStartTarget2).toNow(true).toLowerCase().replace("an hour", "1 hour").replace("a minute", "1 minute").replace("a few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "");
            breakText = getBreakText(schedItem.break, blockName);
            upcomingBlocksData.push([schedStartTarget2, renderBlockRow(meta.blockDisplayName, meta.blockDetails, meta.iconClass, meta.blockTypeDesc, upcomingStartText, breakText, lockTextCopy)]);
            upcomingBlocksTextData.push([meta.blockDisplayName, upcomingStartText, emojiToText(breakText), emojiToText(lockTextCopy)]);
          } else if (moment().isSameOrAfter(schedStartTarget2) && moment().isBefore(schedEndTarget2)) {
            var breakResult = getScheduledBreakText(schedItem, blockData, blockName, AppState.allowances, schedStartTarget2, nowDate, AppState.specialSeconds, meta.breakIconClass, meta.iconClass);
            breakText = breakResult.breakText;
            breakTextCopy = breakResult.breakTextCopy;
            
            var activeEndText = "Ending in " + moment(schedEndTarget2).toNow(true).toLowerCase().replace("an hour", "1 hour").replace("a minute", "1 minute").replace("a few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "");
            activeBlocksData.push([meta.blockDisplayName, renderBlockRow(meta.blockDisplayName, meta.blockDetails, meta.iconClass, meta.blockTypeDesc, activeEndText, breakText, lockText)]);
            activeBlocksTextData.push([meta.blockDisplayName, activeEndText, emojiToText(breakTextCopy), emojiToText(lockText)]);
          }
        }
      });
    } else if (blockData.enabled == "false" && (isTodayButAfterNow(targetStartDate) || loginAutostart == "login")) {
      if (blockData.type == "scheduled") {
        if (targetStartDate != undefined) {
          breakText = "No block scheduled!";
          $.each(settings.blocks[blockName].schedule, function (schedIndex3, schedItem3) {
            if (parseInt(schedItem3.startTime.split(",")[0]) == new Date().getDay()) {
              var schedStartTarget3 = new Date();
              schedStartTarget3.setHours(parseInt(schedItem3.startTime.split(",")[1]));
              schedStartTarget3.setMinutes(parseInt(schedItem3.startTime.split(",")[2]));
              schedStartTarget3.setSeconds(0);
              schedStartTarget3.setMilliseconds(0);
              var schedEndTarget3 = new Date();
              var schedStartHour3 = parseInt(schedItem3.endTime.split(",")[1]);
              var schedStartMin3 = parseInt(schedItem3.endTime.split(",")[2]);
              if (schedStartHour3 == 0 && schedStartMin3 == 0) {
                schedEndTarget3 = moment(schedEndTarget3).add(1, "days").toDate();
              }
              schedEndTarget3.setHours(schedStartHour3);
              schedEndTarget3.setMinutes(schedStartMin3);
              schedEndTarget3.setSeconds(0);
              schedEndTarget3.setMilliseconds(0);
              if (moment(targetStartDate).isSameOrAfter(schedStartTarget3) && moment(targetStartDate).isBefore(schedEndTarget3)) {
                breakText = getBreakText(schedItem3.break, blockName);
                timelineEvents.push({
                  start: targetStartDate.getHours() + targetStartDate.getMinutes() / 60,
                  end: schedStartHour3 + schedStartMin3 / 60,
                  title: "<i class=\"fa fa-" + meta.iconClass + "\" title=\"" + toHtml(meta.blockDisplayName) + ": " + meta.blockTypeDesc + "\"></i>&nbsp;&nbsp;" + toHtml(meta.blockDisplayName),
                  description: toHtml(meta.blockDisplayName) + ": " + meta.blockDetails
                });
              } else if (moment(targetStartDate).isBefore(schedStartTarget3)) {
                timelineEvents.push({
                  start: parseInt(schedItem3.startTime.split(",")[1]) + parseInt(schedItem3.startTime.split(",")[2]) / 60,
                  end: schedStartHour3 + schedStartMin3 / 60,
                  title: "<i class=\"fa fa-" + meta.iconClass + "\" title=\"" + toHtml(meta.blockDisplayName) + ": " + meta.blockTypeDesc + "\"></i>&nbsp;&nbsp;" + toHtml(meta.blockDisplayName),
                  description: toHtml(meta.blockDisplayName) + ": " + meta.blockDetails
                });
              }
            }
          });
        } else if (loginAutostart == "login") {
          breakText = "Break as scheduled";
        }
      } else {
        breakText = getBreakText(blockData.break, blockName);
      }
      
      if (targetStartDate != undefined) {
        var lockIconHTML = isLockedAutostart ? " (<i class=\"fa fa-lock\"></i>)" : "";
        var autostartText = "Autostarting in " + moment(targetStartDate).toNow(true).toLowerCase().replace("an hour", "1 hour").replace("a minute", "1 minute").replace("a few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + lockIconHTML;
        upcomingBlocksData.push([targetStartDate, renderBlockRow(meta.blockDisplayName, meta.blockDetails, meta.iconClass, meta.blockTypeDesc, autostartText, breakText, lockTextCopy)]);
        upcomingBlocksTextData.push([meta.blockDisplayName, emojiToText(autostartText), emojiToText(breakText), emojiToText(lockTextCopy)]);
      } else if (loginAutostart == "login") {
        var autostartText = "Autostart next sign in";
        upcomingBlocksData.push([new Date(4000, 0, 1), renderBlockRow(meta.blockDisplayName, meta.blockDetails, meta.iconClass, meta.blockTypeDesc, autostartText, breakText, lockTextCopy)]);
        upcomingBlocksTextData.push([meta.blockDisplayName, autostartText, emojiToText(breakText), emojiToText(lockTextCopy)]);
      }
    }
  });

  if (settings.additional.paused != "false") {
    $("#overview-pause-text").text(moment(settings.additional.paused, ["YYYY,M,D,H,m,s"]).toNow(true) + " of your pause left!");
    $("#overview-pause").show();
  } else {
    $("#overview-pause-text").text("");
    $("#overview-pause").hide();
  }

  var activeBlocksHtml = "";
  $("#var-active-blocks").empty();
  if (activeBlocksData.length == 0) {
    activeBlocksHtml = "<div class=\"form-group table-row center\"><div class=\"col-sm-12 center\"><i class=\"fa fa-info-circle\"></i> No active blocks right now. <a class=\"list-link action-navigate-blocks\" title=\"Edit Blocks...\">Start a new block</a>.</div></div>";
  } else {
    activeBlocksData.sort(sortByIndex);
    $.each(activeBlocksData, function (activeBlockIndex, activeBlockItem) {
      activeBlocksHtml = activeBlocksHtml + activeBlockItem[1];
    });
  }
  $("#var-active-blocks").append(activeBlocksHtml);

  var upcomingBlocksHtml = "";
  $("#var-upcoming-blocks").empty();
  if (upcomingBlocksData.length == 0) {
    upcomingBlocksHtml = "<div class=\"form-group table-row center\"><div class=\"col-sm-12 center\"><i class=\"fa fa-info-circle\"></i> No upcoming blocks for today. <a class=\"list-link action-navigate-blocks\" title=\"Edit Blocks...\">Start a new block</a>.</div></div>";
  } else {
    upcomingBlocksData.sort(sortByIndex);
    $.each(upcomingBlocksData, function (upcomingBlockIndex, upcomingBlockItem) {
      upcomingBlocksHtml = upcomingBlocksHtml + upcomingBlockItem[1];
    });
  }
  $("#var-upcoming-blocks").append(upcomingBlocksHtml);

  $("#timeline").css({ "min-height": $("#timeline").height() });
  $("#timeline").empty();
  if (timelineEvents.length == 0) {
    $("#timeline").append("<form action=\"#\" class=\"form-horizontal\"><div class=\"form-body\"><div class=\"form-group table-row center\"><div class=\"col-sm-12 center\"><i class=\"fa fa-info-circle\"></i> No upcoming blocks for today. <a class=\"list-link action-navigate-blocks\" title=\"Edit Blocks...\">Start a new block</a>.</div></div></div></form>");
  } else {
    $("#timeline").timespace({
      use12HourTime: settings.settings.show24hour == "true" ? false : true,
      markerWidth: $("#timeline").width() / 24,
      markerIncrement: 1,
      navigateAmount: 0,
      data: { events: timelineEvents },
      controlText: { navLeft: "", navRight: "", drag: "", eventLeft: "", eventRight: "" }
    });
    $(".jqTimepsaceContainer .jqTimespaceLine").css("left", (moment().diff(moment().startOf("day"), "minutes") * $("#timeline").width() / 24 / 60).toString() + "px");
    $("#timeline").append("<div style=\"clear: both;\"></div>");
  }
  $("#timeline").css({ "min-height": "" });

  $(document).off("click", ".action-navigate-blocks").on("click", ".action-navigate-blocks", function(e) {
    e.preventDefault();
    $('#page-blocks').click();
  });

  $(document).off("click", ".action-refresh-allowances").on("click", ".action-refresh-allowances", function(e) { e.preventDefault(); refreshAllowances(); });
  $(document).off("click", ".action-cancel-break-random-text").on("click", ".action-cancel-break-random-text", function(e) { e.preventDefault(); cancelBreakRandomText($(this).attr("data-blockname"), $(this).attr("data-scheditemid")); });
  $(document).off("click", ".action-request-break-random-text").on("click", ".action-request-break-random-text", function(e) { e.preventDefault(); requestBreakRandomText($(this).attr("data-blockname"), $(this).attr("data-scheditemid")); });
  $(document).off("click", ".action-cancel-delay-break").on("click", ".action-cancel-delay-break", function(e) { e.preventDefault(); cancelDelayBreak($(this).attr("data-blockname"), $(this).attr("data-scheditemid")); });
  $(document).off("click", ".action-start-delay-break").on("click", ".action-start-delay-break", function(e) { e.preventDefault(); startDelayBreak($(this).attr("data-blockname"), $(this).attr("data-scheditemid")); });
  $(document).off("click", ".action-reset-pomodoro").on("click", ".action-reset-pomodoro", function(e) { e.preventDefault(); resetPomodoro($(this).attr("data-blockname")); });

  updateReminders();

  var trayText = "\n";
  if (settings.additional.paused != "false") {
    trayText += createTextTable("PAUSE FOR A CAUSE", [[moment(settings.additional.paused, ["YYYY,M,D,H,m,s"]).toNow(true) + " of your pause left!"]]) + "\n";
  }
  if (activeBlocksTextData.length == 0) {
    trayText += createTextTable("ACTIVE BLOCKS", [["No active blocks right now."]]) + "\n";
  } else {
    activeBlocksTextData.sort(sortByIndex);
    trayText += createTextTable("ACTIVE BLOCKS", activeBlocksTextData) + "\n";
  }
  if (upcomingBlocksTextData.length == 0) {
    trayText += createTextTable("UPCOMING BLOCKS", [["No upcoming blocks for today."]]);
  } else {
    upcomingBlocksTextData.sort(sortByIndex);
    trayText += createTextTable("UPCOMING BLOCKS", upcomingBlocksTextData);
  }
  AllowanceService.getTrayText(trayText);
}
