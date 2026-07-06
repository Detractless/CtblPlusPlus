
import { updateOverview } from '../pages/OverviewPage/OverviewPage';
import { AppState } from '../store/AppState';

export function isTodayButAfterNow(targetDate1) {
  var nowDate2 = new Date();
  if (targetDate1 == undefined) {
    return false;
  }
  return targetDate1 > nowDate2 && targetDate1.getFullYear() === nowDate2.getFullYear() && targetDate1.getMonth() === nowDate2.getMonth() && targetDate1.getDate() === nowDate2.getDate();
}
export function isToday(targetDate2) {
  var nowDate3 = new Date();
  if (targetDate2 == undefined) {
    return false;
  }
  return targetDate2.getFullYear() === nowDate3.getFullYear() && targetDate2.getMonth() === nowDate3.getMonth() && targetDate2.getDate() === nowDate3.getDate();
}

export function refreshAllowances() {
  window.external.CalculateAllowances();
  AppState.allowances = JSON.parse(window.external.SendAllowanceUpdate());
  updateOverview();
}
