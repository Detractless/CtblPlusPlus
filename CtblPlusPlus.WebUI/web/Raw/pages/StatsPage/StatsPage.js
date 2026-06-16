
import { stats } from '../../components/StatsChart/StatsChart';
import { toHtml } from '../../utils/formatString';
import { AppState } from '../../store/AppState';

export function updateStats() {
  $("#stats-web-block-list").empty();
  $("#stats-web-block-list").append("<option value=\"all\">From all domains</option>");
  $.each(settings.blocks, function (blockName, blockData) {
    if (blockName != "Frozen Turkey" && blockName.indexOf("Frozen Turkey,") != 0 && blockName.indexOf("Focused Turkey,") != 0) {
      $("#stats-web-block-list").append("<option value=\"" + toHtml(blockName) + "\">From domains in \"" + toHtml(blockName) + "\"</option>");
    }
  });
  $("#stats-web-block-list").change(function () {
    updateCharts();
  });
  $("#stats-app-block-list").empty();
  $("#stats-app-block-list").append("<option value=\"all\">From all apps</option>");
  $.each(settings.blocks, function (blockNameApp, blockDataApp) {
    if (blockNameApp != "Frozen Turkey" && blockNameApp.indexOf("Frozen Turkey,") != 0 && blockNameApp.indexOf("Focused Turkey,") != 0) {
      $("#stats-app-block-list").append("<option value=\"" + toHtml(blockNameApp) + "\">From apps in \"" + toHtml(blockNameApp) + "\"</option>");
    }
  });
  $("#stats-app-block-list").change(function () {
    updateCharts();
  });
  $("#stats-web-users").empty();
  $("#stats-web-users").append("<option value=\"all\">All users</option>");
  $.each(settings.additional.users, function (userIndex, userName) {
    $("#stats-web-users").append("<option value=\"" + toHtml(userName) + "\">" + toHtml(userName) + "</option>");
  });
  $("#stats-web-users").val("all");
  $("#stats-web-users").change(function () {
    updateCharts();
  });
  $("#stats-app-users").empty();
  $("#stats-app-users").append("<option value=\"all\">All users</option>");
  $.each(settings.additional.users, function (userIndexApp, userNameApp) {
    $("#stats-app-users").append("<option value=\"" + toHtml(userNameApp) + "\">" + toHtml(userNameApp) + "</option>");
  });
  $("#stats-app-users").val("all");
  $("#stats-app-users").change(function () {
    updateCharts();
  });
  updateCharts();
}
export function updateCharts() {
  if ($("#page-stats").hasClass("active")) {
    var activeTabHref = $("#page-stats-content .nav-tabs .active > a").attr("href");
    switch (activeTabHref) {
      case "#stats-blocked":
        stats.updateStatsTimeBlocked();
        stats.updateStatsNumberBlocked();
        break;
      case "#stats-websites":
        stats.updateStatsWeb();
        break;
      case "#stats-apps":
        stats.updateStatsApp();
        break;
    }
  }
}

