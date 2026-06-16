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
import { getQueuedDelayDetails, getListQueueEntries, toggleQueuedDelay } from '../services/CtblApiClient.js';
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

function getQueueListEntries(blockName) {
  return $.when(
    getQueuedDelayDetails(),
    getListQueueEntries(blockName)
  ).then(function (unlockDetails, listActions) {
    var html = "";

    var myUnlocks = unlockDetails.filter(function (d) { return d.BlockName === blockName; });
    myUnlocks.forEach(function (q) {
      var minLeft = Math.max(0, Math.ceil((new Date(q.UnlockAt) - new Date()) / 60000));
      var timeText = minLeft < 1 ? "in < 1 min." : "in " + minLeft + " min.";
      html += '<div class="custom-option" onmousedown="customSelect(this, event)" '
            + 'data-value="' + toHtml(blockName).replace(/"/g, "&quot;") + '" '
            + 'data-entry-type="block-unlock">'
            + toHtml(blockName) + ' - Unlocking - ' + timeText + '</div>';
    });

    listActions.forEach(function (entry) {
      var minLeft = Math.max(0, Math.ceil((new Date(entry.UnlockAt) - new Date()) / 60000));
      var timeText = minLeft < 1 ? "in < 1 min." : "in " + minLeft + " min.";
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
            + toHtml(displayUrl) + ' - ' + actionLabel + ' - ' + timeText + '</div>';
    });

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
