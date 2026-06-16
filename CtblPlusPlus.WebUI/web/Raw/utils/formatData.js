/**
 * @file formatters.js
 * @layer Utils
 */

import { AppState } from '../store/AppState';
import { formatAMPM, format24 } from './calculateTime';
import { emojiToText, createTextTable } from './formatString';

export function getHumanDate(inputDate) {
  var nowDate = new Date();
  var momentDate = moment(inputDate);
  if (settings.settings.show24hour == "true") {
    if (moment(inputDate).subtract(7, "days").toDate() < nowDate) {
      if (momentDate.year() == nowDate.getFullYear() && momentDate.month() == nowDate.getMonth() && momentDate.date() == nowDate.getDate()) {
        return momentDate.format("HH:mm") + ", today";
      } else {
        return momentDate.format("HH:mm, D MMM");
      }
    } else {
      return momentDate.format("D MMM YYYY");
    }
  } else if (moment(inputDate).subtract(7, "days").toDate() < nowDate) {
    if (momentDate.year() == nowDate.getFullYear() && momentDate.month() == nowDate.getMonth() && momentDate.date() == nowDate.getDate()) {
      return momentDate.format("h:mm a") + ", today";
    } else {
      return momentDate.format("h:mm a, D MMM");
    }
  } else {
    return momentDate.format("D MMM YYYY");
  }
}

export function getAutostartText(autostartValue) {
  if (typeof autostartValue != "string" || autostartValue == "none") {
    return "No autostart set. ";
  } else if (autostartValue.indexOf("time") == 0) {
    var currentDate = new Date();
    var timeParts = autostartValue.replace("time,", "").split(",");
    var autostartDate = new Date(timeParts[0], timeParts[1] - 1, timeParts[2], timeParts[3], timeParts[4]);
    if (currentDate < autostartDate) {
      return "Autostarting at " + getHumanDate(autostartDate) + ". ";
    } else {
      return "No autostart set. ";
    }
  } else if (autostartValue.indexOf("window") == 0) {
    var windowParts = autostartValue.replace("window,", "").split(",");
    var daysString = " every day";
    var windowHour = parseInt(windowParts[0]);
    var windowMinute = parseInt(windowParts[1]);
    var windowDate = new Date();
    windowDate.setHours(windowHour, windowMinute, 0, 0);
    if (windowParts[2].length < 7) {
      var selectedDays = [];
      if (windowParts[2].indexOf("1") >= 0) {
        selectedDays.push("Monday");
      }
      if (windowParts[2].indexOf("2") >= 0) {
        selectedDays.push("Tuesday");
      }
      if (windowParts[2].indexOf("3") >= 0) {
        selectedDays.push("Wednesday");
      }
      if (windowParts[2].indexOf("4") >= 0) {
        selectedDays.push("Thursday");
      }
      if (windowParts[2].indexOf("5") >= 0) {
        selectedDays.push("Friday");
      }
      if (windowParts[2].indexOf("6") >= 0) {
        selectedDays.push("Saturday");
      }
      if (windowParts[2].indexOf("0") >= 0) {
        selectedDays.push("Sunday");
      }
      daysString = " on " + selectedDays.join(", ");
    }
    if (settings.settings.show24hour == "true") {
      return "Autostarting at " + format24(windowDate) + daysString + ". ";
    } else {
      return "Autostarting at " + formatAMPM(windowDate) + daysString + ". ";
    }
  } else if (autostartValue.indexOf("login") == 0) {
    return "Autostarting when affected users sign in. ";
  } else if (autostartValue.indexOf("schedule") == 0) {
    return "Autostarting on the next scheduled block. ";
  }
}

