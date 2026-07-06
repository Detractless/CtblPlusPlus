/**
 * @file statsService.js
 * @layer Services
 * @description Data-fetching service for all statistics. Bridges window.external and the StatsChart component.
 */

import { stats } from '../components/StatsChart/StatsChart';
import { AppState } from '../store/AppState';

export var statsService = {

    /**
     * Fetches blocked time data (web + app) for the given date range.
     * @returns {Array} Parsed JSON data array for Flot.
     */
    getBlockedTime: function() {
        return JSON.parse(window.external.SendStats(
            "web-app-blocked-time", "", "all",
            AppState.statsBlockedWebStart.unix(), AppState.statsBlockedWebEnd.unix()
        ));
    },

    /**
     * Fetches number-of-times-blocked data for the given date range.
     * @returns {Array} Parsed JSON data array for Flot.
     */
    getBlockedCount: function() {
        return JSON.parse(window.external.SendStats(
            "web-app-blocked", "", "all",
            AppState.statsBlockedAppStart.unix(), AppState.statsBlockedAppEnd.unix()
        ));
    },

    /**
     * Fetches web usage data for the given filters and date range.
     * @param {string} chartType - e.g. "top5", "search-..."
     * @param {string} chartOptions - block list or search text
     * @param {string} chartUsers - user filter
     * @returns {Array} Parsed JSON data array for Flot.
     */
    getWebStats: function(chartType, chartOptions, chartUsers) {
        return JSON.parse(window.external.SendStats(
            "web-" + chartType, chartOptions, chartUsers,
            AppState.statsWebStart.unix(), AppState.statsWebEnd.unix()
        ));
    },

    /**
     * Fetches app usage data for the given filters and date range.
     * @param {string} chartType - e.g. "top5", "search-..."
     * @param {string} chartOptions - block list or search text
     * @param {string} chartUsers - user filter
     * @returns {Array} Parsed JSON data array for Flot.
     */
    getAppStats: function(chartType, chartOptions, chartUsers) {
        return JSON.parse(window.external.SendStats(
            "app-" + chartType, chartOptions, chartUsers,
            AppState.statsAppStart.unix(), AppState.statsAppEnd.unix()
        ));
    },

    /**
     * Triggers a native CSV export of stats data.
     * @param {string} csv - CSV string to export.
     */
    exportCsv: function(csv) {
        window.external.ExportStats(csv);
    }
};
