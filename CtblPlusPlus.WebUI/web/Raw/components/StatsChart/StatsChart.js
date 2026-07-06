/**
 * @file StatsChart.js
 * @layer Components
 * @description Renders all four Flot statistics charts: blocked time, blocked count, web usage, app usage.
 *              Depends on: statsService.js (data), formatStats.js (formatting), AppState.js (date ranges).
 */

import { fromHtml } from '../../utils/formatString';
import { statsService } from '../../services/statsService';
import { formatMinutes, legendFormatter, months, formatCountAxis, formatMinsAxis } from '../../utils/formatStats';

export var showOthersWeb = false;
export var showOthersApp = false;

export var exportableStats = {
    'stats-blocked-time-chart': [],
    'stats-blocked-number-chart': [],
    'stats-web-chart': [],
    'stats-app-chart': []
};

/**
 * Builds theme-aware Flot color config from the current theme.
 * @returns {object}
 */
export function getChartColors() {
    var colorMap = {
        "light": {
            border:     "#d4d4d8",
            lines:      "#d4d4d8",
            text:       "#27272A",
            background: "#fafafa",
            shadow:     "5px 5px rgba(102, 102, 102, 0.1)"
        },
        "dark": {
            border:     "#52525B",
            lines:      "#424247",
            text:       "#fafafa",
            background: "#424247",
            shadow:     "none"
        }
    };
    return colorMap[currentTheme] || colorMap["dark"];
}

/**
 * Creates and appends a tooltip div at the given page coordinates.
 * @param {number} x
 * @param {number} y
 * @param {string} content
 * @param {number} width - tooltip width in px
 */
export function showChartTooltip(x, y, content, width) {
    var colors = getChartColors();
    var xOffset = 30;
    if (window.innerWidth - x - width - 30 < 0) {
        xOffset = -(width + 30);
    }
    $('<div id="tooltip" class="chart-tooltip">' + content + '<\/div>').css({
        'position': 'absolute',
        'display': 'none',
        'width': width + 'px',
        'top': y + 30,
        'left': x + xOffset,
        'border': '1px solid ' + colors.border,
        'padding': '5px 10px',
        'background-color': colors.background,
        'border-radius': '5px',
        'box-shadow': colors.shadow
    }).appendTo("body").show();
}

/**
 * Generates a CSV string and triggers a native export for the given chart ID.
 * @param {string} chart - one of the keys in exportableStats
 */
export function exportStats(chart) {
    var chartData = JSON.parse(JSON.stringify(exportableStats[chart]));
    var csv = chart.indexOf("stats-web") === 0
        ? "Website Domain,Date (year-month-day),Minutes Used"
        : chart.indexOf("stats-app") === 0
            ? "App Filename,Date (year-month-day),Minutes Used"
            : chart.indexOf("stats-blocked-number") === 0
                ? "Block Type,Date (year-month-day),Number of Times Blocked"
                : "Block Type,Date (year-month-day),Minutes Blocked";

    for (var i = 0; i < chartData.length; i++) {
        var label = chartData[i]["label"];
        for (var j = 0; j < chartData[i]["data"].length; j++) {
            var date = new Date(chartData[i]["data"][j][0]);
            var dateString = date.getUTCFullYear() + "-" + (date.getUTCMonth() + 1) + "-" + date.getUTCDate();
            csv += "\r\n" + label + "," + dateString + "," + chartData[i]["data"][j][1];
        }
    }
    statsService.exportCsv(csv);
}

export function handleToggleOthersWeb() {
    if (showOthersWeb) {
        showOthersWeb = false;
        $("#chart-legend-button-hide").hide();
        $("#chart-legend-button-show").show();
    } else {
        showOthersWeb = true;
        $("#chart-legend-button-show").hide();
        $("#chart-legend-button-hide").show();
    }
}

export function handleToggleOthersApp() {
    if (showOthersApp) {
        showOthersApp = false;
        $("#chart-legend-button-app-hide").hide();
        $("#chart-legend-button-app-show").show();
    } else {
        showOthersApp = true;
        $("#chart-legend-button-app-show").hide();
        $("#chart-legend-button-app-hide").show();
    }
}

// Initialise toggle button visibility on load
handleToggleOthersWeb();
handleToggleOthersApp();

