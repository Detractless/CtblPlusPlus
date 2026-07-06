/**
 * @file dateUtils.js
 * @layer Utils
 * @description Date prototype extensions.
 */

/**
 * Adds N days to a Date instance.
 * @param {number} days
 * @returns {Date}
 */
Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};
