
import { getMaxZ } from '../Modal/Modal';
import { updateBlocks } from '../../pages/BlocksPage/BlocksPage';
import { updateOverview } from '../../pages/OverviewPage/OverviewPage';
import { AppState } from '../../store/AppState';
import { makeTitleWithBlockName } from '../../utils/formatString';
import { enqueueQueuedDelay } from '../../services/CtblApiClient';

export function requestUnlockDelay(blockName, continueRestrictionsCallback, showRestrictionsButton) {
  var lockParts = settings.blocks[blockName].lock.replace("delay,", "").split(",");
  var delayValue = lockParts[0];
  var delayUnit = lockParts[1] == "h" ? " hr" : " min";
  var delayEndDate = new Date(lockParts[4], lockParts[5] - 1, lockParts[6], lockParts[7], lockParts[8], lockParts[9], 0);
  var isDelayStarted = lockParts[3] == "delay" && new Date() < delayEndDate;
  var displayBlockName = blockName;
  if (blockName.indexOf("Frozen Turkey,") == 0) {
    displayBlockName = blockName.replace("Frozen Turkey,", "");
  } else if (blockName.indexOf("Focused Turkey,") == 0) {
    displayBlockName = blockName.replace("Focused Turkey,", "");
  }
  var $dialogUnlockDelay = $("#dialog-delay");
  $dialogUnlockDelay.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "375px",
    draggable: false,
    title: isDelayStarted ? makeTitleWithBlockName("Unlocking '", displayBlockName, "'", 375) : makeTitleWithBlockName("Start Unlocking '", displayBlockName, "'?", 375),
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogUnlockDelay.dialog("close");
      });
      if (!showRestrictionsButton) {
        $("#btn-continue-delay").hide();
      }
      if (isDelayStarted) {
        $(".dialog-delay-start").hide();
        $(".dialog-delay-started").show();
        moment.relativeTimeThreshold("s", 60);
        moment.relativeTimeThreshold("m", 420);
        moment.relativeTimeThreshold("h", 24);
        $("#dialog-delay-time").text(moment(delayEndDate).toNow(true).toLowerCase().replace("an hour", "1 hour").replace("a minute", "1 minute").replace("a few seconds", "< 1 minute").replace("hour", "hr").replace("minute", "min").replace(/s$/, ""));
        moment.relativeTimeThreshold("s", 45);
        moment.relativeTimeThreshold("m", 45);
        moment.relativeTimeThreshold("h", 22);
      } else {
        $(".dialog-delay-started").hide();
        $(".dialog-delay-start").show();
        $("#dialog-delay-time").text(delayValue + delayUnit);
      }
      $("#dialog-delay-start-button").on("click", function () {
        startDelayUnlock(blockName);
        $dialogUnlockDelay.dialog("close");
        requestUnlockDelay(blockName, continueRestrictionsCallback, showRestrictionsButton);
      });
      $("#dialog-delay-stop-button").on("click", function () {
        cancelDelayUnlock(blockName);
        $dialogUnlockDelay.dialog("close");
        requestUnlockDelay(blockName, continueRestrictionsCallback, showRestrictionsButton);
      });
    },
    close: function () {
      $("#dialog-delay-start-button").off("click");
      $("#dialog-delay-stop-button").off("click");
      $dialogUnlockDelay.hide();
      $dialogUnlockDelay.dialog("destroy");
    },
    buttons: {
      Close: {
        class: "btn-grey-dialog",
        text: "Close",
        click: function () {
          $dialogUnlockDelay.dialog("close");
        }
      },
      "Continue with restrictions": {
        id: "btn-continue-delay",
        class: "btn-green-dialog",
        text: "Continue with restrictions",
        click: function () {
          $dialogUnlockDelay.dialog("close");
          continueRestrictionsCallback();
        }
      }
    }
  }).show();
}
export function startDelayUnlock(blockName) {
  if (settings.blocks[blockName].lock.indexOf("delay,") == 0 && settings.blocks[blockName].lock.indexOf(",delay,") < 0) {
    var lockParts = settings.blocks[blockName].lock.replace("delay,", "").split(",");
    var delayValue = lockParts[0];
    var delayUnit = lockParts[1];
    var lockPart3 = lockParts[2];
    var endDate = moment().add(parseInt(delayValue), lockParts[1] == "h" ? "hours" : "minutes").toDate();
    var endDateString = endDate.getFullYear().toString() + "," + (endDate.getMonth() + 1).toString() + "," + endDate.getDate().toString() + "," + endDate.getHours().toString() + "," + endDate.getMinutes().toString() + "," + endDate.getSeconds().toString();
    settings.blocks[blockName].lock = "delay," + delayValue + "," + delayUnit + "," + lockPart3 + ",delay," + endDateString;
    save();
    updateBlocks(false);
    updateOverview();
  }
}
export function cancelDelayUnlock(blockName) {
  if (settings.blocks[blockName].lock.indexOf("delay,") == 0 && settings.blocks[blockName].lock.indexOf(",delay,") > 0) {
    var lockParts = settings.blocks[blockName].lock.replace("delay,", "").split(",");
    var delayValue = lockParts[0];
    var delayUnit = lockParts[1];
    var lockPart3 = lockParts[2];
    settings.blocks[blockName].lock = "delay," + delayValue + "," + delayUnit + "," + lockPart3 + ",none,0,0,0,0,0,0";
    save();
    updateBlocks(false);
    updateOverview();
  }
}
export function startDelayBreak(blockName, scheduleId) {
  var breakLock;
  if (scheduleId == undefined) {
    breakLock = settings.blocks[blockName].break;
  } else {
    $.each(settings.blocks[blockName].schedule, function (scheduleIndex, scheduleEntry) {
      if (scheduleEntry.id == scheduleId) {
        breakLock = scheduleEntry.break;
        return false;
      }
    });
  }
  if (breakLock != undefined && breakLock.indexOf("delay,") == 0 && breakLock.indexOf(",delay,") < 0) {
    var breakParts = breakLock.replace("delay,", "").split(",");
    var delayValue = breakParts[0];
    var delayUnit = breakParts[1];
    var breakDuration = breakParts[2];
    var endDate = moment().add(parseInt(delayValue), breakParts[1] == "h" ? "hours" : breakParts[1] == "m" ? "minutes" : "seconds").add(parseInt(breakDuration), "minutes").toDate();
    var endDateString = endDate.getFullYear().toString() + "," + (endDate.getMonth() + 1).toString() + "," + endDate.getDate().toString() + "," + endDate.getHours().toString() + "," + endDate.getMinutes().toString() + "," + endDate.getSeconds().toString();
    var newBreakLock = "delay," + delayValue + "," + delayUnit + "," + breakDuration + ",delay," + endDateString;
    if (scheduleId == undefined) {
      settings.blocks[blockName].break = newBreakLock;
    } else {
      $.each(settings.blocks[blockName].schedule, function (scheduleIndex2, scheduleEntry2) {
        if (scheduleEntry2.id == scheduleId) {
          settings.blocks[blockName].schedule[scheduleIndex2].break = newBreakLock;
          return false;
        }
      });
    }
    save();
    updateBlocks(false);
    updateOverview();
  }
}
export function cancelDelayBreak(blockName, scheduleId) {
  var breakLock;
  if (scheduleId == undefined) {
    breakLock = settings.blocks[blockName].break;
  } else {
    $.each(settings.blocks[blockName].schedule, function (scheduleIndex, scheduleEntry) {
      if (scheduleEntry.id == scheduleId) {
        breakLock = scheduleEntry.break;
        return false;
      }
    });
  }
  if (breakLock != undefined && breakLock.indexOf("delay,") == 0 && breakLock.indexOf(",delay,") > 0) {
    var breakParts = breakLock.replace("delay,", "").split(",");
    var delayValue = breakParts[0];
    var delayUnit = breakParts[1];
    var breakDuration = breakParts[2];
    var newBreakLock = "delay," + delayValue + "," + delayUnit + "," + breakDuration + ",none,0,0,0,0,0,0";
    if (scheduleId == undefined) {
      settings.blocks[blockName].break = newBreakLock;
    } else {
      $.each(settings.blocks[blockName].schedule, function (scheduleIndex2, scheduleEntry2) {
        if (scheduleEntry2.id == scheduleId) {
          settings.blocks[blockName].schedule[scheduleIndex2].break = newBreakLock;
          return false;
        }
      });
    }
    save();
    updateBlocks(false);
    updateOverview();
  }
}

