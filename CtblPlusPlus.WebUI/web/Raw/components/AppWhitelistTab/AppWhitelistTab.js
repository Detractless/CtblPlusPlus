import { getAppControlData, bulkAllowApps, bulkRevokeApps, enqueueListAction } from '../../services/CtblApiClient';
import { markDirty } from '../BlockModal/BlockModalListActions';
import { toHtml } from '../../utils/formatString';

var WHITELIST_BLOCK_NAME = "CTBL ++ Application Whitelist";

// True when the whitelist block carries the CTBL++ "Queued Delay" lock. While it
// does, allowing an app weakens the block, so it must go through the delay queue
// (as a remove-app list action) rather than taking effect immediately.
function isWhitelistQueuedDelay() {
    return !!(typeof settings !== 'undefined' &&
        settings.blocks &&
        settings.blocks[WHITELIST_BLOCK_NAME] &&
        settings.blocks[WHITELIST_BLOCK_NAME].enabled === "true" &&
        settings.blocks[WHITELIST_BLOCK_NAME].password === "CTBL_QUEUED_DELAY");
}

var pendingOps = {};

function getFilename(exePath) {
    if (!exePath) return "Unknown";
    var parts = exePath.replace(/\//g, "\\").split("\\");
    return parts[parts.length - 1];
}

function dotColor(status) {
    if (status === "Allowed") return "#5cb85c";
    if (status === "Blocked") return "#d9534f";
    return "#999";
}

function effectiveStatus(app) {
    var op = pendingOps[app.id];
    if (op) return op.action === "allow" ? "Allowed" : "Blocked";
    return app.status;
}

function refreshWhitelistApps() {
    var $list = $("#blocklist-apps-list");
    $list.html('<div style="padding: 15px; text-align: center; opacity: 0.7;">Loading...</div>');

    getAppControlData().then(function (data) {
        $list.empty();
        var apps = data.apps || [];

        if (apps.length === 0) {
            $list.html('<div style="padding: 15px; text-align: center; opacity: 0.7;">No applications discovered yet.</div>');
            return;
        }

        $.each(apps, function (i, app) {
            var name = app.displayName || getFilename(app.exePath);
            var status = effectiveStatus(app);
            $list.append(
                '<div class="custom-option" onmousedown="customSelect(this, event);" ' +
                'data-locked="false" data-value="' + toHtml(app.id) + '" ' +
                'data-app-path="' + toHtml(app.exePath) + '">' +
                toHtml(name) +
                ' <i class="fa fa-circle" style="color: ' + dotColor(status) + '; float: right; margin-top: 4px; font-size: 10px;"></i>' +
                '</div>'
            );
        });

        var q = $("#whitelist-app-search").val();
        if (q) {
            q = q.toLowerCase();
            $list.find(".custom-option").each(function () {
                $(this).toggle($(this).text().toLowerCase().indexOf(q) !== -1);
            });
        }
    }).fail(function () {
        $list.html('<div style="padding: 15px; text-align: center; opacity: 0.7;">Failed to load apps. Is the CTBL++ Engine running?</div>');
    });
}

export function isWhitelistBlock(blockName) {
    return blockName === WHITELIST_BLOCK_NAME;
}

export function flushWhitelistOps() {
    var allowOps = [];
    var revokeIds = [];

    for (var id in pendingOps) {
        var op = pendingOps[id];
        if (op.action === "allow") {
            allowOps.push(op);
        } else if (op.action === "revoke") {
            revokeIds.push(op.id);
        }
    }

    pendingOps = {};

    var promises = [];

    if (allowOps.length > 0) {
        if (isWhitelistQueuedDelay()) {
            // Queued-delay protected: enqueue each allow as a remove-app list action
            // (the backend removes the app from the block and flips its status to
            // Allowed only after the delay elapses).
            allowOps.forEach(function (op) {
                promises.push(enqueueListAction(WHITELIST_BLOCK_NAME, op.path, "remove-app"));
            });
        } else {
            promises.push(bulkAllowApps(allowOps.map(function (op) { return op.id; })));
        }
    }

    if (revokeIds.length > 0) promises.push(bulkRevokeApps(revokeIds));

    return $.when.apply($, promises);
}

export function initWhitelistAppsTab() {
    pendingOps = {};
    $(".row.app-bar").hide();

    $(".row.app-bar").before(
        '<div id="whitelist-custom-bar">' +
        '<div class="add-bar">' +
        '<div class="add-bar-text">' +
        '<input id="whitelist-app-search" type="text" class="allow-right-click" placeholder="Search apps..." autocomplete="off">' +
        '</div>' +
        '</div>' +
        '<div style="margin-bottom: 8px;">' +
        '<div class="btn-group"><button class="btn-green-dialog action-wl-allow" type="button"><i class="fa fa-check"></i> Allow</button></div> ' +
        '<div class="btn-group"><button class="btn-grey-dialog action-wl-revoke" type="button"><i class="fa fa-times"></i> Revoke</button></div>' +
        '</div>' +
        '</div>'
    );

    $("#app_list_mode").prop("checked", false);
    $("#app_list_mode").closest("li").find("span").last().text("Whitelist");

    $("#blocklist-apps-remove-button").closest(".btn-group").hide();
    $("#blocklist-apps-import-block-divider").closest(".btn-group").hide();

    refreshWhitelistApps();

    $("#whitelist-app-search").on("input", function () {
        var q = $(this).val().toLowerCase();
        $("#blocklist-apps-list .custom-option").each(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(q) !== -1);
        });
    });

    $(".action-wl-allow").on("click", function () {
        var $selected = $("#blocklist-apps-list .custom-option.selected");
        if ($selected.length === 0) return;
        $selected.each(function () {
            var id = $(this).attr("data-value");
            var path = $(this).attr("data-app-path");
            if (id && path) {
                pendingOps[id] = { action: "allow", path: path, id: id };
                // Under queued delay the allow is only pending until the delay elapses,
                // so show an amber "pending" dot rather than the green "Allowed" dot.
                $(this).find(".fa-circle").css("color", isWhitelistQueuedDelay() ? "#f0ad4e" : dotColor("Allowed"));
            }
        });
        markDirty();
    });

    $(".action-wl-revoke").on("click", function () {
        var $selected = $("#blocklist-apps-list .custom-option.selected");
        if ($selected.length === 0) return;
        $selected.each(function () {
            var id = $(this).attr("data-value");
            if (id) {
                pendingOps[id] = { action: "revoke", id: id };
                $(this).find(".fa-circle").css("color", dotColor("Blocked"));
            }
        });
        markDirty();
    });
}

export function cleanupWhitelistAppsTab() {
    pendingOps = {};
    $("#whitelist-custom-bar").remove();
    $(".row.app-bar").show();
    $("#blocklist-apps-remove-button").closest(".btn-group").show();
    $("#blocklist-apps-import-block-divider").closest(".btn-group").show();
    $("#app_list_mode").prop("checked", true);
    $("#app_list_mode").closest("li").find("span").last().text("Blacklist");
}
