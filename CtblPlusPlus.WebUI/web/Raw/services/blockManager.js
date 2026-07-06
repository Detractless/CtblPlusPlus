
import { editAutostart } from '../components/AutostartEditor/AutostartEditor';
import { showBlockLockedWarning } from '../components/BlockModal/BlockModalDialogs';
import { ensureStatsEnabled } from '../components/StatsEnabler/StatsEnabler';
import { updateBlocks } from '../pages/BlocksPage/BlocksPage';
import { AppState } from '../store/AppState';
import { zeroDate } from '../utils/calculateTime';

export function toggleBlock(blockId, enableState) {
  if (settings.blocks[blockId].enabled == "false") {
    var isLocked = settings.blocks[blockId].lock != "none";
    if (isLocked && !isNaN(settings.blocks[blockId].lock.split(",")[0])) {
      var currentDate = new Date();
      var lockParts = settings.blocks[blockId].lock.split(",");
      var lockDate = new Date(lockParts[0], lockParts[1] - 1, lockParts[2], lockParts[3], lockParts[4], 0, 0);
      if (currentDate >= lockDate) {
        isLocked = false;
      }
    }
    if (isLocked) {
      ensureStatsEnabled(blockId, true, function () {
        showBlockLockedWarning(blockId, function () {
          var lockStartDate = new Date();
          var lockStartTime = lockStartDate.getFullYear().toString() + "," + (lockStartDate.getMonth() + 1).toString() + "," + lockStartDate.getDate().toString() + "," + lockStartDate.getHours().toString() + "," + lockStartDate.getMinutes().toString();
          settings.blocks[blockId].startTime = lockStartTime;
          settings.blocks[blockId].enabled = "true";
          if (!settings.blocks[blockId].autostart || settings.blocks[blockId].autostart && settings.blocks[blockId].autostart.indexOf("time,") == 0) {
            settings.blocks[blockId].autostart = "none";
          }
          if (settings.blocks[blockId].lock.indexOf("delay,") == 0) {
            settings.blocks[blockId].lock = settings.blocks[blockId].lock.replace("unlocked", "none");
          }
          if (settings.blocks[blockId].break.indexOf("randomText,") == 0 || settings.blocks[blockId].break.indexOf("delay,") == 0) {
            settings.blocks[blockId].break = zeroDate(settings.blocks[blockId].break);
          }
          $.each(settings.blocks[blockId].schedule, function (scheduleIndex, scheduleEntry) {
            if (scheduleEntry.break.indexOf("randomText,") == 0 || scheduleEntry.break.indexOf("delay,") == 0) {
              scheduleEntry.break = zeroDate(scheduleEntry.break);
            }
          });
          $.each(AppState.unlockedBlocks, function (unlockedIndex, unlockedItem) {
            if (unlockedItem.indexOf(blockId + "\\") == 0) {
              AppState.unlockedBlocks.splice(unlockedIndex, 1);
            }
          });
          updateBlocks(false);
          save();
        });
      });
    } else {
      ensureStatsEnabled(blockId, false, function () {
        var enableDate = new Date();
        var enableStartTime = enableDate.getFullYear().toString() + "," + (enableDate.getMonth() + 1).toString() + "," + enableDate.getDate().toString() + "," + enableDate.getHours().toString() + "," + enableDate.getMinutes().toString();
        settings.blocks[blockId].startTime = enableStartTime;
        settings.blocks[blockId].enabled = "true";
        if (!settings.blocks[blockId].autostart || settings.blocks[blockId].autostart && settings.blocks[blockId].autostart.indexOf("time,") == 0) {
          settings.blocks[blockId].autostart = "none";
        }
        if (settings.blocks[blockId].break.indexOf("randomText,") == 0 || settings.blocks[blockId].break.indexOf("delay,") == 0) {
          settings.blocks[blockId].break = zeroDate(settings.blocks[blockId].break);
        }
        $.each(settings.blocks[blockId].schedule, function (scheduleIndex2, scheduleEntry2) {
          if (scheduleEntry2.break.indexOf("randomText,") == 0 || scheduleEntry2.break.indexOf("delay,") == 0) {
            scheduleEntry2.break = zeroDate(scheduleEntry2.break);
          }
        });
        updateBlocks(false);
        save();
      });
    }
  } else if (enableState == "false") {
    var currentDate = new Date();
    var disableStartTime = currentDate.getFullYear().toString() + "," + (currentDate.getMonth() + 1).toString() + "," + currentDate.getDate().toString() + "," + currentDate.getHours().toString() + "," + currentDate.getMinutes().toString();
    settings.blocks[blockId].startTime = disableStartTime;
    settings.blocks[blockId].enabled = "false";
    if (settings.blocks[blockId].autostart && settings.blocks[blockId].autostart.indexOf("time,") == 0) {
      var autostartParts = settings.blocks[blockId].autostart.replace("time,", "").split(",");
      var autostartDate = new Date(autostartParts[0], autostartParts[1] - 1, autostartParts[2], autostartParts[3], autostartParts[4], 0, 0);
      var currentDate = new Date();
      if (moment(autostartDate).isBefore(currentDate)) {
        settings.blocks[blockId].autostart = "none";
      }
    }
    updateBlocks(false);
    save();
    if (settings.settings.showAutostart == "true" && (!settings.blocks[blockId].autostart || settings.blocks[blockId].autostart == "none")) {
      editAutostart(blockId, "false");
    }
  }
}
export function disableDeviceBlock(blockId) {
  var currentDate = new Date();
  var disableStartTime = currentDate.getFullYear().toString() + "," + (currentDate.getMonth() + 1).toString() + "," + currentDate.getDate().toString() + "," + currentDate.getHours().toString() + "," + currentDate.getMinutes().toString();
  settings.blocks[blockId].startTime = disableStartTime;
  settings.blocks[blockId].enabled = "false";
  settings.blocks[blockId].timer = "";
  updateBlocks(false);
  save();
}

