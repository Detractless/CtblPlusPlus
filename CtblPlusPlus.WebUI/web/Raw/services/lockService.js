
import { AppState } from '../store/AppState';
import { getClosestTimeRange } from '../utils/calculateTime';

export function getDelayLockState(lockData, nowDate) {
    var delayParts = lockData.replace("delay,", "").split(",");
    var delayAmount = delayParts[0];
    var delayUnit = delayParts[1] == "h" ? " hr" : delayParts[1] == "m" ? " min" : " sec";
    var delayLockType = delayParts[3];
    var delayEndDate = new Date(delayParts[4], delayParts[5] - 1, delayParts[6], delayParts[7], delayParts[8], delayParts[9], 0);
    var isActive = delayLockType == "none" || delayLockType == "delay" && nowDate < delayEndDate;
    return { isActive: isActive, endDate: delayEndDate, amount: delayAmount, unit: delayUnit, lockType: delayLockType };
}

export function getScheduleLockState(scheduleData, lockData, nowDate) {
    var isScheduleLockActive = false;
    var scheduleLockAdvanceMinutes = 0;
    var scheduleLockAdvanceText = "";
    if (lockData && lockData.indexOf(",") > 0) {
        scheduleLockAdvanceMinutes = parseInt(lockData.replace("schedule,", "").split(",")[0]);
        if (scheduleLockAdvanceMinutes > 0) {
            scheduleLockAdvanceText = " (-" + (scheduleLockAdvanceMinutes > 59 ? scheduleLockAdvanceMinutes / 60 + " hr" : scheduleLockAdvanceMinutes + " min") + ")";
        }
    }
    $.each(scheduleData, function (schedLockIndex, schedLockEntry) {
        var schedStartParts = schedLockEntry.startTime.split(",");
        var schedEndParts = schedLockEntry.endTime.split(",");
        var schedCrossWeek = false;
        var weekStartDate = new Date();
        weekStartDate.setDate(nowDate.getDate() - nowDate.getDay());
        weekStartDate.setHours(0, 0, 0, 0);
        var schedStartDay = parseInt(schedStartParts[0], 10);
        var schedStartTempDate = new Date();
        schedStartTempDate.setDate(nowDate.getDate() - nowDate.getDay() + schedStartDay);
        schedStartTempDate.setHours(schedStartParts[1]);
        schedStartTempDate.setMinutes(schedStartParts[2]);
        schedStartTempDate.setSeconds(0);
        schedStartTempDate.setMilliseconds(0);
        var schedLockStartDate = moment(schedStartTempDate).subtract(scheduleLockAdvanceMinutes, "minutes").toDate();
        if (schedLockStartDate < weekStartDate && nowDate.getDay() != 0) {
            schedLockStartDate = moment(schedLockStartDate).add(7, "days").toDate();
            schedCrossWeek = true;
        }
        var schedEndDay = parseInt(schedEndParts[0], 10);
        var schedLockEndDate = new Date();
        schedLockEndDate.setDate(nowDate.getDate() - nowDate.getDay() + schedEndDay);
        schedLockEndDate.setHours(schedEndParts[1]);
        schedLockEndDate.setMinutes(schedEndParts[2]);
        schedLockEndDate.setSeconds(0);
        schedLockEndDate.setMilliseconds(0);
        if (schedCrossWeek) {
            schedLockEndDate = moment(schedLockEndDate).add(7, "days").toDate();
        }
        if (schedLockStartDate <= nowDate && nowDate < schedLockEndDate) {
            isScheduleLockActive = true;
        }
    });
    return { isActive: isScheduleLockActive, advanceText: scheduleLockAdvanceText };
}

export function getWindowLockState(windowData, nowDate) {
    var windowDays = [0, 1, 2, 3, 4, 5, 6];
    var windowParts = windowData.split("@");
    var windowLockType = windowParts[0];
    if (windowParts[3]) {
        windowDays = windowParts[3].split("");
    }
    var closestTimeRange = getClosestTimeRange(nowDate, windowData);
    var windowStartDate = closestTimeRange[0];
    var windowEndDate = closestTimeRange[1];
    var isActive = false;
    if (windowLockType == "lock") {
        if (nowDate >= windowStartDate && nowDate < windowEndDate) {
            isActive = true;
        }
    } else if (!(nowDate >= windowStartDate) || !(nowDate < windowEndDate)) {
        isActive = true;
    }
    return { isActive: isActive, type: windowLockType, startDate: windowStartDate, endDate: windowEndDate, days: windowDays };
}

export function getLockStrictness(blockData, isUnlocked, isAutostartStrict) {
    if (isAutostartStrict) {
        return AppState.passwordStrict.indexOf("unlock") < 0 ? 2 : 0;
    } else {
        return blockData.enabled == "true" && !isUnlocked && AppState.passwordStrict.indexOf("unlock") < 0 ? 1 : 0;
    }
}

export function isBlockAutostarting(autostartData, nowDate) {
    if (typeof autostartData == "string" && autostartData != "none") {
        if (autostartData.indexOf("time,") == 0) {
            var autostartParts = autostartData.replace("time,", "").split(",");
            var autostartDate = new Date(autostartParts[0], autostartParts[1] - 1, autostartParts[2], autostartParts[3], autostartParts[4], 0, 0);
            if (nowDate < autostartDate) {
                return autostartParts[5] == "true";
            }
        }
    }
    return false;
}

export function getAutostartStrictness(autostartData, nowDate) {
    if (typeof autostartData == "string" && autostartData != "none") {
        if (autostartData.indexOf("time,") == 0) {
            var autostartParts = autostartData.replace("time,", "").split(",");
            var autostartDate = new Date(autostartParts[0], autostartParts[1] - 1, autostartParts[2], autostartParts[3], autostartParts[4], 0, 0);
            if (nowDate < autostartDate) {
                return autostartParts[5] == "true";
            }
        }
    }
    return false;
}