export function initStatsEvents() {

  $(".input-group.date input").on("click", function (clickEvent) {
    $(clickEvent.target.parentNode).data("DateTimePicker").show();
  });
  AppState.ignoreChartDateChange = false;
  AppState.statsBlockedWebStart = moment().startOf("week");
  AppState.statsBlockedWebEnd = moment().endOf("week");
  AppState.statsBlockedAppStart = moment().startOf("week");
  AppState.statsBlockedAppEnd = moment().endOf("week");
  AppState.statsWebStart = moment().startOf("week");
  AppState.statsWebEnd = moment().endOf("week");
  AppState.statsAppStart = moment().startOf("week");
  AppState.statsAppEnd = moment().endOf("week");
  $("#stats-blocked-web-timeframe").val("week");
  $("#stats-blocked-web-timeframe").on("change", function (timeframeChangeEvent) {
    if (this.value != "custom") {
      AppState.ignoreChartDateChange = true;
      $("#stats-blocked-web-timeframe-start").data("DateTimePicker").maxDate(false);
      $("#stats-blocked-web-timeframe-end").data("DateTimePicker").minDate(false);
      switch (this.value) {
        case "week":
          $("#stats-blocked-web-timeframe-start").data("DateTimePicker").date(moment().startOf("week").toDate());
          $("#stats-blocked-web-timeframe-end").data("DateTimePicker").date(moment().endOf("week").toDate());
          break;
        case "last-week":
          $("#stats-blocked-web-timeframe-start").data("DateTimePicker").date(moment().subtract(1, "week").startOf("week").toDate());
          $("#stats-blocked-web-timeframe-end").data("DateTimePicker").date(moment().subtract(1, "week").endOf("week").toDate());
          break;
        case "month":
          $("#stats-blocked-web-timeframe-start").data("DateTimePicker").date(moment().startOf("month").toDate());
          $("#stats-blocked-web-timeframe-end").data("DateTimePicker").date(moment().endOf("month").toDate());
          break;
        case "last-month":
          $("#stats-blocked-web-timeframe-start").data("DateTimePicker").date(moment().subtract(1, "month").startOf("month").toDate());
          $("#stats-blocked-web-timeframe-end").data("DateTimePicker").date(moment().subtract(1, "month").endOf("month").toDate());
          break;
        case "7-days":
          $("#stats-blocked-web-timeframe-start").data("DateTimePicker").date(moment().subtract(7, "days").startOf("day").toDate());
          $("#stats-blocked-web-timeframe-end").data("DateTimePicker").date(moment().endOf("day").toDate());
          break;
        case "30-days":
          $("#stats-blocked-web-timeframe-start").data("DateTimePicker").date(moment().subtract(30, "days").startOf("day").toDate());
          $("#stats-blocked-web-timeframe-end").data("DateTimePicker").date(moment().endOf("day").toDate());
          break;
      }
    }
    updateCharts();
  });
  $("#stats-blocked-web-timeframe-start").datetimepicker({
    sideBySide: true,
    date: AppState.statsBlockedWebStart,
    maxDate: AppState.statsBlockedWebEnd,
    format: "D MMM YYYY",
    widgetPositioning: {
      horizontal: "auto",
      vertical: "bottom"
    }
  }).on("dp.show", function (dpShowEvent) {
    AppState.ignoreChartDateChange = false;
  }).on("dp.change", function (dpChangeEvent) {
    AppState.statsBlockedWebStart = dpChangeEvent.date;
    $("#stats-blocked-web-timeframe-end").data("DateTimePicker").minDate(dpChangeEvent.date);
    if (!AppState.ignoreChartDateChange) {
      $("#stats-blocked-web-timeframe").val("custom");
    }
    updateCharts();
  });
  $("#stats-blocked-web-timeframe-end").datetimepicker({
    sideBySide: true,
    date: AppState.statsBlockedWebEnd,
    minDate: AppState.statsBlockedWebStart,
    format: "D MMM YYYY",
    widgetPositioning: {
      horizontal: "auto",
      vertical: "bottom"
    }
  }).on("dp.show", function (dpShowEvent2) {
    AppState.ignoreChartDateChange = false;
  }).on("dp.change", function (dpChangeEvent2) {
    $("#stats-blocked-web-timeframe-start").data("DateTimePicker").maxDate(dpChangeEvent2.date);
    AppState.statsBlockedWebEnd = dpChangeEvent2.date.endOf("day");
    if (!AppState.ignoreChartDateChange) {
      $("#stats-blocked-web-timeframe").val("custom");
    }
    updateCharts();
  });
  $("#stats-blocked-app-timeframe").val("week");
  $("#stats-blocked-app-timeframe").on("change", function (timeframeChangeEvent2) {
    if (this.value != "custom") {
      AppState.ignoreChartDateChange = true;
      $("#stats-blocked-app-timeframe-start").data("DateTimePicker").maxDate(false);
      $("#stats-blocked-app-timeframe-end").data("DateTimePicker").minDate(false);
      switch (this.value) {
        case "week":
          $("#stats-blocked-app-timeframe-start").data("DateTimePicker").date(moment().startOf("week").toDate());
          $("#stats-blocked-app-timeframe-end").data("DateTimePicker").date(moment().endOf("week").toDate());
          break;
        case "last-week":
          $("#stats-blocked-app-timeframe-start").data("DateTimePicker").date(moment().subtract(1, "week").startOf("week").toDate());
          $("#stats-blocked-app-timeframe-end").data("DateTimePicker").date(moment().subtract(1, "week").endOf("week").toDate());
          break;
        case "month":
          $("#stats-blocked-app-timeframe-start").data("DateTimePicker").date(moment().startOf("month").toDate());
          $("#stats-blocked-app-timeframe-end").data("DateTimePicker").date(moment().endOf("month").toDate());
          break;
        case "last-month":
          $("#stats-blocked-app-timeframe-start").data("DateTimePicker").date(moment().subtract(1, "month").startOf("month").toDate());
          $("#stats-blocked-app-timeframe-end").data("DateTimePicker").date(moment().subtract(1, "month").endOf("month").toDate());
          break;
        case "7-days":
          $("#stats-blocked-app-timeframe-start").data("DateTimePicker").date(moment().subtract(7, "days").startOf("day").toDate());
          $("#stats-blocked-app-timeframe-end").data("DateTimePicker").date(moment().endOf("day").toDate());
          break;
        case "30-days":
          $("#stats-blocked-app-timeframe-start").data("DateTimePicker").date(moment().subtract(30, "days").startOf("day").toDate());
          $("#stats-blocked-app-timeframe-end").data("DateTimePicker").date(moment().endOf("day").toDate());
          break;
      }
    }
    updateCharts();
  });
  $("#stats-blocked-app-timeframe-start").datetimepicker({
    sideBySide: true,
    date: AppState.statsBlockedAppStart,
    maxDate: AppState.statsBlockedAppEnd,
    format: "D MMM YYYY",
    widgetPositioning: {
      horizontal: "auto",
      vertical: "bottom"
    }
  }).on("dp.show", function (dpShowEvent3) {
    AppState.ignoreChartDateChange = false;
  }).on("dp.change", function (dpChangeEvent3) {
    AppState.statsBlockedAppStart = dpChangeEvent3.date;
    $("#stats-blocked-app-timeframe-end").data("DateTimePicker").minDate(dpChangeEvent3.date);
    if (!AppState.ignoreChartDateChange) {
      $("#stats-blocked-app-timeframe").val("custom");
    }
    updateCharts();
  });
  $("#stats-blocked-app-timeframe-end").datetimepicker({
    sideBySide: true,
    date: AppState.statsBlockedAppEnd,
    minDate: AppState.statsBlockedAppStart,
    format: "D MMM YYYY",
    widgetPositioning: {
      horizontal: "auto",
      vertical: "bottom"
    }
  }).on("dp.show", function (dpShowEvent4) {
    AppState.ignoreChartDateChange = false;
  }).on("dp.change", function (dpChangeEvent4) {
    $("#stats-blocked-app-timeframe-start").data("DateTimePicker").maxDate(dpChangeEvent4.date);
    AppState.statsBlockedAppEnd = dpChangeEvent4.date.endOf("day");
    if (!AppState.ignoreChartDateChange) {
      $("#stats-blocked-app-timeframe").val("custom");
    }
    updateCharts();
  });
  $("#stats-web-timeframe").val("week");
  $("#stats-web-timeframe").on("change", function (timeframeChangeEvent3) {
    if (this.value != "custom") {
      AppState.ignoreChartDateChange = true;
      $("#stats-web-timeframe-start").data("DateTimePicker").maxDate(false);
      $("#stats-web-timeframe-end").data("DateTimePicker").minDate(false);
      switch (this.value) {
        case "week":
          $("#stats-web-timeframe-start").data("DateTimePicker").date(moment().startOf("week").toDate());
          $("#stats-web-timeframe-end").data("DateTimePicker").date(moment().endOf("week").toDate());
          break;
        case "last-week":
          $("#stats-web-timeframe-start").data("DateTimePicker").date(moment().subtract(1, "week").startOf("week").toDate());
          $("#stats-web-timeframe-end").data("DateTimePicker").date(moment().subtract(1, "week").endOf("week").toDate());
          break;
        case "month":
          $("#stats-web-timeframe-start").data("DateTimePicker").date(moment().startOf("month").toDate());
          $("#stats-web-timeframe-end").data("DateTimePicker").date(moment().endOf("month").toDate());
          break;
        case "last-month":
          $("#stats-web-timeframe-start").data("DateTimePicker").date(moment().subtract(1, "month").startOf("month").toDate());
          $("#stats-web-timeframe-end").data("DateTimePicker").date(moment().subtract(1, "month").endOf("month").toDate());
          break;
        case "7-days":
          $("#stats-web-timeframe-start").data("DateTimePicker").date(moment().subtract(7, "days").startOf("day").toDate());
          $("#stats-web-timeframe-end").data("DateTimePicker").date(moment().endOf("day").toDate());
          break;
        case "30-days":
          $("#stats-web-timeframe-start").data("DateTimePicker").date(moment().subtract(30, "days").startOf("day").toDate());
          $("#stats-web-timeframe-end").data("DateTimePicker").date(moment().endOf("day").toDate());
          break;
      }
    }
    updateCharts();
  });
  $("#stats-web-timeframe-start").datetimepicker({
    sideBySide: true,
    date: AppState.statsWebStart,
    maxDate: AppState.statsWebEnd,
    format: "D MMM YYYY",
    widgetPositioning: {
      horizontal: "auto",
      vertical: "bottom"
    }
  }).on("dp.show", function (dpShowEvent5) {
    AppState.ignoreChartDateChange = false;
  }).on("dp.change", function (dpChangeEvent5) {
    AppState.statsWebStart = dpChangeEvent5.date;
    $("#stats-web-timeframe-end").data("DateTimePicker").minDate(dpChangeEvent5.date);
    if (!AppState.ignoreChartDateChange) {
      $("#stats-web-timeframe").val("custom");
    }
    updateCharts();
  });
  $("#stats-web-timeframe-end").datetimepicker({
    sideBySide: true,
    date: AppState.statsWebEnd,
    minDate: AppState.statsWebStart,
    format: "D MMM YYYY",
    widgetPositioning: {
      horizontal: "auto",
      vertical: "bottom"
    }
  }).on("dp.show", function (dpShowEvent6) {
    AppState.ignoreChartDateChange = false;
  }).on("dp.change", function (dpChangeEvent6) {
    AppState.statsWebEnd = dpChangeEvent6.date.endOf("day");
    $("#stats-web-timeframe-start").data("DateTimePicker").maxDate(dpChangeEvent6.date);
    if (!AppState.ignoreChartDateChange) {
      $("#stats-web-timeframe").val("custom");
    }
    updateCharts();
  });
  $("#stats-app-timeframe").val("week");
  $("#stats-app-timeframe").on("change", function (timeframeChangeEvent4) {
    if (this.value != "custom") {
      AppState.ignoreChartDateChange = true;
      $("#stats-app-timeframe-start").data("DateTimePicker").maxDate(false);
      $("#stats-app-timeframe-end").data("DateTimePicker").minDate(false);
      switch (this.value) {
        case "week":
          $("#stats-app-timeframe-start").data("DateTimePicker").date(moment().startOf("week").toDate());
          $("#stats-app-timeframe-end").data("DateTimePicker").date(moment().endOf("week").toDate());
          break;
        case "last-week":
          $("#stats-app-timeframe-start").data("DateTimePicker").date(moment().subtract(1, "week").startOf("week").toDate());
          $("#stats-app-timeframe-end").data("DateTimePicker").date(moment().subtract(1, "week").endOf("week").toDate());
          break;
        case "month":
          $("#stats-app-timeframe-start").data("DateTimePicker").date(moment().startOf("month").toDate());
          $("#stats-app-timeframe-end").data("DateTimePicker").date(moment().endOf("month").toDate());
          break;
        case "last-month":
          $("#stats-app-timeframe-start").data("DateTimePicker").date(moment().subtract(1, "month").startOf("month").toDate());
          $("#stats-app-timeframe-end").data("DateTimePicker").date(moment().subtract(1, "month").endOf("month").toDate());
          break;
        case "7-days":
          $("#stats-app-timeframe-start").data("DateTimePicker").date(moment().subtract(7, "days").startOf("day").toDate());
          $("#stats-app-timeframe-end").data("DateTimePicker").date(moment().endOf("day").toDate());
          break;
        case "30-days":
          $("#stats-app-timeframe-start").data("DateTimePicker").date(moment().subtract(30, "days").startOf("day").toDate());
          $("#stats-app-timeframe-end").data("DateTimePicker").date(moment().endOf("day").toDate());
          break;
      }
    }
    updateCharts();
  });
  $("#stats-app-timeframe-start").datetimepicker({
    sideBySide: true,
    date: AppState.statsAppStart,
    maxDate: AppState.statsAppEnd,
    format: "D MMM YYYY",
    widgetPositioning: {
      horizontal: "auto",
      vertical: "bottom"
    }
  }).on("dp.show", function (dpShowEvent7) {
    AppState.ignoreChartDateChange = false;
  }).on("dp.change", function (dpChangeEvent7) {
    AppState.statsAppStart = dpChangeEvent7.date;
    $("#stats-app-timeframe-end").data("DateTimePicker").minDate(dpChangeEvent7.date);
    if (!AppState.ignoreChartDateChange) {
      $("#stats-app-timeframe").val("custom");
    }
    updateCharts();
  });
  $("#stats-app-timeframe-end").datetimepicker({
    sideBySide: true,
    date: AppState.statsAppEnd,
    minDate: AppState.statsAppStart,
    format: "D MMM YYYY",
    widgetPositioning: {
      horizontal: "auto",
      vertical: "bottom"
    }
  }).on("dp.show", function (dpShowEvent8) {
    AppState.ignoreChartDateChange = false;
  }).on("dp.change", function (dpChangeEvent8) {
    AppState.statsAppEnd = dpChangeEvent8.date.endOf("day");
    $("#stats-app-timeframe-start").data("DateTimePicker").maxDate(dpChangeEvent8.date);
    if (!AppState.ignoreChartDateChange) {
      $("#stats-app-timeframe").val("custom");
    }
    updateCharts();
  });
  $("#stats-web-type").val("top5");
  $("#stats-web-type").on("change", function (typeChangeEvent) {
    $("#stats-web-search-text").val("");
    if (this.value.indexOf("search") == 0) {
      $("#stats-web-blocks").hide();
      $("#stats-web-search").show();
    } else {
      $("#stats-web-search").hide();
      $("#stats-web-blocks").show();
    }
    updateCharts();
  });
  $("#stats-app-type").val("top5");
  $("#stats-app-type").on("change", function (typeChangeEvent2) {
    $("#stats-app-search-text").val("");
    if (this.value.indexOf("search") == 0) {
      $("#stats-app-blocks").hide();
      $("#stats-app-search").show();
    } else {
      $("#stats-app-search").hide();
      $("#stats-app-blocks").show();
    }
    updateCharts();
  });
  $("#stats-web-search-text").on("keypress", function (keyEvent) {
    if (keyEvent.which == 13) {
      keyEvent.preventDefault();
      stats.updateStatsWeb();
    }
  });
  $("#stats-app-search-text").on("keypress", function (keyEvent2) {
    if (keyEvent2.which == 13) {
      keyEvent2.preventDefault();
      stats.updateStatsApp();
    }
  });
}