export function performDuplicateList(blockName, newBlockName, blockPrefix) {
  var newBlockData = {
    enabled: "false"
  };
  if (settings.blocks[blockName].autostart.indexOf("time,") == 0) {
    newBlockData.autostart = settings.blocks[blockName].autostart.replace(",true", ",false");
  } else {
    newBlockData.autostart = settings.blocks[blockName].autostart;
  }
  newBlockData.type = settings.blocks[blockName].type;
  newBlockData.startTime = settings.blocks[blockName].startTime;
  newBlockData.pomodoroTime = settings.blocks[blockName].pomodoroTime;
  newBlockData.timer = settings.blocks[blockName].timer;
  newBlockData.lock = settings.blocks[blockName].lock;
  newBlockData.lockUnblock = settings.blocks[blockName].lockUnblock;
  newBlockData.restartUnblock = settings.blocks[blockName].restartUnblock;
  newBlockData.break = settings.blocks[blockName].break;
  newBlockData.password = settings.blocks[blockName].password;
  newBlockData.randomTextLength = settings.blocks[blockName].randomTextLength;
  newBlockData.window = settings.blocks[blockName].window;
  newBlockData.users = settings.blocks[blockName].users;
  newBlockData.web = settings.blocks[blockName].web.slice();
  newBlockData.exceptions = settings.blocks[blockName].exceptions.slice();
  newBlockData.apps = settings.blocks[blockName].apps.slice();
  newBlockData.schedule = settings.blocks[blockName].schedule.slice();
  newBlockData.customUsers = settings.blocks[blockName].customUsers.slice();
  settings.blocks[blockPrefix + newBlockName] = newBlockData;
  updateBlocks(false);
  save();
}

export function performDeleteLists(listType) {
  $.each(settings.blocks, function (blockName, blockData) {
    if (listType == "frozen" && (blockName == "Frozen Turkey" || blockName.indexOf("Frozen Turkey,") == 0) || listType == "focused" && blockName.indexOf("Focused Turkey,") == 0 || listType == "block" && blockName != "Frozen Turkey" && blockName.indexOf("Focused Turkey,") != 0 && blockName.indexOf("Frozen Turkey,") != 0) {
      if (blockData.enabled == "false") {
        if (typeof blockData.autostart != "string" || blockData.autostart == "none") {
          delete settings.blocks[blockName];
        }
      }
    }
  });
  updateBlocks(false);
  save();
}
