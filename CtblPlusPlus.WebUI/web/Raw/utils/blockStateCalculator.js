/**
 * @file blockStateCalculator.js
 * @layer Utils
 * @description Calculates the view-model state for a block based on raw blockData, time, and schedules.
 */

import { editAutostart } from '../components/AutostartEditor/AutostartEditor';
import { editBreakSchedule } from '../components/BlockModal/BlockModalDialogs';
import { editFrozenAutostartTimer } from '../components/FrozenAutostartEditor/FrozenAutostartEditor';
import { editFrozenTimer } from '../components/FrozenListEditor/FrozenListEditor';
import { requestUnlock } from '../components/SecurityModal/SecurityModal';
import { toggleBlock } from '../services/blockManager';
import { toHtml } from './formatString';
import { editBreak } from '../pages/BreakEditorPage/BreakEditorPage';
import { editSchedule } from '../pages/ScheduleEditorPage/ScheduleEditorPage';
import { AppState } from '../store/AppState';
import { getAutostartText, getHumanDate, getBreakText } from './formatData';
import { getClosestTimeRange, formatAMPM, format24 } from './calculateTime';
import { findLockType } from '../lockTypes';

export function calculateBlockState(blockName, blockData, currentDate, unlockedBlocksArray) {
  var isBlockActive = false;
  if (blockData.enabled == "true") {
    if (blockData.type == "continuous") {
      isBlockActive = true;
    } else if (blockData.type == "scheduled") {
      $.each(blockData.schedule, function (scheduleIndex, scheduleEntry) {
        if (parseInt(scheduleEntry.startTime.split(",")[0]) == currentDate.getDay()) {
          var scheduleStartDate = new Date(currentDate.getTime());
          scheduleStartDate.setHours(parseInt(scheduleEntry.startTime.split(",")[1]));
          scheduleStartDate.setMinutes(parseInt(scheduleEntry.startTime.split(",")[2]));
          scheduleStartDate.setSeconds(0);
          scheduleStartDate.setMilliseconds(0);
          
          var scheduleEndDate = new Date(currentDate.getTime());
          var endHour = parseInt(scheduleEntry.endTime.split(",")[1]);
          var endMinute = parseInt(scheduleEntry.endTime.split(",")[2]);
          if (endHour == 0 && endMinute == 0) {
            scheduleEndDate = moment(scheduleEndDate).add(1, "days").toDate();
          }
          scheduleEndDate.setHours(endHour);
          scheduleEndDate.setMinutes(endMinute);
          scheduleEndDate.setSeconds(0);
          scheduleEndDate.setMilliseconds(0);
          
          if (moment(currentDate).isSameOrAfter(scheduleStartDate) && moment(currentDate).isBefore(scheduleEndDate)) {
            isBlockActive = true;
          }
        }
      });
    }
  }

  var isFrozen = (blockName == "Frozen Turkey" || blockName.indexOf("Frozen Turkey,") == 0);
  var frozenDisplayName = "";
  var frozenDescription = "";
  if (isFrozen) {
    var frozenType = typeof blockData.apps[0] == "string" && blockData.apps[0].indexOf("frozen:") == 0 ? blockData.apps[0].substring(blockData.apps[0].indexOf(":") + 1) : "lock";
    frozenDescription = frozenType == "shutdown" ? "shut down this device" : frozenType == "logoff" ? "sign out affected users" : "display the lock screen";
    frozenDisplayName = blockName.indexOf(",") > 0 ? blockName.substring(blockName.indexOf(",") + 1) : blockName;
  }

  var isUnlocked = unlockedBlocksArray.indexOf(blockName + "\\" + blockData.lock + "\\" + blockData.randomTextLength + "\\" + blockData.password) > -1;
  var alphabeticalOrderData = "";
  var activeClass = isBlockActive ? " active" : "";
  var lockToggleData = "false";
  var checkedAttribute = "";
  var toggleButtonHtml = "";
  var disabledAttribute = "";
  var lockHtml = "";
  var lockTypeData = "false";
  var breakText = "";
  var scheduleText = "";
  var editBreakAction = "";
  var usersText = "";

  if (typeof settings.additional.blocksOrder != "undefined" && settings.additional.blocksOrder == "onoffaz") {
    alphabeticalOrderData = blockData.enabled == "true" ? "0" : "1";
  }

  if (blockData.users == "all") {
    usersText = "All users";
  } else if (blockData.users == "allcustom") {
    usersText = "Most users";
  } else {
    usersText = "Some users";
  }

  var autostartColorClass = isFrozen ? "hover-button" : "hover-button";
  var autostartStrict = false;
  var autostartText = typeof getAutostartText === 'function' ? getAutostartText(blockData.autostart) : "";
  
  if (typeof blockData.autostart == "string" && blockData.autostart != "none") {
    if (blockData.autostart.indexOf("time,") == 0) {
      var autostartParts = blockData.autostart.replace("time,", "").split(",");
      var autostartDate = new Date(autostartParts[0], autostartParts[1] - 1, autostartParts[2], autostartParts[3], autostartParts[4], 0, 0);
      if (currentDate < autostartDate) {
        autostartStrict = autostartParts[5] == "true";
        autostartColorClass = isFrozen ? "red" : "green";
      }
    } else {
      autostartColorClass = isFrozen ? "red" : "green";
    }
  }

  var lockStrictness = 0;
  if (autostartStrict) {
    lockStrictness = typeof AppState.passwordStrict !== 'undefined' && AppState.passwordStrict.indexOf("unlock") < 0 ? 2 : 0;
  } else {
    lockStrictness = blockData.enabled == "true" && !isUnlocked && typeof AppState.passwordStrict !== 'undefined' && AppState.passwordStrict.indexOf("unlock") < 0 ? 1 : 0;
  }

  if (blockData.type == "continuous") {
    checkedAttribute = blockData.enabled == "true" ? " checked=\"checked\"" : "";
    scheduleText = "Blocked at all times";
    editBreakAction = "editBreak";
    breakText = typeof getBreakText === 'function' ? getBreakText(blockData.break, blockName) : "";

    if (isFrozen) {
      var timerDate = moment(currentDate).subtract(1, "seconds");
      if (blockData.timer && blockData.timer.indexOf(",") > 0) {
        timerDate = moment(blockData.timer, ["YYYY,M,D,H,m"]);
      }
      var timerText = "";
      if (moment(currentDate).isBefore(timerDate)) {
        disabledAttribute = lockStrictness >= 1 ? " disabled=\"disabled\"" : "";
        lockTypeData = lockStrictness >= 1 ? "true" : "false";
        timerText = getHumanDate(timerDate) + " <i class=\"fa fa-lock\"></i>";
      } else {
        disabledAttribute = "";
        lockTypeData = "false";
      }

      if (blockData.enabled == "true" && moment(currentDate).isBefore(timerDate)) {
        toggleButtonHtml = "<button class=\"btn-red frozen-start-button action-request-unlock\" title=\"Extend end time...\" data-unlock-action=\"editFrozenTimer\" data-blockname=\"" + toHtml(blockName.replace(/'/g, "\\'")).replace(/"/g, "\\\"") + "\" data-locktype=\"" + lockTypeData + "\" data-unlock-param=\"true\">" + timerText + "</button>";
      } else {
        toggleButtonHtml = "<a class=\"list-link autostart-button action-request-unlock " + autostartColorClass + "\" data-unlock-action=\"editFrozenAutostartTimer\" data-blockname=\"" + toHtml(blockName.replace(/'/g, "\\'")).replace(/"/g, "\\\"") + "\" data-locktype=\"" + lockTypeData + "\" data-unlock-param=\"true\"><i class=\"fa fa-magic\" title=\"" + autostartText + "Click to edit...\"></i></a>";
        toggleButtonHtml += "<button class=\"btn-red frozen-start-button action-request-unlock\" title=\"Select end time and start block...\" data-unlock-action=\"editFrozenTimer\" data-blockname=\"" + toHtml(blockName.replace(/'/g, "\\'")).replace(/"/g, "\\\"") + "\" data-locktype=\"" + lockTypeData + "\" data-unlock-param=\"true\">Start...</button>";
      }
    }
  } else {
    checkedAttribute = blockData.enabled == "true" ? " checked=\"checked\"" : "";
    scheduleText = "Scheduled blocks (" + (blockData.schedule ? blockData.schedule.length.toString() : "0") + ")";
    editBreakAction = settings.settings.showEditBreakSchedule == "true" ? "editBreakSchedule" : "editSchedule";
    breakText = "Breaks as scheduled";
  }

  // Common lock logic (for both scheduled frozen and normal blocks)
  if (!isFrozen || blockData.type !== "continuous") {
    if (blockData.lock.indexOf("none") == 0) {
      disabledAttribute = "";
      lockTypeData = "false";
      lockHtml = "Unlocked <i class=\"fa fa-unlock\"></i>";
    } else if (blockData.lock.indexOf("randomText") == 0) {
      var lockIconHtml = blockData.enabled == "true" && isUnlocked ? " <i class=\"fa fa-unlock\"></i>" : " <i class=\"fa fa-lock\"></i>";
      disabledAttribute = "";
      lockTypeData = lockStrictness == 2 ? "true" : lockStrictness == 1 ? "randomText" : "false";
      lockToggleData = lockStrictness == 1 ? "randomText" : "false";
      if (blockData.randomTextLength.indexOf(",") > 0) {
        var randomTextParts = blockData.randomTextLength.split(",");
        var randomTextSpliced = randomTextParts.splice(0, 2);
        randomTextSpliced.push(randomTextParts.join(","));
        if (randomTextSpliced[1] != "custom") {
          lockHtml = randomTextSpliced[0] + " <i class=\"fa fa-random\"></i> chars " + lockIconHtml;
        } else {
          lockHtml = "Custom text" + lockIconHtml;
        }
      } else {
        lockHtml = blockData.randomTextLength + " <i class=\"fa fa-random\"></i> chars " + lockIconHtml;
      }
    } else if (blockData.lock.indexOf("delay") == 0) {
      var delayParts = blockData.lock.replace("delay,", "").split(",");
      var delayAmount = delayParts[0];
      var delayUnit = delayParts[1] == "h" ? " hr" : delayParts[1] == "m" ? " min" : " sec";
      var delayLockType = delayParts[3];
      var delayEndDate = new Date(delayParts[4], delayParts[5] - 1, delayParts[6], delayParts[7], delayParts[8], delayParts[9], 0);
      var delayState = delayLockType == "none" || delayLockType == "delay" && currentDate < delayEndDate ? "delay" : "false";
      var delayLockIconHtml = delayLockType == "unlocked" && blockData.enabled == "true" ? "<i class=\"fa fa-unlock\"></i>" : "<i class=\"fa fa-lock\"></i>";
      disabledAttribute = "";
      lockTypeData = lockStrictness == 2 ? "true" : lockStrictness == 1 ? delayState : "false";
      lockToggleData = lockStrictness == 1 ? delayState : "false";
      lockHtml = delayAmount + delayUnit + " <i class=\"fa fa-hourglass-half\"></i> " + delayLockIconHtml;
    } else if (blockData.lock.indexOf("password") == 0) {
      var lockIconHtml = blockData.enabled == "true" && isUnlocked ? " <i class=\"fa fa-unlock\"></i>" : " <i class=\"fa fa-lock\"></i>";
      disabledAttribute = "";
      lockTypeData = lockStrictness == 2 ? "true" : lockStrictness == 1 ? "password" : "false";
      lockToggleData = lockStrictness == 1 ? "password" : "false";
      
      var matchedLockType = findLockType(blockName, blockData);
      var lockTypeDisplayState = matchedLockType ? matchedLockType.getDisplayState(blockName, blockData) : null;
      if (lockTypeDisplayState != null) {
          lockHtml = lockTypeDisplayState + lockIconHtml;
      } else {
          lockHtml = "Block password" + lockIconHtml;
      }
    } else if (blockData.lock.indexOf("spassword") == 0) {
      disabledAttribute = "";
      lockTypeData = "spassword";
      lockHtml = "Settings password <i class=\"fa fa-unlock\"></i>";
    } else if (blockData.lock.indexOf("schedule") == 0) {
      var isScheduleLockActive = false;
      var scheduleLockAdvanceMinutes = 0;
      var scheduleLockAdvanceText = "";
      if (blockData.lock.indexOf(",") > 0) {
        scheduleLockAdvanceMinutes = parseInt(blockData.lock.replace("schedule,", "").split(",")[0]);
        if (scheduleLockAdvanceMinutes > 0) {
          scheduleLockAdvanceText = " (-" + (scheduleLockAdvanceMinutes > 59 ? scheduleLockAdvanceMinutes / 60 + " hr" : scheduleLockAdvanceMinutes + " min") + ")";
        }
      }
      $.each(blockData.schedule, function (i, schedLockEntry) {
        var schedStartParts = schedLockEntry.startTime.split(",");
        var schedEndParts = schedLockEntry.endTime.split(",");
        var schedCrossWeek = false;
        var weekStartDate = new Date(currentDate.getTime());
        weekStartDate.setDate(currentDate.getDate() - currentDate.getDay());
        weekStartDate.setHours(0, 0, 0, 0);
        
        var schedStartTempDate = new Date(currentDate.getTime());
        schedStartTempDate.setDate(currentDate.getDate() - currentDate.getDay() + parseInt(schedStartParts[0], 10));
        schedStartTempDate.setHours(schedStartParts[1]);
        schedStartTempDate.setMinutes(schedStartParts[2]);
        schedStartTempDate.setSeconds(0);
        schedStartTempDate.setMilliseconds(0);
        
        var schedLockStartDate = moment(schedStartTempDate).subtract(scheduleLockAdvanceMinutes, "minutes").toDate();
        if (schedLockStartDate < weekStartDate && new Date().getDay() != 0) {
          schedLockStartDate = moment(schedLockStartDate).add(7, "days").toDate();
          schedCrossWeek = true;
        }
        
        var schedLockEndDate = new Date(currentDate.getTime());
        schedLockEndDate.setDate(currentDate.getDate() - currentDate.getDay() + parseInt(schedEndParts[0], 10));
        schedLockEndDate.setHours(schedEndParts[1]);
        schedLockEndDate.setMinutes(schedEndParts[2]);
        schedLockEndDate.setSeconds(0);
        schedLockEndDate.setMilliseconds(0);
        if (schedCrossWeek) {
          schedLockEndDate = moment(schedLockEndDate).add(7, "days").toDate();
        }
        if (schedLockStartDate <= currentDate && currentDate < schedLockEndDate) {
          isScheduleLockActive = true;
        }
      });
      disabledAttribute = lockStrictness == 1 && isScheduleLockActive ? " disabled=\"disabled\"" : "";
      lockTypeData = lockStrictness == 1 && isScheduleLockActive ? "true" : "false";
      lockHtml = "Schedule" + scheduleLockAdvanceText + " <i class=\"fa fa-lock\"></i>";
    } else if (blockData.lock.indexOf("window") == 0) {
      var windowDays = [0, 1, 2, 3, 4, 5, 6];
      var windowParts = blockData.window.split("@");
      var windowLockType = windowParts[0];
      if (windowParts[3]) windowDays = windowParts[3].split("");
      
      var closestTimeRange = getClosestTimeRange(currentDate, blockData.window);
      var windowStartDate = closestTimeRange[0];
      var windowEndDate = closestTimeRange[1];
      
      if (windowLockType == "lock") {
        lockHtml = " <i class=\"fa fa-lock\"></i>";
        if (currentDate >= windowStartDate && currentDate < windowEndDate) {
          disabledAttribute = lockStrictness == 1 ? " disabled=\"disabled\"" : "";
          lockTypeData = lockStrictness == 1 ? "true" : "false";
        } else {
          disabledAttribute = "";
          lockTypeData = "false";
        }
      } else {
        lockHtml = " <i class=\"fa fa-unlock\"></i>";
        if (currentDate >= windowStartDate && currentDate < windowEndDate) {
          disabledAttribute = "";
          lockTypeData = "false";
        } else {
          disabledAttribute = lockStrictness == 1 ? " disabled=\"disabled\"" : "";
          lockTypeData = lockStrictness == 1 ? "true" : "false";
        }
      }
      var windowDaysText = windowDays.length < 7 ? " (x" + windowDays.length.toString() + ")" : "";
      if (settings.settings.show24hour == "true") {
        lockHtml = format24(windowStartDate) + " - " + format24(windowEndDate) + windowDaysText + lockHtml;
      } else {
        lockHtml = formatAMPM(windowStartDate) + " - " + formatAMPM(windowEndDate) + windowDaysText + lockHtml;
      }
    } else if (blockData.lock.indexOf("restart") == 0) {
      disabledAttribute = lockStrictness == 1 ? " disabled=\"disabled\"" : "";
      lockTypeData = lockStrictness == 1 ? "true" : "false";
      lockHtml = "Restart <i class=\"fa fa-lock\"></i>";
    } else {
      var timerDate = moment(blockData.lock, ["YYYY,M,D,H,m"]);
      if (moment(currentDate).isBefore(timerDate)) {
        disabledAttribute = lockStrictness >= 1 ? " disabled=\"disabled\"" : "";
        lockTypeData = lockStrictness >= 1 ? "true" : "false";
        lockHtml = getHumanDate(timerDate) + " <i class=\"fa fa-lock\"></i>";
      } else {
        disabledAttribute = "";
        lockTypeData = "false";
        lockHtml = "Unlocked <i class=\"fa fa-unlock\"></i>";
      }
    }
    
    if (!isFrozen) {
      toggleButtonHtml = "<a class=\"list-link autostart action-request-unlock " + autostartColorClass + "\" data-unlock-action=\"editAutostart\" data-blockname=\"" + toHtml(blockName.replace(/'/g, "\\'")).replace(/"/g, "\\\"") + "\" data-locktype=\"" + (autostartColorClass == "red" ? lockTypeData : "false") + "\" data-unlock-param=\"true\"><i class=\"fa fa-magic\" title=\"" + autostartText + "Click to edit...\"></i></a> <label class=\"toggle toggle-red\"><input type=\"checkbox\" class=\"action-request-unlock-checkbox\" data-unlock-action=\"toggleBlock\" data-blockname=\"" + toHtml(blockName.replace(/'/g, "\\'")).replace(/"/g, "\\\"") + "\" data-locktype=\"" + lockToggleData + "\" data-unlock-param=\"false\"" + checkedAttribute + disabledAttribute + "/><div data-off=\"Off\" data-on=\"On\"></div></label>";
    }
  }

  return {
    isFrozen: isFrozen,
    blockName: blockName,
    frozenDisplayName: frozenDisplayName,
    frozenDescription: frozenDescription,
    alphabeticalOrderData: alphabeticalOrderData,
    activeClass: activeClass,
    lockTypeData: lockTypeData,
    toggleButtonHtml: toggleButtonHtml,
    scheduleText: scheduleText,
    editBreakAction: editBreakAction,
    breakText: breakText,
    usersText: usersText,
    lockHtml: lockHtml,
    webCount: blockData.web ? blockData.web.length : 0,
    exceptionCount: blockData.exceptions ? blockData.exceptions.length : 0,
    appCount: blockData.apps ? blockData.apps.length : 0,
    autostartColorClass: autostartColorClass,
    autostartText: autostartText,
    lockToggleData: lockToggleData,
    checkedAttribute: checkedAttribute,
    disabledAttribute: disabledAttribute
  };
}
