
import { AppState } from '../store/AppState';
import { getHumanDate} from './formatData';
import { formatAMPM, format24 } from './calculateTime';

export function getAutostartText(autostartValue, settings) {
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
    if (settings && settings.settings.show24hour == "true") {
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
