/**
 * @file app.js
 * @layer Root
 * @description Application bootstrap. Wires global event handlers and native lifecycle callbacks.
 */

import { TemplateLoader } from './utils/TemplateLoader';

TemplateLoader.loadComponentSync('Raw/layouts/AppShell/AppShell.html', 'root');
TemplateLoader.loadComponentSync('Raw/components/Sidebar/Sidebar.html', 'sidebar-container');
TemplateLoader.loadComponentSync('Raw/pages/OverviewPage/OverviewPage.html', 'page-overview-content');
TemplateLoader.loadComponentSync('Raw/pages/BlocksPage/BlocksPage.html', 'page-blocks-content');
TemplateLoader.loadComponentSync('Raw/pages/StatsPage/StatsPage.html', 'page-stats-content');
TemplateLoader.loadComponentSync('Raw/pages/SettingsPage/SettingsPage.html', 'page-settings-content');

TemplateLoader.loadComponentSync('Raw/components/Modal/Modal.html', 'dialogs-container');
TemplateLoader.appendComponentSync('Raw/components/BlockModal/BlockModal.html', 'dialogs-container');
TemplateLoader.appendComponentSync('Raw/components/ThemeModal/ThemeModal.html', 'dialogs-container');
TemplateLoader.appendComponentSync('Raw/components/ReminderModal/ReminderModal.html', 'dialogs-container');
TemplateLoader.appendComponentSync('Raw/components/SecurityModal/SecurityModal.html', 'dialogs-container');
TemplateLoader.appendComponentSync('Raw/components/StatsModal/StatsModal.html', 'dialogs-container');
TemplateLoader.appendComponentSync('Raw/components/TrialModal/TrialModal.html', 'dialogs-container');

import { updateBrowserList } from './components/ExtensionInstallModal/ExtensionInstallModal';
import { passwordCheck } from './components/SecurityModal/SecurityModal';
import { stats } from './components/StatsChart/StatsChart';
import { addRemovePayWallEvents, showTrialModal, showHideUpdateButton } from './components/TrialModal/TrialModal';
import { addRemoveRoundedCornerOnBody } from './layouts/AppShell/AppShell';
import { updateBlocks } from './pages/BlocksPage/BlocksPage';
import { updateOverview } from './pages/OverviewPage/OverviewPage';
import { updateSettings, initSettingsEvents } from './pages/SettingsPage/SettingsPage';
import { updateStats, initStatsEvents } from './pages/StatsPage/StatsPage';
import { navigateTo, initRouter } from './routes/router';
import { initPollingService } from './services/pollingService';
import { AppState } from './store/AppState';
import { getQueuedDelays, getConfiguredQueuedDelays } from './services/CtblApiClient.js';
import { updateTheme, updateWeekStart } from './utils/themeUtils';
import { getMaxZ } from './components/Modal/Modal';
import './components/ReminderModal/ReminderModal';
import { getBreakText } from './utils/formatData';
import { zeroDate, removeDate } from './utils/calculateTime';
import { editBreak } from './pages/BreakEditorPage/BreakEditorPage';
import { makeTitleWithBlockName } from './utils/formatString';

// Inject globals for vendor/calendar.js, which is loaded outside the ES6 module bundle
Object.defineProperty(window, 'settings', { get: () => AppState.settings, set: (v) => AppState.settings = v });
Object.defineProperty(window, 'schedule', { get: () => AppState.schedule, set: (v) => AppState.schedule = v });
window.getMaxZ = getMaxZ;
window.getBreakText = getBreakText;
window.removeDate = removeDate;
window.zeroDate = zeroDate;
window.editBreak = editBreak;
window.makeTitleWithBlockName = makeTitleWithBlockName;
window.stats = stats;

export function save() {
    window.external.GetSettings(JSON.stringify(settings));
}
window.save = save;

function refreshQueuedDelayState() {
    // Fetch Queued Delay state from C# Engine
    getQueuedDelays().then(function(delays) {
        AppState.queuedDelays = delays || [];
        updateBlocks(true); // Re-render blocks with new state
    }, function(err) {
        console.error("CTBL++ Failed to fetch queued delays", err);
    });

    getConfiguredQueuedDelays().then(function(configuredBlocks) {
        AppState.configuredQueuedDelays = configuredBlocks || [];
        updateBlocks(true); // Re-render blocks with new state
    }, function(err) {
        console.error("CTBL++ Failed to fetch configured queued delays", err);
    });
}

export function ForceSettingsUpdate(settingsJson) {
    window.settings = JSON.parse(settingsJson);
    AppState.unlockedBlocks = [];
    updateOverview();
    updateBlocks(true);
    updateSettings(true);

    refreshQueuedDelayState();
}
window.ForceSettingsUpdate = ForceSettingsUpdate;