export function getBreakText(breakRule, blockName) {
  var breakText = "No breaks";
  var breakIcon = "coffee";
  var workIcon = "shield";
  if (blockName == "Frozen Turkey" || blockName.indexOf("Frozen Turkey,") == 0) {
    breakIcon = "sign-in";
    workIcon = "sign-out";
  }
  if (breakRule.indexOf("allowance,") == 0) {
    var ruleParts = breakRule.replace("allowance,", "").split(",");
    var allowanceValue = ruleParts[0];
    var allowanceUnit = ruleParts[1] == "h" ? " hr" : " min";
    var allowancePeriod = ruleParts[2];
    if (!isNaN(allowancePeriod)) {
      allowancePeriod = allowancePeriod == "30" ? "30 min" : allowancePeriod == "60" ? "hr" : (parseInt(allowancePeriod) / 60).toString() + " hr";
    } else if (allowancePeriod == "schedule") {
      allowancePeriod = "block";
    }
    breakText = allowanceValue + allowanceUnit + " <i class=\"fa fa-" + breakIcon + "\"></i> /" + allowancePeriod;
  } else if (breakRule.indexOf("reward,") == 0) {
    var ruleParts = breakRule.replace("reward,", "").split(",");
    var workMinutes = ruleParts[0];
    var breakMinutes = ruleParts[1];
    breakText = "+" + breakMinutes + " min <i class=\"fa fa-" + breakIcon + "\"></i> /" + workMinutes + " min <i class=\"fa fa-" + workIcon + "\"></i>";
  } else if (breakRule.indexOf("randomText,") == 0) {
    var rawParts = breakRule.replace("randomText,", "").split(",");
    var ruleParts = rawParts.splice(0, 3);
    ruleParts.push(rawParts.join(","));
    var textLength = ruleParts[0];
    var textBreakDuration = parseInt(ruleParts[1]) > 59 ? parseInt(ruleParts[1]) / 60 + " hr" : parseInt(ruleParts[1]) + " min";
    var textType = ruleParts[2];
    if (textType != "custom") {
      breakText = textLength + " <i class=\"fa fa-random\"></i> chars, " + textBreakDuration + " <i class=\"fa fa-" + breakIcon + "\"></i>";
    } else {
      breakText = "Custom text, " + textBreakDuration + " <i class=\"fa fa-" + breakIcon + "\"></i>";
    }
  } else if (breakRule.indexOf("delay,") == 0) {
    var ruleParts = breakRule.replace("delay,", "").split(",");
    var delayValue = ruleParts[0];
    var delayUnit = ruleParts[1] == "h" ? " hr" : ruleParts[1] == "m" ? " min" : " sec";
    var delayBreakDuration = parseInt(ruleParts[2]) > 59 ? parseInt(ruleParts[2]) / 60 + " hr" : parseInt(ruleParts[2]) + " min";
    breakText = delayValue + delayUnit + " <i class=\"fa fa-hourglass-half\"></i>, " + delayBreakDuration + " <i class=\"fa fa-" + breakIcon + "\"></i>";
  } else if (breakRule.indexOf("sessions,") == 0) {
    var ruleParts = breakRule.replace("sessions,", "").split(",");
    var sessionCount = parseInt(ruleParts[0]);
    var sessionPeriod = ruleParts[1];
    if (!isNaN(sessionPeriod)) {
      sessionPeriod = sessionPeriod == "30" ? "30 min" : sessionPeriod == "60" ? "hr" : (parseInt(sessionPeriod) / 60).toString() + " hr";
    }
    breakText = sessionCount + "x <i class=\"fa fa-" + breakIcon + "\"></i> /" + sessionPeriod;
  } else if (breakRule == "none") {
    breakText = "No breaks";
  } else if (breakRule.indexOf(",") < 0) {
    if (settings.blocks[blockName].type == "scheduled") {
      breakText = breakRule + " min <i class=\"fa fa-" + breakIcon + "\"></i>/block";
    } else {
      breakText = breakRule + " min <i class=\"fa fa-" + breakIcon + "\"></i>/day";
    }
  } else {
    breakText = breakRule.split(",")[0] + " min <i class=\"fa fa-" + workIcon + "\"></i>, " + breakRule.split(",")[1] + " min <i class=\"fa fa-" + breakIcon + "\"></i>";
  }
  return breakText;
}