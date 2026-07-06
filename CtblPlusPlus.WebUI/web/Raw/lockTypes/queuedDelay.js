/**
 * @file queuedDelay.js
 * @description Lock-type descriptor for "Queued Delay" — a CTBL++ extension
 * lock type implemented as lock="password" + password="CTBL_QUEUED_DELAY"
 * (see extensionTypes.js). Consolidates logic previously duplicated across
 * blockStateCalculator.js, OverviewRenderers.js, BlockModalDialogs.js,
 * ListEditorPage.js, LockEditorPage.js, SecurityModal.js and
 * UnlockDelayModal.js.
 */

import { AppState } from '../store/AppState';
import { toHtml } from '../utils/formatString';
import { isExtensionLock } from './extensionTypes';
import { getQueuedDelayDetails, getListQueueEntries, toggleQueuedDelay,
         getBlockConfigQueue, getScheduleChangeQueue } from '../services/CtblApiClient.js';
import { requestUnlockQueuedDelay } from '../components/UnlockDelayModal/UnlockDelayModal';
import { registerLockType } from './registry';

var EXTENSION_ID = "queuedDelay";

function isCurrentlyQueued(blockName) {
  return !!(AppState.queuedDelays && AppState.queuedDelays.indexOf(blockName) > -1);
}

function isConfiguredQueuedDelay(blockName, blockData) {
  return isExtensionLock(blockData, EXTENSION_ID) &&
    !!(AppState.configuredQueuedDelays && AppState.configuredQueuedDelays.indexOf(blockName) > -1);
}

// Broad check used by findLockType(): true if this block is acting as (or
// is currently mid-unlock as) a queued-delay block. Mirrors the combined
// condition previously duplicated in blockStateCalculator.js.
function matches(blockName, blockData) {
  return isCurrentlyQueued(blockName) || isConfiguredQueuedDelay(blockName, blockData);
}

// Narrow check: true only if the block's *current* lock config is the
// queued-delay sentinel. Used where the original code checked
// `blockData.password === "CTBL_QUEUED_DELAY"` directly.
function isExtensionMatch(blockData) {
  return isExtensionLock(blockData, EXTENSION_ID);
}

function getDisplayState(blockName, blockData) {
  return matches(blockName, blockData) ? "Queued Delay" : null;
}

function getLockText(blockName, blockData) {
  return isExtensionMatch(blockData) ? "Queued delay" : null;
}

function getLockedWarning(blockName, blockData) {
  return isExtensionMatch(blockData) ? "With a Queued Delay" : null;
}

function formatTimeLeft(unlockAt) {
  var minLeft = Math.max(0, Math.ceil((new Date(unlockAt) - new Date()) / 60000));
  return minLeft < 1 ? "in < 1 min." : "in " + minLeft + " min.";
}

function renderPendingEntry(id, label, unlockAt, entryType) {
  return '<div class="custom-option" onmousedown="customSelect(this, event)" '
    + 'data-value="' + toHtml(id) + '" '
    + 'data-request-id="' + toHtml(id) + '" '
    + 'data-entry-type="' + entryType + '">'
    + toHtml(label) + ' - ' + formatTimeLeft(unlockAt) + '</div>';
}

function describeLockType(lock, password) {
  if (!lock || lock === "none") return "No lock";
  if (lock === "password") return password === "CTBL_QUEUED_DELAY" ? "Queued delay" : "Password lock";
  if (lock === "randomText") return "Random text lock";
  if (lock === "delay") return "Delay lock";
  if (lock === "window") return "Window lock";
  if (lock === "schedule") return "Schedule lock";
  if (lock === "timer") return "Timer lock";
  return lock;
}

function describeBreak(breakStr) {
  if (!breakStr || breakStr === "none") return "None";
  if (breakStr.indexOf("allowance,") === 0) {
    var parts = breakStr.split(",");
    var amt = parseInt(parts[1], 10);
    var unit = parts[2] === "h" ? "hr" : "min";
    var period = parts[3] || "day";
    return amt + " " + unit + "/" + period + " allowance";
  }
  if (breakStr.indexOf("delay,") === 0) {
    var dParts = breakStr.split(",");
    var dAmt = parseInt(dParts[1], 10);
    var dUnit = dParts[2] === "h" ? "hr" : dParts[2] === "s" ? "sec" : "min";
    return dAmt + " " + dUnit + " delay";
  }
  if (breakStr.indexOf("randomText,") === 0) return "Random text";
  if (breakStr.indexOf("sessions,") === 0) {
    var sParts = breakStr.split(",");
    return sParts[1] + " sessions";
  }
  if (breakStr.indexOf("reward,") === 0) return "Reward";
  if (!isNaN(parseInt(breakStr.split(",")[0], 10))) {
    return parseInt(breakStr.split(",")[0], 10) + " min pomodoro";
  }
  return breakStr;
}

