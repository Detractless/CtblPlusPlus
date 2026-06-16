/**
 * @file formatStats.js
 * @layer Utils
 * @description Formatting utilities for stats data display in charts and tooltips.
 */

import { stats } from '../components/StatsChart/StatsChart';

export var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Flot axis formatter: displays raw count values.
 */
export var formatCountAxis = function(val, axis) {
    return val;
};

/**
 * Flot axis formatter: converts minutes into "X hr" label.
 */
export var formatMinsAxis = function(val, axis) {
    return Math.floor(val / 60).toString() + " hr";
};

/**
 * Converts a total number of minutes into a human-readable "X hr, Y min" string.
 * @param {number} totalMinutes
 * @returns {string}
 */
export function formatMinutes(totalMinutes) {
    var formattedHour = Math.floor(totalMinutes / 60).toString();
    var formattedMinute = Math.floor(totalMinutes % 60).toString();
    if (formattedHour !== "0") {
        return formattedHour + " hr, " + formattedMinute + " min";
    }
    return formattedMinute + " min";
}

/**
 * Flot legend label formatter — applies theme-aware color.
 * @param {string} label
 * @param {object} series
 * @returns {string} HTML string
 */
export function legendFormatter(label, series) {
    if (currentTheme === "light") {
        return '<div style="font-family:\'Open Sans\',sans-serif;font-size:12px;padding:2px;padding-right:15px;color:#27272A">' + label + '</div>';
    } else {
        return '<div style="font-family:\'Open Sans\',sans-serif;font-size:12px;padding:2px;padding-right:15px;color:#fafafa">' + label + '</div>';
    }
}
