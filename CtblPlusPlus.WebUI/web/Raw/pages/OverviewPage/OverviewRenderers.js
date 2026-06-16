
import { resetPomodoro } from '../../components/BlockModal/BlockModalDialogs';
import { requestBreakRandomText, cancelBreakRandomText } from '../../components/RandomTextBreakModal/RandomTextBreakModal';
import { toHtml, capitalizeFirstLetter } from '../../utils/formatString';
import { startDelayBreak, cancelDelayBreak } from '../../components/UnlockDelayModal/UnlockDelayModal';
import { refreshAllowances } from '../../services/breakManager';
import { AppState } from '../../store/AppState';
import { getClosestTimeRange, formatAMPM, format24 } from '../../utils/calculateTime';
import { getBreakText } from '../../utils/formatData';
import { findLockType } from '../../lockTypes';

export function getBlockMetadata(blockName, blockData) {
  var blockDisplayName = blockName;
  var iconClass;
  var breakIconClass;
  var blockTypeDesc;
  var blockDetails;

  if (blockName == "Frozen Turkey" || blockName.indexOf("Frozen Turkey,") == 0) {
    iconClass = "sign-out";
    breakIconClass = "sign-in";
    blockTypeDesc = "Device block";
    var appAction = typeof blockData.apps[0] == "string" && blockData.apps[0].indexOf("frozen:") == 0 ? blockData.apps[0].substring(blockData.apps[0].indexOf(":") + 1) : "lock";
    blockDetails = appAction == "shutdown" ? "This block will shut down this device" : appAction == "logoff" ? "This block will sign out affected users" : "This block will display the lock screen";
    if (blockName.indexOf("Frozen Turkey,") == 0) {
      blockDisplayName = blockName.replace("Frozen Turkey,", "");
    }
  } else if (blockName.indexOf("Focused Turkey,") == 0) {
    blockDisplayName = blockName.replace("Focused Turkey,", "");
  } else {
    iconClass = "shield";
    breakIconClass = "coffee";
    blockTypeDesc = "Website & app block";
    blockDetails = blockData.web.length.toString() + " websites, " + blockData.exceptions.length.toString() + " exceptions and " + blockData.apps.length.toString() + " apps.";
  }

  return {
    blockDisplayName: blockDisplayName,
    iconClass: iconClass,
    breakIconClass: breakIconClass,
    blockTypeDesc: blockTypeDesc,
    blockDetails: blockDetails
  };
}