function describeAutostart(autostartStr) {
  if (!autostartStr || autostartStr === "none") return "None";
  if (autostartStr === "login") return "On login";
  if (autostartStr === "schedule") return "On schedule";
  if (autostartStr.indexOf("time,") === 0) {
    var tParts = autostartStr.replace("time,", "").split(",");
    if (tParts.length >= 5) {
      var h = parseInt(tParts[3], 10), m = parseInt(tParts[4], 10);
      var hh = h < 10 ? "0" + h : "" + h, mm = m < 10 ? "0" + m : "" + m;
      return "At " + hh + ":" + mm + " on " + tParts[2] + "/" + tParts[1] + "/" + tParts[0];
    }
  }
  if (autostartStr.indexOf("window,") === 0) return "In window";
  return autostartStr;
}

function describeScheduleType(type, scheduleArr) {
  var label = type === "continuous" ? "Continuous" : "Scheduled";
  if (type !== "continuous" && Array.isArray(scheduleArr)) {
    label += " (" + scheduleArr.length + ")";
  }
  return label;
}

function buildBlockConfigLines(payload, blockName) {
  var cur = (typeof settings !== "undefined" && settings.blocks && settings.blocks[blockName]) || {};
  var lines = [];

  if (payload.lock !== undefined) {
    var beforeLock = describeLockType(cur.lock, cur.password);
    var afterPassword = payload.password !== undefined ? payload.password : cur.password;
    var afterLock = describeLockType(payload.lock, afterPassword);
    if (beforeLock !== afterLock) lines.push("Lock: " + beforeLock + " → " + afterLock);
  }
  if (payload.lockUnblock !== undefined && payload.lockUnblock !== cur.lockUnblock) {
    lines.push("Unblock when locked: " + (cur.lockUnblock === "true" ? "yes" : "no")
      + " → " + (payload.lockUnblock === "true" ? "yes" : "no"));
  }
  if (payload.restartUnblock !== undefined && payload.restartUnblock !== cur.restartUnblock) {
    lines.push("Restart to unblock: " + (cur.restartUnblock === "true" ? "yes" : "no")
      + " → " + (payload.restartUnblock === "true" ? "yes" : "no"));
  }
  if (payload.randomTextLength !== undefined && payload.randomTextLength !== cur.randomTextLength) {
    lines.push("Random text config: updated");
  }
  if (payload.window !== undefined && payload.window !== cur.window) {
    lines.push("Window config: updated");
  }
  if (payload.break !== undefined && payload.break !== cur.break) {
    lines.push("Break: " + describeBreak(cur.break) + " → " + describeBreak(payload.break));
  }

  return lines.length > 0 ? lines : ["Lock config change"];
}

function buildScheduleChangeLines(payload, blockName) {
  var cur = (typeof settings !== "undefined" && settings.blocks && settings.blocks[blockName]) || {};
  var lines = [];

  var typeInPayload = payload.type !== undefined;
  var schedInPayload = Array.isArray(payload.schedule);
  if (typeInPayload || schedInPayload) {
    var beforeDesc = describeScheduleType(cur.type || "continuous", cur.schedule);
    var afterDesc = describeScheduleType(
      typeInPayload ? payload.type : (cur.type || "continuous"),
      schedInPayload ? payload.schedule : cur.schedule
    );
    if (beforeDesc !== afterDesc) lines.push("Type: " + beforeDesc + " → " + afterDesc);
  }
  if (payload.autostart !== undefined && payload.autostart !== cur.autostart) {
    lines.push("Autostart: " + describeAutostart(cur.autostart) + " → " + describeAutostart(payload.autostart));
  }
  if (payload.enabled !== undefined && payload.enabled !== cur.enabled) {
    lines.push("Enabled: " + (cur.enabled === "true" ? "yes" : "no")
      + " → " + (payload.enabled === "true" ? "yes" : "no"));
  }

  return lines.length > 0 ? lines : ["Schedule change"];
}

