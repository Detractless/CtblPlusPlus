/**
 * @file router.js
 * @layer Routes
 * @description Client-side page router. Manages navigation between the Overview, Blocks, Stats,
 *              and Settings pages by wiring sidebar menu click events.
 */

/**
 * Hides all page content panels.
 */
import { passwordCheck } from '../components/SecurityModal/SecurityModal';
import { stats } from '../components/StatsChart/StatsChart';
import { addRemoveRoundedCornerOnBody } from '../layouts/AppShell/AppShell';
import { updateBlocks } from '../pages/BlocksPage/BlocksPage';
import { updateOverview } from '../pages/OverviewPage/OverviewPage';
import { updateSettings } from '../pages/SettingsPage/SettingsPage';
import { updateStats } from '../pages/StatsPage/StatsPage';

export function hideAllContent() {
    $("#page-overview-content").hide();
    $("#page-blocks-content").hide();
    $("#page-stats-content").hide();
    $("#page-settings-content").hide();
    $("#page-upgrade-content").hide();
}

/**
 * Removes the `active` class from all sidebar menu items.
 */
export function unselectMenu() {
    $("#page-overview").removeClass("active");
    $("#page-blocks").removeClass("active");
    $("#page-stats").removeClass("active");
    $("#page-settings").removeClass("active");
    $("#page-upgrade").removeClass("active");
}

/**
 * Removes any inline "selected" span indicators from the DOM.
 */
export function hideSelected() {
    $("span[class^=\"selected\"]").remove();
}

/**
 * Navigates to a given page: hides all others, marks the target active, scrolls to top.
 * @param {string} pageId - the ID of the sidebar <li> element (e.g. "page-blocks")
 * @param {Function} onActivate - called after the page is made visible
 */
export function navigateTo(pageId, onActivate) {
    hideAllContent();
    unselectMenu();
    hideSelected();
    $("#" + pageId).addClass("active");
    $("#" + pageId + "-content").show();
    $(".page-body").scrollTop(0);
    addRemoveRoundedCornerOnBody();
    if (onActivate) { onActivate(); }
}

/**
 * Wires all sidebar navigation click handlers. Called once during app init.
 */
export function initRouter() {
    $("#page-overview").off("click").on("click", function() {
        passwordCheck("page-overview", function() {
            if (!$("#page-overview").hasClass("active")) {
                navigateTo("page-overview", updateOverview);
            }
        });
    });

    $("#page-blocks").off("click").on("click", function() {
        passwordCheck("page-blocks", function() {
            if (!$("#page-blocks").hasClass("active")) {
                navigateTo("page-blocks", function() { updateBlocks(false); });
            }
        });
    });

    $("#page-stats").off("click").on("click", function() {
        passwordCheck("page-stats", function() {
            if (!$("#page-stats").hasClass("active")) {
                navigateTo("page-stats", updateStats);
            }
        });
    });

    $("#page-settings").off("click").on("click", function() {
        passwordCheck("page-settings", function() {
            if (!$("#page-settings").hasClass("active")) {
                navigateTo("page-settings", function() { updateSettings(true); });
            }
        });
    });
}