export function getLockText(blockData, blockName, unlockedBlocks, nowDate, specialSeconds, settings) {
  var lockText = "Unlocked <i class=\"fa fa-unlock\"></i>";
  var lockTextCopy = lockText;
  var isUnlocked = AppState.unlockedBlocks.indexOf(blockName + "\\" + blockData.lock + "\\" + blockData.randomTextLength + "\\" + blockData.password) > -1;

  if (blockData.timer.indexOf(",") > 0) {
    var timerMoment = moment(blockData.timer, ["YYYY,M,D,H,m"]);
    if (moment().isBefore(timerMoment)) {
      lockText = capitalizeFirstLetter(timerMoment.toNow(true)).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " until <i class=\"fa fa-unlock\"></i>";
      lockTextCopy = lockText;
    }
  } else if (blockData.lock.indexOf("none") == 0) {
  } else if (blockData.lock.indexOf("randomText") == 0) {
    var lockIconHTML = isUnlocked ? " <i class=\"fa fa-unlock\"></i>" : " <i class=\"fa fa-lock\"></i>";
    if (blockData.randomTextLength.indexOf(",") > 0) {
      var randomTextParts = blockData.randomTextLength.split(",");
      var delayParts = randomTextParts.splice(0, 2);
      delayParts.push(randomTextParts.join(","));
      var randomLength = delayParts[0];
      var randomType = delayParts[1];
      if (randomType != "custom") {
        lockText = randomLength + " <i class=\"fa fa-random\"></i> chars" + lockIconHTML;
      } else {
        lockText = "Custom text" + lockIconHTML;
      }
    } else {
      lockText = blockData.randomTextLength + " <i class=\"fa fa-random\"></i> chars" + lockIconHTML;
    }
    lockTextCopy = lockText;
  } else if (blockData.lock.indexOf("delay") == 0) {
    var delayLockParts = blockData.lock.replace("delay,", "").split(",");
    var delayLockDuration = delayLockParts[0];
    var delayLockUnit = delayLockParts[1] == "h" ? " hr" : delayLockParts[1] == "m" ? " min" : " sec";
    var delayLockMode = delayLockParts[3];
    var delayLockTarget = new Date(delayLockParts[4], delayLockParts[5] - 1, delayLockParts[6], delayLockParts[7], delayLockParts[8], delayLockParts[9], 0);
    if (delayLockMode == "delay" && nowDate < delayLockTarget) {
      AppState.specialSeconds.push(delayLockTarget.getSeconds());
      moment.relativeTimeThreshold("s", 60);
      moment.relativeTimeThreshold("m", 420);
      moment.relativeTimeThreshold("h", 24);
      lockText = capitalizeFirstLetter(moment(delayLockTarget).toNow(true)).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " until <i class=\"fa fa-unlock\"></i>";
      moment.relativeTimeThreshold("s", 45);
      moment.relativeTimeThreshold("m", 45);
      moment.relativeTimeThreshold("h", 22);
    } else if (delayLockMode == "none") {
      lockText = delayLockDuration + delayLockUnit + " <i class=\"fa fa-hourglass-half\"></i> <i class=\"fa fa-lock\"></i>";
    }
    lockTextCopy = lockText;
  } else if (blockData.lock.indexOf("password") == 0) {
    var lockIconHTML = isUnlocked ? " <i class=\"fa fa-unlock\"></i>" : " <i class=\"fa fa-lock\"></i>";
    var matchedLockType = findLockType(blockName, blockData);
    var lockTypeText = matchedLockType ? matchedLockType.getLockText(blockName, blockData) : null;
    lockText = (lockTypeText != null ? lockTypeText : "Block password") + lockIconHTML;
    lockTextCopy = lockText;
  } else if (blockData.lock.indexOf("spassword") == 0) {
    var lockIconHTML = AppState.passwordChecked ? " <i class=\"fa fa-unlock\"></i>" : " <i class=\"fa fa-lock\"></i>";
    lockText = "Settings password" + lockIconHTML;
    lockTextCopy = lockText;
  } else if (blockData.lock.indexOf("schedule") == 0) {
    var scheduleLockDesc = "";
    var isInScheduleLock = false;
    var scheduleLockEnd;
    var scheduleLockDelay = 0;
    if (blockData.lock.indexOf(",") > 0) {
      scheduleLockDelay = parseInt(blockData.lock.replace("schedule,", "").split(",")[0]);
      if (scheduleLockDelay > 0) {
        scheduleLockDesc = " (-" + (scheduleLockDelay > 59 ? scheduleLockDelay / 60 + " hr" : scheduleLockDelay + " min") + ")";
      }
    }
    $.each(blockData.schedule, function (schedLockIndex, schedLockItem) {
      var schedStartTime = schedLockItem.startTime.split(",");
      var schedEndTime = schedLockItem.endTime.split(",");
      var schedIsOvernight = false;
      var startOfWeekDate = new Date();
      startOfWeekDate.setDate(nowDate.getDate() - nowDate.getDay());
      startOfWeekDate.setHours(0, 0, 0, 0);
      var schedStartDay = parseInt(schedStartTime[0], 10);
      var schedStartTarget = new Date();
      schedStartTarget.setDate(nowDate.getDate() - nowDate.getDay() + schedStartDay);
      schedStartTarget.setHours(schedStartTime[1]);
      schedStartTarget.setMinutes(schedStartTime[2]);
      schedStartTarget.setSeconds(0);
      schedStartTarget.setMilliseconds(0);
      var schedLockTarget = moment(schedStartTarget).subtract(scheduleLockDelay, "minutes").toDate();
      if (schedLockTarget < startOfWeekDate && new Date().getDay() != 0) {
        schedLockTarget = moment(schedLockTarget).add(7, "days").toDate();
        schedIsOvernight = true;
      }
      var schedEndDay = parseInt(schedEndTime[0], 10);
      var schedEndTarget = new Date();
      schedEndTarget.setDate(nowDate.getDate() - nowDate.getDay() + schedEndDay);
      schedEndTarget.setHours(schedEndTime[1]);
      schedEndTarget.setMinutes(schedEndTime[2]);
      schedEndTarget.setSeconds(0);
      schedEndTarget.setMilliseconds(0);
      if (schedIsOvernight) {
        schedEndTarget = moment(schedEndTarget).add(7, "days").toDate();
      }
      if (schedLockTarget <= nowDate && nowDate < schedEndTarget) {
        isInScheduleLock = true;
        scheduleLockEnd = schedEndTarget;
      }
    });
    if (isInScheduleLock) {
      lockText = capitalizeFirstLetter(moment(scheduleLockEnd).toNow(true)).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " until <i class=\"fa fa-unlock\"></i>";
    } else {
      lockText = "Schedule" + scheduleLockDesc + " <i class=\"fa fa-lock\"></i>";
    }
    lockTextCopy = lockText;
  } else if (blockData.lock.indexOf("window") == 0) {
    var windowLockParts = blockData.window.split("@");
    var windowLockMode = windowLockParts[0];
    var windowTimes = getClosestTimeRange(nowDate, blockData.window);
    var windowStart = windowTimes[0];
    var windowEnd = windowTimes[1];
    if (windowLockMode == "lock") {
      if (nowDate >= windowStart && nowDate < windowEnd) {
        lockText = capitalizeFirstLetter(moment(windowEnd).toNow(true)).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " until <i class=\"fa fa-unlock\"></i>";
      } else {
        lockText = capitalizeFirstLetter(moment(windowStart).toNow(true)).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " until <i class=\"fa fa-lock\"></i>";
      }
    } else if (nowDate >= windowStart && nowDate < windowEnd) {
      lockText = capitalizeFirstLetter(moment(windowEnd).toNow(true)).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " until <i class=\"fa fa-lock\"></i>";
    } else {
      lockText = capitalizeFirstLetter(moment(windowStart).toNow(true)).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " until <i class=\"fa fa-unlock\"></i>";
    }
    var windowLockIcon = windowLockMode == "lock" ? " <i class=\"fa fa-lock\"></i>" : " <i class=\"fa fa-unlock\"></i>";
    if (settings.settings.show24hour == "true") {
      lockTextCopy = format24(windowStart) + " - " + format24(windowEnd) + windowLockIcon;
    } else {
      lockTextCopy = formatAMPM(windowStart) + " - " + formatAMPM(windowEnd) + windowLockIcon;
    }
  } else if (blockData.lock.indexOf("restart") == 0) {
    lockText = "Restart <i class=\"fa fa-lock\"></i>";
    lockTextCopy = lockText;
  } else {
    var timerMoment = moment(blockData.lock, ["YYYY,M,D,H,m"]);
    if (moment().isBefore(timerMoment)) {
      lockText = capitalizeFirstLetter(timerMoment.toNow(true)).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " until <i class=\"fa fa-unlock\"></i>";
    }
    lockTextCopy = lockText;
  }

  return { lockText: lockText, lockTextCopy: lockTextCopy };
}

