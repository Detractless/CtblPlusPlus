
import { resetPomodoro } from '../components/BlockModal/BlockModalDialogs';
import { requestBreakRandomText, cancelBreakRandomText } from '../components/RandomTextBreakModal/RandomTextBreakModal';
import { toHtml, capitalizeFirstLetter } from './formatString';
import { startDelayBreak, cancelDelayBreak } from '../components/UnlockDelayModal/UnlockDelayModal';
import { refreshAllowances } from '../services/breakManager';
import { AppState } from '../store/AppState';
import { getBreakText } from './formatData';

export function getBreakStatusText(blockData, blockName, breakDataString, allowances, iconClass, breakIconClass, isScheduled, schedItemId, specialSeconds, nowDate) {
    var breakText = "";
    var breakTextCopy = "";
    var refreshLinkHTML = " <a class=\"list-link action-refresh-allowances\" title=\"Refresh usage based break...\"><i class=\"fa fa-refresh\"></i></a>";

    if (breakDataString.indexOf("allowance,") == 0) {
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
            breakText = getBreakText(breakDataString, blockName);
        }
        breakTextCopy = breakText;
    } else if (breakDataString.indexOf("reward,") == 0) {
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
            breakText = getBreakText(breakDataString, blockName);
        }
        breakTextCopy = breakText;
    } else if (breakDataString.indexOf("randomText,") == 0) {
        var randomTextParts = breakDataString.replace("randomText,", "").split(",");
        var delayParts = randomTextParts.splice(0, 12);
        delayParts.push(randomTextParts.join(","));
        var randomLength = delayParts[0];
        var breakDurationDesc = parseInt(delayParts[1]) > 59 ? parseInt(delayParts[1]) / 60 + " hr" : parseInt(delayParts[1]) + " min";
        var randomType = delayParts[2];
        var isRandomTextBreak = delayParts[3] == "break";
        var randomTextTarget = new Date(delayParts[4], delayParts[5] - 1, delayParts[6], delayParts[7], delayParts[8], delayParts[9], 0);
        
        var dataArgs = "data-blockname=\"" + toHtml(blockName).replace(/"/g, "&quot;") + "\"";
        if (isScheduled && schedItemId) {
            dataArgs += " data-scheditemid=\"" + toHtml(schedItemId).replace(/"/g, "&quot;") + "\"";
        }

        if (isRandomTextBreak && nowDate < randomTextTarget) {
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
            breakTextCopy = getBreakText(breakDataString, blockName);
        }
    } else if (breakDataString.indexOf("delay,") == 0) {
        var delayParts = breakDataString.replace("delay,", "").split(",");
        var delayLockDuration = delayParts[0];
        var delayLockUnit = delayParts[1] == "h" ? " hr" : delayParts[1] == "m" ? " min" : " sec";
        var delayBreakDurationDesc = parseInt(delayParts[2]) > 59 ? (parseInt(delayParts[2]) / 60).toString() + " hr" : parseInt(delayParts[2]).toString() + " min";
        var delayLockMode = delayParts[3] == "delay" ? true : false;
        var randomTextTarget = new Date(delayParts[4], delayParts[5] - 1, delayParts[6], delayParts[7], delayParts[8], delayParts[9], 0);
        var delayBreakStartTarget = moment(randomTextTarget).subtract(parseInt(delayParts[2]), "minutes").toDate();
        
        var dataArgs = "data-blockname=\"" + toHtml(blockName).replace(/"/g, "&quot;") + "\"";
        if (isScheduled && schedItemId) {
            dataArgs += " data-scheditemid=\"" + toHtml(schedItemId).replace(/"/g, "&quot;") + "\"";
        }

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
            breakTextCopy = getBreakText(breakDataString, blockName);
        }
    } else if (breakDataString.indexOf("sessions,") == 0) {
        if (typeof AppState.allowances[blockName] != "undefined") {
            var allowanceSecs = parseInt(AppState.allowances[blockName]);
            if (allowanceSecs != 0) {
                breakText = AppState.allowances[blockName] + " <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
            } else {
                breakText = "No <i class=\"fa fa-" + breakIconClass + "\"></i> left" + refreshLinkHTML;
            }
        } else {
            breakText = getBreakText(breakDataString, blockName);
        }
        breakTextCopy = breakText;
    } else if (breakDataString == "none") {
        breakText = "No breaks";
        breakTextCopy = breakText;
    } else if (breakDataString.indexOf(",") < 0) {
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
            breakText = getBreakText(breakDataString, blockName);
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
        var pomodoroWorkMin = parseInt(breakDataString.split(",")[0]);
        var pomodoroBreakMin = parseInt(breakDataString.split(",")[1]);
        var pomodoroTotalMin = pomodoroWorkMin + pomodoroBreakMin;
        var pomodoroElapsedMin = parseInt(Math.floor(moment.duration(moment(nowDate).diff(pomodoroStartTarget)).asMinutes()));
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
