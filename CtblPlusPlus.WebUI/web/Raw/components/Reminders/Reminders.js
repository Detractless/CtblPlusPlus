

import { AppState } from '../../store/AppState';

export function updateReminders() {
  var nowDate = new Date();
  var hasEnabledBlocks = false;
  var hasLockedBlocks = false;
  var hasEmptySchedule = false;
  $.each(settings.blocks, function (blockName, blockData) {
    if (blockData.enabled == "true") {
      hasEnabledBlocks = true;
      if (blockData.lock != "none") {
        hasLockedBlocks = true;
      } else if ((blockName == "Frozen Turkey" || blockName.indexOf("Frozen Turkey,") == 0) && blockData.timer.indexOf(",") > 0) {
        var timerParts = blockData.timer.split(",");
        var timerDate = new Date(timerParts[0], timerParts[1] - 1, timerParts[2], timerParts[3], timerParts[4], 0, 0);
        if (nowDate < timerDate) {
          hasLockedBlocks = true;
        }
      }
      if (blockData.type == "scheduled" && blockData.schedule.length == 0) {
        hasEmptySchedule = true;
      }
    }
  });
  if (hasEnabledBlocks && !hasLockedBlocks && AppState.passwordStrict.indexOf("lock") < 0 && settings.settings.showNoLockSet == "true") {
    $("#sidebar-button-lock-block").show();
  } else {
    $("#sidebar-button-lock-block").hide();
  }
  if (hasEmptySchedule && settings.settings.showNoSchedule == "true") {
    $("#sidebar-button-empty-schedule").show();
  } else {
    $("#sidebar-button-empty-schedule").hide();
  }
}