export function requestUnlockQueuedDelay(blockName, continueRestrictionsCallback, showRestrictionsButton) {
  var displayBlockName = blockName;
  if (blockName.indexOf("Frozen Turkey,") == 0) {
    displayBlockName = blockName.replace("Frozen Turkey,", "");
  } else if (blockName.indexOf("Focused Turkey,") == 0) {
    displayBlockName = blockName.replace("Focused Turkey,", "");
  }
  
  var $dialogUnlockDelay = $("#dialog-delay");
  $dialogUnlockDelay.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "375px",
    draggable: false,
    title: makeTitleWithBlockName("Start Unlocking '", displayBlockName, "'?", 375),
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogUnlockDelay.dialog("close");
      });
      if (!showRestrictionsButton) {
        $("#btn-continue-delay").hide();
      }
      
      // We don't have a started state visually in this dialog yet for Queued Delays, 
      // because we're just enqueueing. Once it starts, it's processed by the backend.
      $(".dialog-delay-started").hide();
      $(".dialog-delay-start").show();
      $("#dialog-delay-time").text("CTBL++ Queue");
      
      $("#dialog-delay-start-button").off("click").on("click", function () {
        $dialogUnlockDelay.dialog("close");
        enqueueQueuedDelay(blockName).then(function() {
            // UI feedback
            alert("Unlock request added to CTBL++ Queue! You will be notified when it unlocks.");
            continueRestrictionsCallback();
        });
      });
      
      $("#dialog-delay-stop-button").hide(); // cannot stop a queued delay easily from UI right now
    },
    close: function () {
      $("#dialog-delay-start-button").off("click");
      $("#dialog-delay-stop-button").off("click");
      $dialogUnlockDelay.hide();
      $dialogUnlockDelay.dialog("destroy");
    },
    buttons: {
      Close: {
        class: "btn-grey-dialog",
        text: "Close",
        click: function () {
          $dialogUnlockDelay.dialog("close");
        }
      },
      "Continue with restrictions": {
        id: "btn-continue-delay",
        class: "btn-green-dialog",
        text: "Continue with restrictions",
        click: function () {
          $dialogUnlockDelay.dialog("close");
          continueRestrictionsCallback();
        }
      }
    }
  }).show();
}