export function getContinuousBreakText(blockData, blockName, allowances, nowDate, specialSeconds, breakIconClass, iconClass) {
  var breakText = "No breaks";
  var breakTextCopy = breakText;
  var refreshLinkHTML = " <a class=\"list-link action-refresh-allowances\" title=\"Refresh usage based break...\"><i class=\"fa fa-refresh\"></i></a>";

  if (blockData.break.indexOf("allowance,") == 0) {
    if (typeof AppState.allowances[blockName] != "undefined") {
      var allowanceSecs = parseInt(AppState.allowances[blockName]);
      if (allowanceSecs != 0) {
        moment.relativeTimeThreshold("s", 60);
        moment.relativeTimeThreshold("m", 420);
        moment.relativeTimeThreshold("h", 24);
        var allowanceDesc = moment.duration(allowanceSecs, "seconds").humanize();
        breakText = capitalizeFirstLetter(allowanceDesc).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
        moment.relativeTimeThreshold("s", 45);
        moment.relativeTimeThreshold("m", 45);
        moment.relativeTimeThreshold("h", 22);
      } else {
        breakText = "No <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
      }
    } else {
      breakText = getBreakText(blockData.break, blockName);
    }
    breakTextCopy = breakText;
  } else if (blockData.break.indexOf("reward,") == 0) {
    if (typeof AppState.allowances[blockName] != "undefined") {
      var allowanceSecs = parseInt(AppState.allowances[blockName]);
      if (allowanceSecs > 0) {
        moment.relativeTimeThreshold("s", 60);
        moment.relativeTimeThreshold("m", 420);
        moment.relativeTimeThreshold("h", 24);
        var allowanceDesc = moment.duration(allowanceSecs, "seconds").humanize();
        breakText = capitalizeFirstLetter(allowanceDesc).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
        moment.relativeTimeThreshold("s", 45);
        moment.relativeTimeThreshold("m", 45);
        moment.relativeTimeThreshold("h", 22);
      } else if (allowanceSecs <= 0) {
        moment.relativeTimeThreshold("s", 60);
        moment.relativeTimeThreshold("m", 420);
        moment.relativeTimeThreshold("h", 24);
        var allowanceDesc = moment.duration(Math.abs(allowanceSecs), "seconds").humanize();
        breakText = capitalizeFirstLetter(allowanceDesc).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " <i class=\"fa fa-" + iconClass + "\"></i> left" + refreshLinkHTML;
        moment.relativeTimeThreshold("s", 45);
        moment.relativeTimeThreshold("m", 45);
        moment.relativeTimeThreshold("h", 22);
      }
    } else {
      breakText = getBreakText(blockData.break, blockName);
    }
    breakTextCopy = breakText;
  } else if (blockData.break.indexOf("randomText,") == 0) {
    var randomTextParts = blockData.break.replace("randomText,", "").split(",");
    var delayParts = randomTextParts.splice(0, 12);
    delayParts.push(randomTextParts.join(","));
    var randomLength = delayParts[0];
    var breakDurationDesc = parseInt(delayParts[1]) > 59 ? parseInt(delayParts[1]) / 60 + " hr" : parseInt(delayParts[1]) + " min";
    var randomType = delayParts[2];
    var isRandomTextBreak = delayParts[3] == "break";
    var randomTextTarget = new Date(delayParts[4], delayParts[5] - 1, delayParts[6], delayParts[7], delayParts[8], delayParts[9], 0);
    var dataArgs = "data-blockname=\"" + toHtml(blockName).replace(/"/g, "&quot;") + "\"";

    if (isRandomTextBreak && new Date() < randomTextTarget) {
      AppState.specialSeconds.push(randomTextTarget.getSeconds());
      moment.relativeTimeThreshold("s", 60);
      moment.relativeTimeThreshold("m", 420);
      moment.relativeTimeThreshold("h", 24);
      breakText = capitalizeFirstLetter(moment(randomTextTarget).toNow(true)).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " <i class=\"fa fa-" + breakIconClass + "\"></i> left, <a class=\"list-link action-cancel-break-random-text\" title=\"Cancel this break\" " + dataArgs + ">cancel</a>";
      breakTextCopy = breakText;
      moment.relativeTimeThreshold("s", 45);
      moment.relativeTimeThreshold("m", 45);
      moment.relativeTimeThreshold("h", 22);
    } else {
      if (randomType != "custom") {
        var randomTextTypeDesc = randomType == "words" ? " characters of random words" : " characters of gibberish";
        breakText = "<a class=\"list-link action-request-break-random-text\" title=\"Click to type " + randomLength + randomTextTypeDesc + " and start a break...\" " + dataArgs + ">Start a " + breakDurationDesc + " <i class=\"fa fa-" + breakIconClass + "\"></i></a>";
      } else {
        breakText = "<a class=\"list-link action-request-break-random-text\" title=\"Click to type the custom text and start a break...\" " + dataArgs + ">Start a " + breakDurationDesc + " <i class=\"fa fa-" + breakIconClass + "\"></i></a>";
      }
      breakTextCopy = getBreakText(blockData.break, blockName);
    }
  } else if (blockData.break.indexOf("delay,") == 0) {
    var delayParts = blockData.break.replace("delay,", "").split(",");
    var delayLockDuration = delayParts[0];
    var delayLockUnit = delayParts[1] == "h" ? " hr" : delayParts[1] == "m" ? " min" : " sec";
    var delayBreakDurationDesc = parseInt(delayParts[2]) > 59 ? (parseInt(delayParts[2]) / 60).toString() + " hr" : parseInt(delayParts[2]).toString() + " min";
    var delayLockMode = delayParts[3] == "delay" ? true : false;
    var randomTextTarget = new Date(delayParts[4], delayParts[5] - 1, delayParts[6], delayParts[7], delayParts[8], delayParts[9], 0);
    var delayBreakStartTarget = moment(randomTextTarget).subtract(parseInt(delayParts[2]), "minutes").toDate();
    var dataArgs = "data-blockname=\"" + toHtml(blockName).replace(/"/g, "&quot;") + "\"";

    if (delayLockMode && nowDate < delayBreakStartTarget) {
      AppState.specialSeconds.push(delayBreakStartTarget.getSeconds());
      moment.relativeTimeThreshold("s", 60);
      moment.relativeTimeThreshold("m", 420);
      moment.relativeTimeThreshold("h", 24);
      breakText = capitalizeFirstLetter(moment(delayBreakStartTarget).toNow(true)).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " until <i class=\"fa fa-" + breakIconClass + "\"></i>, <a class=\"list-link action-cancel-delay-break\" title=\"Cancel upcoming break\" " + dataArgs + ">cancel</a>";
      breakTextCopy = breakText;
      moment.relativeTimeThreshold("s", 45);
      moment.relativeTimeThreshold("m", 45);
      moment.relativeTimeThreshold("h", 22);
    } else if (delayLockMode && delayBreakStartTarget <= nowDate && nowDate < randomTextTarget) {
      AppState.specialSeconds.push(randomTextTarget.getSeconds());
      moment.relativeTimeThreshold("s", 60);
      moment.relativeTimeThreshold("m", 420);
      moment.relativeTimeThreshold("h", 24);
      breakText = capitalizeFirstLetter(moment(randomTextTarget).toNow(true)).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " <i class=\"fa fa-" + breakIconClass + "\"></i> left, <a class=\"list-link action-cancel-delay-break\" title=\"Cancel this break\" " + dataArgs + ">cancel</a>";
      breakTextCopy = breakText;
      moment.relativeTimeThreshold("s", 45);
      moment.relativeTimeThreshold("m", 45);
      moment.relativeTimeThreshold("h", 22);
    } else {
      breakText = "<a class=\"list-link action-start-delay-break\" title=\"Click to start a " + delayBreakDurationDesc + " break after a " + delayLockDuration + delayLockUnit + " delay\" " + dataArgs + ">Start a " + delayBreakDurationDesc + " <i class=\"fa fa-" + breakIconClass + "\"></i></a>";
      breakTextCopy = getBreakText(blockData.break, blockName);
    }
  } else if (blockData.break.indexOf("sessions,") == 0) {
    if (typeof AppState.allowances[blockName] != "undefined") {
      var allowanceSecs = parseInt(AppState.allowances[blockName]);
      if (allowanceSecs != 0) {
        breakText = AppState.allowances[blockName] + " <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
      } else {
        breakText = "No <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
      }
    } else {
      breakText = getBreakText(blockData.break, blockName);
    }
    breakTextCopy = breakText;
  } else if (blockData.break == "none") {
    breakText = "No breaks";
    breakTextCopy = breakText;
  } else if (blockData.break.indexOf(",") < 0) {
    if (typeof AppState.allowances[blockName] != "undefined") {
      var allowanceSecs = parseInt(AppState.allowances[blockName]);
      if (allowanceSecs != 0) {
        moment.relativeTimeThreshold("s", 60);
        moment.relativeTimeThreshold("m", 420);
        moment.relativeTimeThreshold("h", 24);
        var allowanceDesc = moment.duration(allowanceSecs, "seconds").humanize();
        breakText = capitalizeFirstLetter(allowanceDesc).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
        moment.relativeTimeThreshold("s", 45);
        moment.relativeTimeThreshold("m", 45);
        moment.relativeTimeThreshold("h", 22);
      } else {
        breakText = "No <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
      }
    } else {
      breakText = getBreakText(blockData.break, blockName);
    }
    breakTextCopy = breakText;
  } else {
    var pomodoroStartTarget = new Date();
    pomodoroStartTarget.setFullYear(parseInt(blockData.startTime.split(",")[0]));
    pomodoroStartTarget.setMonth(parseInt(blockData.startTime.split(",")[1]) - 1);
    pomodoroStartTarget.setDate(parseInt(blockData.startTime.split(",")[2]));
    pomodoroStartTarget.setHours(parseInt(blockData.startTime.split(",")[3]));
    pomodoroStartTarget.setMinutes(parseInt(blockData.startTime.split(",")[4]));
    pomodoroStartTarget.setSeconds(0);
    pomodoroStartTarget.setMilliseconds(0);
    var startOfDayTarget = new Date();
    startOfDayTarget.setHours(0);
    startOfDayTarget.setMinutes(0);
    startOfDayTarget.setSeconds(0);
    startOfDayTarget.setMilliseconds(0);
    if (pomodoroStartTarget < startOfDayTarget) {
      pomodoroStartTarget = startOfDayTarget;
    }
    if (typeof blockData.pomodoroTime == "string" && blockData.pomodoroTime != "") {
      var pomodoroOverrideTarget = new Date();
      pomodoroOverrideTarget.setFullYear(parseInt(blockData.pomodoroTime.split(",")[0]));
      pomodoroOverrideTarget.setMonth(parseInt(blockData.pomodoroTime.split(",")[1]) - 1);
      pomodoroOverrideTarget.setDate(parseInt(blockData.pomodoroTime.split(",")[2]));
      pomodoroOverrideTarget.setHours(parseInt(blockData.pomodoroTime.split(",")[3]));
      pomodoroOverrideTarget.setMinutes(parseInt(blockData.pomodoroTime.split(",")[4]));
      pomodoroOverrideTarget.setSeconds(0);
      pomodoroOverrideTarget.setMilliseconds(0);
      if (pomodoroStartTarget < pomodoroOverrideTarget) {
        pomodoroStartTarget = pomodoroOverrideTarget;
      }
    }
    var pomodoroWorkMin = parseInt(blockData.break.split(",")[0]);
    var pomodoroBreakMin = parseInt(blockData.break.split(",")[1]);
    var pomodoroTotalMin = pomodoroWorkMin + pomodoroBreakMin;
    var pomodoroElapsedMin = parseInt(Math.floor(moment.duration(moment().diff(pomodoroStartTarget)).asMinutes()));
    var pomodoroPercent = Math.floor(pomodoroElapsedMin % pomodoroTotalMin / pomodoroTotalMin * 100);
    if (pomodoroPercent >= Math.floor(pomodoroWorkMin / pomodoroTotalMin * 100)) {
      breakText = (pomodoroTotalMin - Math.round(pomodoroPercent / 100 * pomodoroTotalMin)).toString() + " min <i class=\"fa fa-" + breakIconClass + "\"></i> left";
    } else {
      breakText = (pomodoroWorkMin - Math.round(pomodoroPercent / 100 * pomodoroTotalMin)).toString() + " min until <i class=\"fa fa-" + breakIconClass + "\"></i>";
    }
    breakTextCopy = breakText;
    breakText = breakText + " <a class=\"list-link action-reset-pomodoro\" title=\"Reset this pomodoro timer...\" data-blockname=\"" + toHtml(blockName).replace(/"/g, "&quot;") + "\"><i class=\"fa fa-step-backward\"></i></a>";
  }

  return { breakText: breakText, breakTextCopy: breakTextCopy };
}

export function getScheduledBreakText(schedItem, blockData, blockName, allowances, schedStartTarget, nowDate, specialSeconds, breakIconClass, iconClass) {
  var breakText = "No breaks";
  var breakTextCopy = breakText;
  var refreshLinkHTML = " <a class=\"list-link action-refresh-allowances\" title=\"Refresh usage based break...\"><i class=\"fa fa-refresh\"></i></a>";

  if (schedItem.break.indexOf("allowance,") == 0) {
    if (typeof AppState.allowances[blockName] != "undefined") {
      var allowanceSecs2 = parseInt(AppState.allowances[blockName]);
      if (allowanceSecs2 != 0) {
        moment.relativeTimeThreshold("s", 60);
        moment.relativeTimeThreshold("m", 420);
        moment.relativeTimeThreshold("h", 24);
        var allowanceDesc2 = moment.duration(allowanceSecs2, "seconds").humanize();
        breakText = capitalizeFirstLetter(allowanceDesc2).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
        moment.relativeTimeThreshold("s", 45);
        moment.relativeTimeThreshold("m", 45);
        moment.relativeTimeThreshold("h", 22);
      } else {
        breakText = "No <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
      }
    } else {
      breakText = getBreakText(schedItem.break, blockName);
    }
    breakTextCopy = breakText;
  } else if (schedItem.break.indexOf("reward,") == 0) {
    if (typeof AppState.allowances[blockName] != "undefined") {
      var allowanceSecs2 = parseInt(AppState.allowances[blockName]);
      if (allowanceSecs2 > 0) {
        moment.relativeTimeThreshold("s", 60);
        moment.relativeTimeThreshold("m", 420);
        moment.relativeTimeThreshold("h", 24);
        var allowanceDesc2 = moment.duration(allowanceSecs2, "seconds").humanize();
        breakText = capitalizeFirstLetter(allowanceDesc2).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
        moment.relativeTimeThreshold("s", 45);
        moment.relativeTimeThreshold("m", 45);
        moment.relativeTimeThreshold("h", 22);
      } else if (allowanceSecs2 <= 0) {
        moment.relativeTimeThreshold("s", 60);
        moment.relativeTimeThreshold("m", 420);
        moment.relativeTimeThreshold("h", 24);
        var allowanceDesc2 = moment.duration(Math.abs(allowanceSecs2), "seconds").humanize();
        breakText = capitalizeFirstLetter(allowanceDesc2).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " <i class=\"fa fa-" + iconClass + "\"></i> left" + refreshLinkHTML;
        moment.relativeTimeThreshold("s", 45);
        moment.relativeTimeThreshold("m", 45);
        moment.relativeTimeThreshold("h", 22);
      }
    } else {
      breakText = getBreakText(schedItem.break, blockName);
    }
    breakTextCopy = breakText;
  } else if (schedItem.break.indexOf("randomText,") == 0) {
    var randomTextParts2 = schedItem.break.replace("randomText,", "").split(",");
    var delayParts2 = randomTextParts2.splice(0, 12);
    delayParts2.push(randomTextParts2.join(","));
    var randomLength2 = delayParts2[0];
    var breakDurationDesc2 = parseInt(delayParts2[1]) > 59 ? parseInt(delayParts2[1]) / 60 + " hr" : parseInt(delayParts2[1]) + " min";
    var randomType2 = delayParts2[2];
    var isRandomTextBreak2 = delayParts2[3] == "break";
    var randomTextTarget2 = new Date(delayParts2[4], delayParts2[5] - 1, delayParts2[6], delayParts2[7], delayParts2[8], delayParts2[9], 0);
    var dataArgs = "data-blockname=\"" + toHtml(blockName).replace(/"/g, "&quot;") + "\" data-scheditemid=\"" + toHtml(schedItem.id).replace(/"/g, "&quot;") + "\"";

    if (isRandomTextBreak2 && new Date() < randomTextTarget2) {
      AppState.specialSeconds.push(randomTextTarget2.getSeconds());
      moment.relativeTimeThreshold("s", 60);
      moment.relativeTimeThreshold("m", 420);
      moment.relativeTimeThreshold("h", 24);
      breakText = capitalizeFirstLetter(moment(randomTextTarget2).toNow(true)).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " <i class=\"fa fa-" + breakIconClass + "\"></i> left, <a class=\"list-link action-cancel-break-random-text\" title=\"Cancel this break\" " + dataArgs + ">cancel</a>";
      breakTextCopy = breakText;
      moment.relativeTimeThreshold("s", 45);
      moment.relativeTimeThreshold("m", 45);
      moment.relativeTimeThreshold("h", 22);
    } else {
      if (randomType2 != "custom") {
        var randomTextTypeDesc2 = randomType2 == "words" ? " characters of random words" : " characters of gibberish";
        breakText = "<a class=\"list-link action-request-break-random-text\" title=\"Click to type " + randomLength2 + randomTextTypeDesc2 + " and start a break...\" " + dataArgs + ">Start a " + breakDurationDesc2 + " <i class=\"fa fa-" + breakIconClass + "\"></i></a>";
      } else {
        breakText = "<a class=\"list-link action-request-break-random-text\" title=\"Click to type the custom text and start a break...\" " + dataArgs + ">Start a " + breakDurationDesc2 + " <i class=\"fa fa-" + breakIconClass + "\"></i></a>";
      }
      breakTextCopy = getBreakText(schedItem.break, blockName);
    }
  } else if (schedItem.break.indexOf("delay,") == 0) {
    var delayParts2 = schedItem.break.replace("delay,", "").split(",");
    var delayBreakDuration2 = delayParts2[0];
    var delayBreakUnit2 = delayParts2[1] == "h" ? " hr" : delayParts2[1] == "m" ? " min" : " sec";
    var delayBreakDurationDesc2 = parseInt(delayParts2[2]) > 59 ? (parseInt(delayParts2[2]) / 60).toString() + " hr" : parseInt(delayParts2[2]).toString() + " min";
    var isDelayBreak2 = delayParts2[3] == "delay" ? true : false;
    var randomTextTarget2 = new Date(delayParts2[4], delayParts2[5] - 1, delayParts2[6], delayParts2[7], delayParts2[8], delayParts2[9], 0);
    var delayBreakStartTarget2 = moment(randomTextTarget2).subtract(parseInt(delayParts2[2]), "minutes").toDate();
    var dataArgs = "data-blockname=\"" + toHtml(blockName).replace(/"/g, "&quot;") + "\" data-scheditemid=\"" + toHtml(schedItem.id).replace(/"/g, "&quot;") + "\"";

    if (isDelayBreak2 && nowDate < delayBreakStartTarget2) {
      AppState.specialSeconds.push(delayBreakStartTarget2.getSeconds());
      moment.relativeTimeThreshold("s", 60);
      moment.relativeTimeThreshold("m", 420);
      moment.relativeTimeThreshold("h", 24);
      breakText = capitalizeFirstLetter(moment(delayBreakStartTarget2).toNow(true)).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " until <i class=\"fa fa-" + breakIconClass + "\"></i>, <a class=\"list-link action-cancel-delay-break\" title=\"Cancel upcoming break\" " + dataArgs + ">cancel</a>";
      breakTextCopy = breakText;
      moment.relativeTimeThreshold("s", 45);
      moment.relativeTimeThreshold("m", 45);
      moment.relativeTimeThreshold("h", 22);
    } else if (isDelayBreak2 && delayBreakStartTarget2 <= nowDate && nowDate < randomTextTarget2) {
      AppState.specialSeconds.push(randomTextTarget2.getSeconds());
      moment.relativeTimeThreshold("s", 60);
      moment.relativeTimeThreshold("m", 420);
      moment.relativeTimeThreshold("h", 24);
      breakText = capitalizeFirstLetter(moment(randomTextTarget2).toNow(true)).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " <i class=\"fa fa-" + breakIconClass + "\"></i> left, <a class=\"list-link action-cancel-delay-break\" title=\"Cancel this break\" " + dataArgs + ">cancel</a>";
      breakTextCopy = breakText;
      moment.relativeTimeThreshold("s", 45);
      moment.relativeTimeThreshold("m", 45);
      moment.relativeTimeThreshold("h", 22);
    } else {
      breakText = "<a class=\"list-link action-start-delay-break\" title=\"Click to start a " + delayBreakDurationDesc2 + " break after a " + delayBreakDuration2 + delayBreakUnit2 + " delay\" " + dataArgs + ">Start a " + delayBreakDurationDesc2 + " <i class=\"fa fa-" + breakIconClass + "\"></i></a>";
      breakTextCopy = getBreakText(schedItem.break, blockName);
    }
  } else if (schedItem.break.indexOf("sessions,") == 0) {
    if (typeof AppState.allowances[blockName] != "undefined") {
      var allowanceSecs2 = parseInt(AppState.allowances[blockName]);
      if (allowanceSecs2 != 0) {
        breakText = AppState.allowances[blockName] + " <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
      } else {
        breakText = "No <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
      }
    } else {
      breakText = getBreakText(schedItem.break, blockName);
    }
    breakTextCopy = breakText;
  } else if (schedItem.break == "none") {
    breakText = "No breaks";
    breakTextCopy = breakText;
  } else if (schedItem.break.indexOf(",") < 0) {
    if (typeof AppState.allowances[blockName] != "undefined") {
      var allowanceSecs2 = parseInt(AppState.allowances[blockName]);
      if (allowanceSecs2 != 0) {
        moment.relativeTimeThreshold("s", 60);
        moment.relativeTimeThreshold("m", 420);
        moment.relativeTimeThreshold("h", 24);
        var allowanceDesc2 = moment.duration(allowanceSecs2, "seconds").humanize();
        breakText = capitalizeFirstLetter(allowanceDesc2).replace("An hour", "1 hour").replace("A minute", "1 minute").replace("A few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, "") + " <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
        moment.relativeTimeThreshold("s", 45);
        moment.relativeTimeThreshold("m", 45);
        moment.relativeTimeThreshold("h", 22);
      } else {
        breakText = "No <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
      }
    } else {
      breakText = getBreakText(schedItem.break, blockName);
    }
    breakTextCopy = breakText;
  } else {
    if (typeof blockData.pomodoroTime == "string" && blockData.pomodoroTime != "") {
      var pomodoroOverrideTarget2 = new Date();
      pomodoroOverrideTarget2.setFullYear(parseInt(blockData.pomodoroTime.split(",")[0]));
      pomodoroOverrideTarget2.setMonth(parseInt(blockData.pomodoroTime.split(",")[1]) - 1);
      pomodoroOverrideTarget2.setDate(parseInt(blockData.pomodoroTime.split(",")[2]));
      pomodoroOverrideTarget2.setHours(parseInt(blockData.pomodoroTime.split(",")[3]));
      pomodoroOverrideTarget2.setMinutes(parseInt(blockData.pomodoroTime.split(",")[4]));
      pomodoroOverrideTarget2.setSeconds(0);
      pomodoroOverrideTarget2.setMilliseconds(0);
      if (schedStartTarget < pomodoroOverrideTarget2) {
        schedStartTarget = pomodoroOverrideTarget2;
      }
    }
    var pomodoroWorkMin2 = parseInt(schedItem.break.split(",")[0]);
    var pomodoroBreakMin2 = parseInt(schedItem.break.split(",")[1]);
    var pomodoroTotalMin2 = pomodoroWorkMin2 + pomodoroBreakMin2;
    var pomodoroElapsedMin2 = parseInt(Math.floor(moment.duration(moment().diff(schedStartTarget)).asMinutes()));
    var pomodoroPercent2 = Math.floor(pomodoroElapsedMin2 % pomodoroTotalMin2 / pomodoroTotalMin2 * 100);
    if (pomodoroPercent2 >= Math.floor(pomodoroWorkMin2 / pomodoroTotalMin2 * 100)) {
      breakText = (pomodoroTotalMin2 - Math.round(pomodoroPercent2 / 100 * pomodoroTotalMin2)).toString() + " min <i class=\"fa fa-" + breakIconClass + "\"></i> left";
    } else {
      breakText = (pomodoroWorkMin2 - Math.round(pomodoroPercent2 / 100 * pomodoroTotalMin2)).toString() + " min until <i class=\"fa fa-" + breakIconClass + "\"></i>";
    }
    breakTextCopy = breakText;
    breakText = breakText + " <a class=\"list-link action-reset-pomodoro\" title=\"Reset this pomodoro timer...\" data-blockname=\"" + toHtml(blockName).replace(/"/g, "&quot;") + "\"><i class=\"fa fa-step-backward\"></i></a>";
  }

  return { breakText: breakText, breakTextCopy: breakTextCopy };
}

export function renderBlockRow(blockDisplayName, blockDetails, iconClass, blockTypeDesc, col2Text, breakText, lockText) {
  return "<div class=\"form-group table-row\"><div class=\"col-sm-3 truncate-overview-text left\" title=\"" + blockDetails + "\"><i class=\"fa fa-" + iconClass + "\" title=\"" + blockTypeDesc + "\"></i> " + toHtml(blockDisplayName) + "</div><div class=\"col-sm-3 truncate-overview-text center\">" + col2Text + "</div><div class=\"col-sm-3 truncate-overview-text center\">" + breakText + "</div><div class=\"col-sm-3 truncate-overview-text right\">" + lockText + "</div></div>";
}
