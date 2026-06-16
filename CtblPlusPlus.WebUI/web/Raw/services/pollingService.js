/**
 * @file pollingService.js
 * @layer Services
 * @description Auto-refresh polling service
 */
import { updateBlocks } from '../pages/BlocksPage/BlocksPage';
import { updateOverview } from '../pages/OverviewPage/OverviewPage';
import { updateSettings } from '../pages/SettingsPage/SettingsPage';
import { AppState } from '../store/AppState';

export function initPollingService() {
    window.setInterval(function() {
        if (moment().seconds() >= 6 && AppState.lastRefreshedMinute !== moment().minutes() || AppState.specialSeconds.indexOf(moment().seconds()) >= 0) {
            try {
                updateOverview();
                var activePageId = $(".page-sidebar-menu>li.active")[0].id;
                switch (activePageId) {
                    case "page-blocks":   updateBlocks(false); break;
                    case "page-settings": updateSettings(false); break;
                    default: break;
                }
            } catch (intervalError) {}
        }
    }, 1000);
}
