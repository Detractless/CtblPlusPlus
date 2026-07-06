/**
 * @file CtblApiClient.js
 * @layer Services
 * @description API Client wrapper to fetch data from the local CTBL++ C# Engine.
 */

var API_BASE_URL = "http://127.0.0.1:58123/api";

function ctblApiGet(path, params, options) {
    options = options || {};
    var deferred = $.Deferred();
    $.ajax({
        url: API_BASE_URL + path,
        type: "GET",
        dataType: "jsonp",
        data: params,
        success: function(response) {
            var data = options.raw ? response : (typeof response === "string" ? JSON.parse(response) : response);
            deferred.resolve(options.transform ? options.transform(data) : data);
        },
        error: function(xhr, status, error) {
            console.error("CTBL++ API Error (" + options.name + "):", error);
            if (options.rejectOnError) {
                deferred.reject(new Error("HTTP error! status: " + xhr.status));
            } else {
                deferred.resolve(options.fallback);
            }
        }
    });
    return deferred.promise();
}

export function getGlobalDelayStatus() {
    return ctblApiGet("/settings/global-delay", null, { name: "getGlobalDelayStatus", fallback: null });
}

export function updateGlobalDelay(delayMinutes) {
    return ctblApiGet("/settings/global-delay", { delay: delayMinutes }, { name: "updateGlobalDelay", raw: true, rejectOnError: true });
}

export function cancelGlobalDelayDecrease() {
    return ctblApiGet("/settings/global-delay/cancel", null, { name: "cancelGlobalDelayDecrease", rejectOnError: true });
}

export function getQueuedDelays() {
    return ctblApiGet("/blocks/queued-delay", null, {
        name: "getQueuedDelays",
        fallback: [],
        transform: function(data) { return data.map(function(item) { return item.BlockName; }); }
    });
}

export function getQueuedDelayDetails() {
    return ctblApiGet("/blocks/queued-delay", null, { name: "getQueuedDelayDetails", fallback: [] });
}

export function getConfiguredQueuedDelays() {
    return ctblApiGet("/settings/queued-delay-blocks", null, { name: "getConfiguredQueuedDelays", fallback: [] });
}

export function toggleQueuedDelay(blockName, enabled) {
    return ctblApiGet("/settings/toggle-queued-delay", { block: encodeURIComponent(blockName), enabled: enabled.toString() }, { name: "toggleQueuedDelay", raw: true, rejectOnError: true });
}

export function enqueueQueuedDelay(blockName) {
    return ctblApiGet("/blocks/enqueue-queued-delay", { block: encodeURIComponent(blockName) }, { name: "enqueueQueuedDelay", raw: true, rejectOnError: true });
}

export function cancelQueuedDelay(blockName) {
    return ctblApiGet("/blocks/cancel-queued-delay", { block: encodeURIComponent(blockName) }, { name: "cancelQueuedDelay", raw: true, rejectOnError: true });
}

export function enqueueListAction(blockName, url, type) {
    return ctblApiGet("/blocks/enqueue-list-action", {
        block: encodeURIComponent(blockName),
        url: encodeURIComponent(url),
        type: type
    }, { name: "enqueueListAction", raw: true, rejectOnError: true });
}

export function cancelListAction(requestId) {
    return ctblApiGet("/blocks/cancel-list-action", {
        id: requestId
    }, { name: "cancelListAction", raw: true, rejectOnError: true });
}

export function getListQueueEntries(blockName) {
    return ctblApiGet("/blocks/list-queue", {
        block: encodeURIComponent(blockName)
    }, { name: "getListQueueEntries", fallback: [] });
}

export function getEnforcerSettings() {
    return ctblApiGet("/settings/enforcers", null, { name: "getEnforcerSettings", fallback: {} });
}

export function toggleEnforcerSetting(key, enabled) {
    return ctblApiGet("/settings/enforcers", { key: key, enabled: enabled.toString() },
        { name: "toggleEnforcerSetting", raw: true, rejectOnError: true });
}

export function getAppControlData() {
    return ctblApiGet("/app-control", null, { name: "getAppControlData", fallback: { enabled: false, apps: [] } });
}

export function allowApp(appPath) {
    return ctblApiGet("/app-control", { action: "allow", path: appPath },
        { name: "allowApp", raw: true, rejectOnError: true });
}

export function revokeApp(appId) {
    return ctblApiGet("/app-control", { action: "revoke", id: appId },
        { name: "revokeApp", raw: true, rejectOnError: true });
}

export function bulkAllowApps(ids) {
    return ctblApiGet("/app-control", { action: "bulk-allow", ids: ids.join("|") },
        { name: "bulkAllowApps", raw: true, rejectOnError: true });
}

export function bulkRevokeApps(ids) {
    return ctblApiGet("/app-control", { action: "bulk-revoke", ids: ids.join("|") },
        { name: "bulkRevokeApps", raw: true, rejectOnError: true });
}

export function enableAppControl() {
    return ctblApiGet("/app-control", { action: "enable" },
        { name: "enableAppControl", raw: true, rejectOnError: true });
}

export function disableAppControl() {
    return ctblApiGet("/app-control", { action: "disable" },
        { name: "disableAppControl", raw: true, rejectOnError: true });
}

// ── Block Config Change ─────────────────────────────────────────────────

export function enqueueBlockConfigChange(blockName, payloadObj) {
    return ctblApiGet("/blocks/enqueue-block-config", {
        block: encodeURIComponent(blockName),
        payload: encodeURIComponent(JSON.stringify(payloadObj))
    }, { name: "enqueueBlockConfigChange", raw: true, rejectOnError: true });
}

export function cancelBlockConfigChange(blockName) {
    return ctblApiGet("/blocks/cancel-block-config", {
        block: encodeURIComponent(blockName)
    }, { name: "cancelBlockConfigChange", raw: true, rejectOnError: true });
}

export function getBlockConfigQueue(blockName) {
    return ctblApiGet("/blocks/block-config-queue", {
        block: encodeURIComponent(blockName)
    }, { name: "getBlockConfigQueue", fallback: null });
}

// ── Schedule Change ─────────────────────────────────────────────────────

export function enqueueScheduleChange(blockName, payloadObj) {
    return ctblApiGet("/blocks/enqueue-schedule-change", {
        block: encodeURIComponent(blockName),
        payload: encodeURIComponent(JSON.stringify(payloadObj))
    }, { name: "enqueueScheduleChange", raw: true, rejectOnError: true });
}

export function cancelScheduleChange(blockName) {
    return ctblApiGet("/blocks/cancel-schedule-change", {
        block: encodeURIComponent(blockName)
    }, { name: "cancelScheduleChange", raw: true, rejectOnError: true });
}

export function getScheduleChangeQueue(blockName) {
    return ctblApiGet("/blocks/schedule-change-queue", {
        block: encodeURIComponent(blockName)
    }, { name: "getScheduleChangeQueue", fallback: null });
}