function getQueueListEntries(blockName) {
  return $.when(
    getQueuedDelayDetails(),
    getListQueueEntries(blockName),
    getBlockConfigQueue(blockName),
    getScheduleChangeQueue(blockName)
  ).then(function (unlockDetails, listActions, blockConfig, scheduleChange) {
    var html = "";

    var myUnlocks = unlockDetails.filter(function (d) { return d.BlockName === blockName; });
    myUnlocks.forEach(function (q) {
      html += '<div class="custom-option" onmousedown="customSelect(this, event)" '
            + 'data-value="' + toHtml(blockName).replace(/"/g, "&quot;") + '" '
            + 'data-entry-type="block-unlock">'
            + toHtml(blockName) + ' - Unlocking - ' + formatTimeLeft(q.UnlockAt) + '</div>';
    });

    listActions.forEach(function (entry) {
      var displayUrl, actionLabel;
      if (entry.TargetUrl.indexOf("REMOVE|") === 0) {
        displayUrl = entry.TargetUrl.substring(7);
        actionLabel = "Removing";
      } else if (entry.TargetUrl.indexOf("REMOVE_APP|") === 0) {
        displayUrl = entry.TargetUrl.substring(11);
        actionLabel = "Removing App";
      } else {
        displayUrl = entry.TargetUrl;
        actionLabel = "Adding Exception";
      }
      html += '<div class="custom-option" onmousedown="customSelect(this, event)" '
            + 'data-value="' + toHtml(entry.Id) + '" '
            + 'data-request-id="' + toHtml(entry.Id) + '" '
            + 'data-entry-type="list-action">'
            + toHtml(displayUrl) + ' - ' + actionLabel + ' - ' + formatTimeLeft(entry.UnlockAt) + '</div>';
    });

    if (blockConfig) {
      var bcLabel;
      try {
        var bcPayload = JSON.parse(blockConfig.TargetUrl.substring("BLOCK_CONFIG|".length));
        bcLabel = buildBlockConfigLines(bcPayload, blockName).join(", ");
      } catch (e) {
        bcLabel = "Lock config change";
      }
      html += renderPendingEntry(blockConfig.Id, bcLabel, blockConfig.UnlockAt, "block-config");
    }
    if (scheduleChange) {
      var scLabel;
      try {
        var scPayload = JSON.parse(scheduleChange.TargetUrl.substring("SCHEDULE_CHANGE|".length));
        scLabel = buildScheduleChangeLines(scPayload, blockName).join(", ");
      } catch (e) {
        scLabel = "Schedule change";
      }
      html += renderPendingEntry(scheduleChange.Id, scLabel, scheduleChange.UnlockAt, "schedule-change");
    }

    if (html === "") {
      return "<div style='padding: 15px; text-align: center; opacity: 0.7;'>No pending actions for this block.</div>";
    }
    return html;
  });
}

// LockEditorPage.open() uses this to decide whether to switch the editor
// into the "queuedDelay" tab for an already-configured block.
function getEditorLockMode(blockName, blockData) {
  return isConfiguredQueuedDelay(blockName, blockData) ? EXTENSION_ID : null;
}

function parseEditorState(currentLock) {
  var queuedDelayUnblock;
  if (currentLock.indexOf(",") > 0) {
    var qParts = currentLock.replace(EXTENSION_ID + ",", "").split(",");
    queuedDelayUnblock = qParts[0] == "true";
  } else {
    queuedDelayUnblock = false;
  }
  return { queuedDelayUnblock: queuedDelayUnblock };
}

function bindEditorUI(parsed) {
  $("#queuedDelay_unblock").prop("checked", parsed.queuedDelayUnblock);
}

function buildLockConfig() {
  return EXTENSION_ID + "," + $("#queuedDelay_unblock").is(":checked").toString();
}

// Called from LockEditorPage's applyAndSave() when the user saved with the
// "queuedDelay" tab active. Returns the host lock/password to persist and
// applies the queued-delay-specific side effects (toggle + AppState list).
function onSave(blockName) {
  toggleQueuedDelay(blockName, true);
  if (AppState.configuredQueuedDelays && AppState.configuredQueuedDelays.indexOf(blockName) === -1) {
    AppState.configuredQueuedDelays.push(blockName);
  }
  return { lock: "password", password: "CTBL_QUEUED_DELAY" };
}

function requestUnlock(blockName, ctx) {
  requestUnlockQueuedDelay(blockName, ctx.continueRestrictionsCallback, ctx.showRestrictionsButton);
}

export var queuedDelayLockType = {
  id: EXTENSION_ID,
  matches: matches,
  isExtensionMatch: isExtensionMatch,
  getDisplayState: getDisplayState,
  getLockText: getLockText,
  getLockedWarning: getLockedWarning,
  getQueueListEntries: getQueueListEntries,
  getEditorLockMode: getEditorLockMode,
  parseEditorState: parseEditorState,
  bindEditorUI: bindEditorUI,
  buildLockConfig: buildLockConfig,
  onSave: onSave,
  requestUnlock: requestUnlock
};

registerLockType(queuedDelayLockType);