export var stats = (function() {

    return {

        updateStatsTimeBlocked: function() {
            if (!jQuery.plot) { return; }

            var colors = getChartColors();
            var data = statsService.getBlockedTime();
            exportableStats['stats-blocked-time-chart'] = data;

            if ($('#stats-blocked-time-chart').size() === 0) { return; }

            $.plot($("#stats-blocked-time-chart"), data, {
                series: { stack: true },
                bars: { show: true, align: "center", barWidth: 24 * 60 * 60 * 600 },
                grid: { hoverable: true, tickColor: colors.lines, borderColor: colors.lines, borderWidth: 2 },
                yaxis: { min: 0, tickDecimals: 0, tickSize: 180, tickFormatter: formatMinsAxis, font: { size: 12, lineHeight: 14, family: "Open Sans", color: colors.text } },
                axisLabels: { show: true },
                xaxis: { mode: "time", timeformat: "%e %b", tickSize: [1, "day"], tickLength: 0, axisLabelUseCanvas: true, font: { size: 12, lineHeight: 14, family: "Open Sans", color: colors.text } },
                legend: { show: true, container: $('#stats-blocked-time-legend'), noColumns: 5, labelFormatter: legendFormatter }
            });

            var previousPoint = null;
            $("#stats-blocked-time-chart").bind("plothover", function(event, pos, item) {
                try {
                    if (item) {
                        if (previousPoint !== item.datapoint) {
                            previousPoint = item.datapoint;
                            $("#tooltip").remove();
                            var typeLabel = item.seriesIndex === 0 ? " blocked with no breaks" : item.seriesIndex === 1 ? " blocked with breaks" : " with no blocks";
                            var unixDate = new Date(item.datapoint[0]);
                            var total = Math.round(item.datapoint[1] - item.datapoint[2]);
                            showChartTooltip(item.pageX, item.pageY, formatMinutes(total) + typeLabel + ' on ' + unixDate.getUTCDate() + ' ' + months[unixDate.getUTCMonth()], 150);
                        }
                    } else {
                        $("#tooltip").remove();
                        previousPoint = null;
                    }
                } catch (ex) {}
            });

            $('.legendLabel').each(function(i, element) {
                try {
                    var seriesName = $(element).text();
                    $.each(data, function(i, obj) {
                        if (obj["label"] === seriesName) {
                            var total = 0;
                            $.each(obj["data"], function(j, val) { total += val[1]; });
                            var optionalWith = (seriesName === "no blocks") ? "with " : "";
                            $(element).prop('title', 'A total of ' + formatMinutes(total) + ' was spent ' + optionalWith + seriesName + ' for this time frame.');
                        }
                    });
                } catch (ex) {}
            });
        },

        updateStatsNumberBlocked: function() {
            if (!jQuery.plot) { return; }

            var colors = getChartColors();
            var data = statsService.getBlockedCount();
            exportableStats['stats-blocked-number-chart'] = data;

            if ($('#stats-blocked-number-chart').size() === 0) { return; }

            $.plot($("#stats-blocked-number-chart"), data, {
                series: { stack: true },
                bars: { show: true, align: "center", barWidth: 24 * 60 * 60 * 600 },
                grid: { hoverable: true, tickColor: colors.lines, borderColor: colors.lines, borderWidth: 2 },
                yaxis: { min: 0, tickDecimals: 0, tickFormatter: formatCountAxis, font: { size: 12, lineHeight: 14, family: "Open Sans", color: colors.text } },
                axisLabels: { show: true },
                xaxis: { mode: "time", timeformat: "%e %b", tickSize: [1, "day"], tickLength: 0, axisLabelUseCanvas: true, font: { size: 12, lineHeight: 14, family: "Open Sans", color: colors.text } },
                legend: { show: true, container: $('#stats-blocked-legend'), noColumns: 5, labelFormatter: legendFormatter }
            });

            var previousPoint = null;
            $("#stats-blocked-number-chart").bind("plothover", function(event, pos, item) {
                try {
                    if (item) {
                        if (previousPoint !== item.datapoint) {
                            previousPoint = item.datapoint;
                            $("#tooltip").remove();
                            var unixDate = new Date(item.datapoint[0]);
                            var realValue = item.datapoint[1] - item.datapoint[2];
                            var type = item.seriesIndex === 0 ? " website(s)" : " app(s)";
                            showChartTooltip(item.pageX, item.pageY, realValue + type + ' blocked on ' + unixDate.getUTCDate() + ' ' + months[unixDate.getUTCMonth()], 150);
                        }
                    } else {
                        $("#tooltip").remove();
                        previousPoint = null;
                    }
                } catch (ex) {}
            });

            $('.legendLabel').each(function(i, element) {
                try {
                    var seriesName = $(element).text();
                    $.each(data, function(i, obj) {
                        if (obj["label"] === seriesName) {
                            var total = 0;
                            $.each(obj["data"], function(j, val) { total += val[1]; });
                            var type = (seriesName === "websites blocked") ? " website(s)" : " app(s)";
                            $(element).prop('title', 'A total of ' + total + type + ' were blocked for this time frame.');
                        }
                    });
                } catch (ex) {}
            });
        },

        toggleOthersWeb: function() {
            handleToggleOthersWeb();
        },

        updateStatsWeb: function() {
            if (!jQuery.plot) { return; }

            var colors = getChartColors();
            var chartUsers = fromHtml($("#stats-web-users").val());
            var chartType = $("#stats-web-type").val() || "top5";
            var chartOptions = chartType.indexOf("search-") === 0
                ? $("#stats-web-search-text").val()
                : fromHtml($("#stats-web-block-list").val());

            var data = statsService.getWebStats(chartType, chartOptions, chartUsers);
            if (!showOthersWeb) {
                data = data.filter(function(obj) { return obj["label"] !== "all other websites"; });
            }
            exportableStats['stats-web-chart'] = data;

            if ($('#stats-web-chart').size() === 0) { return; }

            $.plot($("#stats-web-chart"), data, {
                series: { stack: true },
                bars: { show: true, align: "center", barWidth: 24 * 60 * 60 * 600 },
                grid: { hoverable: true, tickColor: colors.lines, borderColor: colors.lines, borderWidth: 2 },
                yaxis: { min: 0, tickDecimals: 0, tickSize: 60, tickFormatter: formatMinsAxis, font: { size: 12, lineHeight: 14, family: "Open Sans", color: colors.text } },
                axisLabels: { show: true },
                xaxis: { mode: "time", timeformat: "%e %b", tickSize: [1, "day"], tickLength: 0, axisLabelUseCanvas: true, font: { size: 12, lineHeight: 14, family: "Open Sans", color: colors.text } },
                legend: { show: true, container: $('#stats-web-legend'), noColumns: 5, labelFormatter: legendFormatter }
            });

            var previousPoint = null;
            $("#stats-web-chart").bind("plothover", function(event, pos, item) {
                try {
                    if (item) {
                        if (previousPoint !== item.datapoint) {
                            previousPoint = item.datapoint;
                            $("#tooltip").remove();
                            var unixDate = new Date(item.datapoint[0]);
                            var total = Math.round(item.datapoint[1] - item.datapoint[2]);
                            showChartTooltip(item.pageX, item.pageY, formatMinutes(total) + ' spent visiting ' + item.series.label + ' on ' + unixDate.getUTCDate() + ' ' + months[unixDate.getUTCMonth()], 200);
                        }
                    } else {
                        $("#tooltip").remove();
                        previousPoint = null;
                    }
                } catch (ex) {}
            });

            $('.legendLabel').each(function(i, element) {
                try {
                    var seriesName = $(element).text();
                    $.each(data, function(i, obj) {
                        if (obj["label"] === seriesName) {
                            var total = 0;
                            $.each(obj["data"], function(j, val) { total += val[1]; });
                            $(element).prop('title', 'A total of ' + formatMinutes(total) + ' was spent visiting ' + seriesName + ' for this time frame.');
                        }
                    });
                } catch (ex) {}
            });
        },

        toggleOthersApp: function() {
            handleToggleOthersApp();
        },

        updateStatsApp: function() {
            if (!jQuery.plot) { return; }

            var colors = getChartColors();
            var chartUsers = fromHtml($("#stats-app-users").val());
            var chartType = $("#stats-app-type").val() || "top5";
            var chartOptions = chartType.indexOf("search") === 0
                ? $("#stats-app-search-text").val()
                : fromHtml($("#stats-app-block-list").val());

            var data = statsService.getAppStats(chartType, chartOptions, chartUsers);
            if (!showOthersApp) {
                data = data.filter(function(obj) { return obj["label"] !== "all other apps"; });
            }
            exportableStats['stats-app-chart'] = data;

            if ($('#stats-app-chart').size() === 0) { return; }

            $.plot($("#stats-app-chart"), data, {
                series: { stack: true },
                bars: { show: true, align: "center", barWidth: 24 * 60 * 60 * 600 },
                grid: { hoverable: true, tickColor: colors.lines, borderColor: colors.lines, borderWidth: 2 },
                yaxis: { min: 0, tickDecimals: 0, tickSize: 60, tickFormatter: formatMinsAxis, font: { size: 12, lineHeight: 14, family: "Open Sans", color: colors.text } },
                axisLabels: { show: true },
                xaxis: { mode: "time", timeformat: "%e %b", tickSize: [1, "day"], tickLength: 0, axisLabelUseCanvas: true, font: { size: 12, lineHeight: 14, family: "Open Sans", color: colors.text } },
                legend: { show: true, container: $('#stats-app-legend'), noColumns: 5, labelFormatter: legendFormatter }
            });

            var previousPoint = null;
            $("#stats-app-chart").bind("plothover", function(event, pos, item) {
                try {
                    if (item) {
                        if (previousPoint !== item.datapoint) {
                            previousPoint = item.datapoint;
                            $("#tooltip").remove();
                            var unixDate = new Date(item.datapoint[0]);
                            var total = Math.round(item.datapoint[1] - item.datapoint[2]);
                            showChartTooltip(item.pageX, item.pageY, formatMinutes(total) + ' spent using ' + item.series.label + ' on ' + unixDate.getUTCDate() + ' ' + months[unixDate.getUTCMonth()], 200);
                        }
                    } else {
                        $("#tooltip").remove();
                        previousPoint = null;
                    }
                } catch (ex) {}
            });

            $('.legendLabel').each(function(i, element) {
                try {
                    var seriesName = $(element).text();
                    $.each(data, function(i, obj) {
                        if (obj["label"] === seriesName) {
                            var total = 0;
                            $.each(obj["data"], function(j, val) { total += val[1]; });
                            $(element).prop('title', 'A total of ' + formatMinutes(total) + ' was spent using ' + seriesName + ' for this time frame.');
                        }
                    });
                } catch (ex) {}
            });
        }

    };

}());