export function focusLost() {
    try {
        if ($("#dialog-randomText.ui-dialog-content").is(":visible")) {
            $("#dialog-randomText-label").html("Oops, please close this dialog and try again. You need to type the random text without leaving this window.");
            $("#dialog-randomText-text").val("");
            $("#dialog-randomText-text").prop("disabled", true);
            $("#dialog-randomText-unlock").hide();
        }
    } catch (error) {}
}
window.focusLost = focusLost;

jQuery(document).ready(function() {
    if (typeof window.settings === 'undefined' || !window.settings) {
        window.settings = JSON.parse(window.external.SendSettings());
    }

    refreshQueuedDelayState();

    updateTheme();
    updateWeekStart();
    initStatsEvents();
    initSettingsEvents();
    addRemovePayWallEvents();
    showHideUpdateButton();

    passwordCheck("page-overview", function() {
        navigateTo("page-overview", function() {
            showTrialModal();
            updateOverview();
        });
    });

    updateBrowserList(
        settings.settings.showExtensionWarning === "true" || settings.additional.forceExtensionInstall === "true"
            ? "true" : "false"
    );

    initRouter();
    initPollingService();

    window.windowWidth  = $(window).width();
    window.windowHeight = $(window).height();

    $(window).resize(function() {
        setTimeout(function() {
            if ($(window).width() !== windowWidth || $(window).height() !== windowHeight) {
                try { $("#dialog-edit-schedule").dialog("option", "height", $(window).height()); } catch (e) {}
                try {
                    $("div.ui-dialog-content:visible").dialog("option", "position", {
                        my: "center", at: "center", of: $(".page-content-wrapper")
                    });
                } catch (e) {}
                var resizePageId = $(".page-sidebar-menu>li.active")[0].id;
                try {
                    if (resizePageId === "page-overview")  { updateOverview(); }
                    else if (resizePageId === "page-stats") { updateStats(); }
                } catch (e) {}
                window.windowWidth  = $(window).width();
                window.windowHeight = $(window).height();
            }
        }, 250);
    });

    $("#dialog-edit-block a[data-toggle=\"tab\"]").on("shown.bs.tab", function(tabEvent) {
        if (tabEvent.currentTarget.id === "blocklist-websites") {
            $("#blocklist-websites-add").focus();
        } else if (tabEvent.currentTarget.id === "blocklist-exceptions") {
            $("#blocklist-exceptions-add").focus();
        } else if (tabEvent.currentTarget.id === "blocklist-apps") {
            $("#blocklist-apps-list").focus();
        }
    });

    $("#page-stats-content a[data-toggle=\"tab\"]").on("shown.bs.tab", function(statsTabEvent) {
        if (statsTabEvent.currentTarget.id.indexOf("stats-tab-") === 0) {
            updateStats();
        }
    });

    $(".page-content ul li").on("shown.bs.tab", function(contentTabEvent) {
        if (!this.classList.contains("no-scroll-up")) {
            $(".page-body > .row").scrollTop(0);
        }
        addRemoveRoundedCornerOnBody();
    });

    $(document).keydown(function(e) {
        if (e.key === "F5"
            || e.ctrlKey && !e.altKey && e.which === 107
            || e.ctrlKey && !e.altKey && e.which === 109
            || e.ctrlKey && !e.altKey && e.which === 187
            || e.ctrlKey && !e.altKey && e.which === 189) {
            e.preventDefault();
        }
    });

    $(window).bind("mousewheel DOMMouseScroll", function(e) {
        if (e.ctrlKey) {
            e.preventDefault();
            if (e.originalEvent.wheelDelta >= 0) { window.external.ZoomIn(); }
            else { window.external.ZoomOut(); }
        }
    });

    $(window).bind("mousedown", function(e) {
        if (e.ctrlKey && e.button === 1) { window.external.ResetZoom(); }
    });

    $(document).on({
        contextmenu: function(e) {
            if (!$(e.target).hasClass("allow-right-click")) { e.preventDefault(); }
        }
    });

    $(".no-typing").bind("keydown", function(e) {
        e = e || window.event;
        if ((e.keyCode !== 65 && e.keyCode !== 67) || (e.ctrlKey !== true && e.metaKey !== true)) {
            e.preventDefault();
            return false;
        }
    });

    $("#settings_password1").bind("keydown", function(e) {
        e = e || window.event;
        var keyCode = e.which || e.keyCode;
        if (keyCode === 13) { e.preventDefault(); }
    });

    $(".container").css("opacity", "1");
});
