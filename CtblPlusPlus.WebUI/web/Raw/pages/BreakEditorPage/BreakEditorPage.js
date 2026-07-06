/**
 * @file BreakEditorPage.js
 * @description Manages the "Edit Break" modal dialog.
 *
 * Refactored from a monolithic closure into the BreakEditor object.
 * The legacy `editBreak()` function is kept as a thin wrapper so no call
 * sites need to change.
 */

import { getMaxZ, showErrorDialog } from '../../components/Modal/Modal';
import { updateRandomTextDisplay } from '../../components/StatsToggle/StatsToggle';
import { stats } from '../../components/StatsChart/StatsChart';
import { updateBlocks, blockTabClick } from '../BlocksPage/BlocksPage';
import { AppState } from '../../store/AppState';
import { getBreakText } from '../../utils/formatData';
import { makeTitleWithBlockName } from '../../utils/formatString';
import { isExtensionLock } from '../../lockTypes/extensionTypes';
import { enqueueBlockConfigChange } from '../../services/CtblApiClient.js';

export var BreakEditor = {

  // ── State ──────────────────────────────────────────────────────────────────
  targetBlockOrElement: null,
  lockedArg:            null,
  breakData:            "none",
  breakType:            "none",
  scheduleType:         "continuous",
  blockId:              null,
  blockName:            null,
  isFrozenTurkey:       false,

  maxAllowanceMinutes:     10080,
  maxRandomTextBreakLimit: 300,
  minRandomTextLength:     1,
  maxDelayBreakLimit:      300,
  minDelaySeconds:         1,
  maxSessionsLimit:        999,

  randomTextRefillDate: null,
  randomTextRefillType: null,
  delayRefillDate:      null,
  delayRefillType:      null,

  // ── Entry point ────────────────────────────────────────────────────────────
  open: function (targetBlockOrElement, lockedArg) {
    this.targetBlockOrElement = targetBlockOrElement;
    this.lockedArg            = lockedArg;

    if (typeof targetBlockOrElement != "string") {
      this.breakData    = $(targetBlockOrElement).data("break");
      this.blockId      = $(targetBlockOrElement).data("blockId");
      this.scheduleType = "scheduled";
    } else {
      this.breakData    = settings.blocks[targetBlockOrElement].break;
      this.blockId      = targetBlockOrElement;
      this.scheduleType = "continuous";
    }

    this.blockName = this.blockId;
    this.isFrozenTurkey = false;
    if (this.blockId.indexOf("Frozen Turkey") == 0) {
      this.isFrozenTurkey = true;
      if (this.blockId.indexOf("Frozen Turkey,") == 0) {
        this.blockName = this.blockId.replace("Frozen Turkey,", "");
      }
    } else if (this.blockId.indexOf("Focused Turkey,") == 0) {
      this.blockName = this.blockId.replace("Focused Turkey,", "");
    }

    // Reset bounds per-open
    this.maxAllowanceMinutes     = 10080;
    this.maxRandomTextBreakLimit = 300;
    this.minRandomTextLength     = 1;
    this.maxDelayBreakLimit      = 300;
    this.minDelaySeconds         = 1;
    this.maxSessionsLimit        = 999;
    this.randomTextRefillDate    = null;
    this.randomTextRefillType    = null;
    this.delayRefillDate         = null;
    this.delayRefillType         = null;

    this._openDialog();
  },

  // ── Dialog setup ───────────────────────────────────────────────────────────
  _openDialog: function () {
    var self = this;
    var $dlg = $("#dialog-edit-break");

    $dlg.dialog({
      modal:     true,
      position:  { my: "center", at: "center", of: $(".page-content-wrapper") },
      width:     "790px",
      draggable: false,
      title:     makeTitleWithBlockName("Choose a Break for '", self.blockName, "'", 790),
      create:    function () { self._onCreate(); },
      open:      function () { self._onOpen(); },
      close:     function () { self._onClose(); },
      buttons: {
        "Close without saving": {
          class: "btn-grey-dialog",
          text:  "Close without saving",
          click: function () { $dlg.dialog("close"); }
        },
        Save: {
          id:    "dialog-edit-break-save",
          class: "btn-green-dialog",
          text:  "Save",
          click: function () { self._onSave(); }
        }
      }
    }).show();
  },

  // ── Create callback ────────────────────────────────────────────────────────
  _onCreate: function () {
    if (this.isFrozenTurkey) {
      $(".break-normal").hide();
      $(".break-frozen").show();
    } else {
      $(".break-frozen").hide();
      $(".break-normal").show();
    }
  },

  // ── Open callback ──────────────────────────────────────────────────────────
  _onOpen: function () {
    var self = this;
    var maxZ = getMaxZ($(".ui-widget-overlay"));
    $(".ui-widget-overlay").filter(function () { return $(this).css("z-index") == maxZ; })
      .off("click").on("click", function () { $("#dialog-edit-break").dialog("close"); });

    this.breakType = this.breakData.split(",")[0];
    if (!isNaN(this.breakType)) {
      this.breakType = (this.breakData.indexOf(",") < 0) ? "allowance" : "pomodoro";
    }
    $("#break-" + this.breakType).trigger("click");

    // Numeric inputs
    var numInputs = [
      "#edit-break-pomodoro-break", "#edit-break-pomodoro-work", "#edit-break-allowance-value",
      "#edit-break-reward-break", "#edit-break-reward-work", "#edit-break-randomText-value",
      "#edit-break-delay-value", "#edit-break-sessions-value"
    ];
    numInputs.forEach(function (sel) { $(sel).numeric("positiveInteger"); });

    this._applyFormatsAndWeekStart();
    this._buildDropdownOptions();

    var parsed = this._parseState();
    this._bindUI(parsed);
    this._applyLockedRestrictions(parsed);
  },

  // ── Helpers ────────────────────────────────────────────────────────────────
  _applyFormatsAndWeekStart: function () {
    this._timeFormat = (settings.settings.show24hour == "true") ? "HH:mm" : "h:mm a";

    var ws = settings.settings.weekStart;
    var dayVal  = (ws == "monday") ? "0" : (ws == "saturday") ? "6" : "0";
    var dayText = (ws == "monday") ? "Sunday" : (ws == "saturday") ? "Saturday" : "Sunday";
    var insertMethod = (ws == "saturday") ? "prepend" : (ws == "monday") ? "append" : "prepend";

    ["allowance", "reward", "sessions"].forEach(function(type) {
      var sel = "#edit-break-" + type + "-day";
      $(sel + " option[value='" + dayVal + "']").remove();
      $(sel)[insertMethod]($("<option>", { value: dayVal, text: dayText }));
    });
  },

  _buildDropdownOptions: function () {
    var self = this;
    var types = ["allowance", "sessions"];

    types.forEach(function(type) {
      var sel = "#edit-break-" + type + "-type";
      $(sel + " option[value='AppState.schedule']").remove();
      $(sel + " option[value='1440']").remove();
      $(sel + " option[value='10080']").remove();
      $(sel + " option[value='43200']").remove();
      $(sel + " option[value='day']").remove();
      $(sel + " option[value='week']").remove();
      $(sel + " option[value='month']").remove();

      if (self.scheduleType == "continuous") {
        $(sel).append($("<option>", { value: "1440", text: "every 24 hours" }));
        $(sel).append($("<option>", { value: "10080", text: "every 7 days" }));
        $(sel).append($("<option>", { value: "43200", text: "every 30 days" }));
        if (type == "allowance") {
          $(sel).append($("<option>", { value: "day", text: "each day (custom refill)" }));
          $(sel).append($("<option>", { value: "week", text: "each week (custom refill)" }));
          $(sel).append($("<option>", { value: "month", text: "each month (midnight, 1st)" }));
        } else {
          $(sel).append($("<option>", { value: "day", text: "every day (custom reset)" }));
          $(sel).append($("<option>", { value: "week", text: "every week (custom reset)" }));
          $(sel).append($("<option>", { value: "month", text: "every month (midnight, 1st)" }));
        }
      } else {
        $(sel).prepend($("<option>", { value: "schedule", text: "during this scheduled block" }));
      }
    });
  },

  // ── Parse state ────────────────────────────────────────────────────────────
  _parseState: function () {
    var p = {
      pomodoroWork: 25, pomodoroBreak: 5,
      allowanceValue: 60, allowanceUnit: "m", allowanceType: (this.scheduleType == "continuous" ? "day" : "schedule"),
      allowanceResetHour: 0, allowanceResetMinute: 0, allowanceResetDay: "0",
      rewardWork: 25, rewardBreak: 5, rewardType: "day",
      rewardResetDay: "0", rewardResetHour: 0, rewardResetMinute: 0,
      randomTextLength: 100, randomTextMaxBreak: "2", randomTextType: "words",
      randomTextErrors: "show", randomTextClear: "keep", randomTextCustomText: "",
      delayValue: 30, delayUnit: "s", delayMaxBreak: "2",
      sessionsValue: 3, sessionsType: "60", sessionsMaxBreak: "0",
      sessionsResetDay: "0", sessionsResetHour: 0, sessionsResetMinute: 0
    };

    var ws = settings.settings.weekStart;
    if (ws == "monday")   { p.allowanceResetDay = "1"; p.rewardResetDay = "1"; p.sessionsResetDay = "1"; }
    if (ws == "saturday") { p.allowanceResetDay = "6"; p.rewardResetDay = "6"; p.sessionsResetDay = "6"; }

    if (this.isFrozenTurkey) {
      p.pomodoroWork = 5; p.pomodoroBreak = 25;
      p.rewardWork = 5; p.rewardBreak = 25;
    }

    var bd = this.breakData;
    if (bd.indexOf("allowance,") == 0) {
      var aParts = bd.replace("allowance,", "").split(",");
      p.allowanceValue = parseInt(aParts[0]); p.allowanceUnit = aParts[1]; p.allowanceType = aParts[2];
      p.allowanceResetDay = aParts[3]; p.allowanceResetHour = parseInt(aParts[4]); p.allowanceResetMinute = parseInt(aParts[5]);
    } else if (bd.indexOf("reward,") == 0) {
      var rParts = bd.replace("reward,", "").split(",");
      p.rewardWork = parseInt(rParts[0]); p.rewardBreak = parseInt(rParts[1]); p.rewardType = rParts[2];
      p.rewardResetDay = rParts[3]; p.rewardResetHour = parseInt(rParts[4]); p.rewardResetMinute = parseInt(rParts[5]);
    } else if (bd.indexOf("randomText,") == 0) {
      var rtParts = bd.replace("randomText,", "").split(",");
      var sParts = rtParts.splice(0, 12); sParts.push(rtParts.join(","));
      p.randomTextLength = parseInt(sParts[0]); p.randomTextMaxBreak = sParts[1]; p.randomTextType = sParts[2];
      this.randomTextRefillType = sParts[3];
      this.randomTextRefillDate = new Date(sParts[4], sParts[5]-1, sParts[6], sParts[7], sParts[8], sParts[9], 0);
      p.randomTextErrors = sParts[10]; p.randomTextClear = sParts[11]; p.randomTextCustomText = sParts[12];
    } else if (bd.indexOf("delay,") == 0) {
      var dParts = bd.replace("delay,", "").split(",");
      p.delayValue = parseInt(dParts[0]); p.delayUnit = dParts[1]; p.delayMaxBreak = dParts[2];
      this.delayRefillType = dParts[3];
      this.delayRefillDate = new Date(dParts[4], dParts[5]-1, dParts[6], dParts[7], dParts[8], dParts[9], 0);
    } else if (bd.indexOf("sessions,") == 0) {
      var sessParts = bd.replace("sessions,", "").split(",");
      p.sessionsValue = parseInt(sessParts[0]); p.sessionsType = sessParts[1]; p.sessionsMaxBreak = sessParts[2];
      p.sessionsResetDay = sessParts[3]; p.sessionsResetHour = parseInt(sessParts[4]); p.sessionsResetMinute = parseInt(sessParts[5]);
    } else if (this.breakType != "none") {
      if (bd.indexOf(",") < 0) {
        p.allowanceValue = parseInt(bd); p.allowanceType = this.scheduleType == "continuous" ? "day" : "schedule";
      } else {
        p.pomodoroWork = parseInt(bd.split(",")[0]); p.pomodoroBreak = parseInt(bd.split(",")[1]);
      }
    }
    return p;
  },

  // ── Bind UI controls ──────────────────────────────────────────────────────
  _bindUI: function (p) {
    var self = this;

    var enterHandler = function (e) { if (e.which == 13) $("#dialog-edit-break-save").click(); };
    ["#edit-break-allowance-value", "#edit-break-pomodoro-work", "#edit-break-pomodoro-break",
     "#edit-break-reward-break", "#edit-break-reward-work", "#edit-break-randomText-value",
     "#edit-break-delay-value", "#edit-break-sessions-value"].forEach(function(sel) {
      $(sel).on("keypress", enterHandler);
    });

    $("#edit-break-pomodoro-work").val(p.pomodoroWork);
    $("#edit-break-pomodoro-break").val(p.pomodoroBreak);

    // Allowance
    var aDate = new Date(2020, 6, 17); aDate.setHours(p.allowanceResetHour, p.allowanceResetMinute, 0, 0);
    $("#edit-break-allowance-value").val(p.allowanceValue);
    $("#edit-break-allowance-unit").val(p.allowanceUnit);
    $("#edit-break-allowance-type").val(p.allowanceType);

    this._updateAllowanceBounds(p.allowanceType);
    $("#edit-break-allowance-type").on("change", function () { self._updateAllowanceBounds(this.value); });
    $("#edit-break-allowance-time").datetimepicker({
      keepOpen: true, date: moment(aDate), format: this._timeFormat, widgetPositioning: { horizontal: "auto", vertical: "bottom" }
    });
    $("#edit-break-allowance-day").val(p.allowanceResetDay);

    // Reward
    var rDate = new Date(2020, 6, 17); rDate.setHours(p.rewardResetHour, p.rewardResetMinute, 0, 0);
    $("#edit-break-reward-work").val(p.rewardWork);
    $("#edit-break-reward-break").val(p.rewardBreak);
    $("#edit-break-reward-type").val(p.rewardType);

    this._updateRewardVisibility(p.rewardType);
    $("#edit-break-reward-type").on("change", function () { self._updateRewardVisibility(this.value); });
    $("#edit-break-reward-time").datetimepicker({
      keepOpen: true, date: moment(rDate), format: this._timeFormat, widgetPositioning: { horizontal: "auto", vertical: "bottom" }
    });
    $("#edit-break-reward-day").val(p.rewardResetDay);

    // RandomText
    $("#edit-break-randomText-errors").val(p.randomTextErrors);
    $("#edit-break-randomText-clear").val(p.randomTextClear);
    $("#edit-break-randomText-type").val(p.randomTextType);
    $("#edit-break-randomText-max-break").val(p.randomTextMaxBreak);
    $("#edit-break-randomText-value").val(p.randomTextLength);
    updateRandomTextDisplay("break", p.randomTextType, p.randomTextLength, p.randomTextCustomText);

    var curRTType = p.randomTextType;
    var curRTCust = p.randomTextCustomText;
    var curRTLen  = p.randomTextLength;
    $("#edit-break-randomText-type").on("change", function () {
      if (this.value != curRTType) {
        if (curRTType == "custom") { curRTCust = $("#edit-break-randomText-example").val().replace(/[\t\v\f ]+/g, " ").trimEnd(); }
        curRTType = this.value;
        updateRandomTextDisplay("break", this.value, parseInt($("#edit-break-randomText-value").val()), curRTCust);
      }
    });
    $("#edit-break-randomText-value").on("keyup paste", function () {
      var len = isNaN(parseInt(this.value)) ? 0 : parseInt(this.value);
      if (len != curRTLen) {
        curRTLen = len;
        updateRandomTextDisplay("break", $("#edit-break-randomText-type").val(), len, curRTCust);
      }
    });

    // Delay
    $("#edit-break-delay-value").val(p.delayValue);
    $("#edit-break-delay-max-break").val(p.delayMaxBreak);
    $("#edit-break-delay-unit").val(p.delayUnit);

    // Sessions
    var sDate = new Date(2020, 6, 17); sDate.setHours(p.sessionsResetHour, p.sessionsResetMinute, 0, 0);
    $("#edit-break-sessions-value").val(p.sessionsValue);
    $("#edit-break-sessions-max").val(p.sessionsMaxBreak);
    $("#edit-break-sessions-type").val(p.sessionsType);

    this._updateSessionsVisibility(p.sessionsType);
    $("#edit-break-sessions-type").on("change", function () { self._updateSessionsVisibility(this.value); });
    $("#edit-break-sessions-time").datetimepicker({
      keepOpen: true, date: moment(sDate), format: this._timeFormat, widgetPositioning: { horizontal: "auto", vertical: "bottom" }
    });
    $("#edit-break-sessions-day").val(p.sessionsResetDay);
  },

  // ── Sub-UI helpers ─────────────────────────────────────────────────────────
  _updateAllowanceBounds: function (val) {
    if (val == "schedule" || val == "day")   this.maxAllowanceMinutes = 1440;
    else if (val == "week")                  this.maxAllowanceMinutes = 10080;
    else if (val == "month")                 this.maxAllowanceMinutes = 43200;
    else                                     this.maxAllowanceMinutes = parseInt(val);

    if (parseInt(val) <= 120) {
      $("#edit-break-allowance-unit").hide();
      $("#edit-break-allowance-minute-hidden").show();
      $("#edit-break-allowance-unit").val("m");
    } else {
      $("#edit-break-allowance-minute-hidden").hide();
      $("#edit-break-allowance-unit").show();
    }

    if (val == "day" || val == "week") {
      $(".hide-show-allowance-reset-day").show();
      if (val == "week") $(".hide-show-allowance-reset-week").show();
      else $(".hide-show-allowance-reset-week").hide();
    } else {
      $(".hide-show-allowance-reset-day").hide();
      $(".hide-show-allowance-reset-week").hide();
    }
  },

  _updateRewardVisibility: function (val) {
    if (this.scheduleType == "continuous") {
      $(".hide-show-reward-reset-schedule").show();
      $(".hide-show-reward-reset-day").show();
      if (val == "week") {
        $(".hide-show-reward-reset-week").show();
      } else {
        $(".hide-show-reward-reset-week").hide();
        if (val == "month") $(".hide-show-reward-reset-day").hide();
      }
    } else {
      $(".hide-show-reward-reset-schedule").hide();
      $(".hide-show-reward-reset-day").hide();
      $(".hide-show-reward-reset-week").hide();
    }
  },

  _updateSessionsVisibility: function (val) {
    if (val == "day" || val == "week") {
      $(".hide-show-sessions-reset-day").show();
      if (val == "week") $(".hide-show-sessions-reset-week").show();
      else $(".hide-show-sessions-reset-week").hide();
    } else {
      $(".hide-show-sessions-reset-day").hide();
      $(".hide-show-sessions-reset-week").hide();
    }
  },

  // ── Apply Locked Restrictions ─────────────────────────────────────────────
  _applyLockedRestrictions: function (p) {
    var isQueuedDelay = isExtensionLock(settings.blocks[this.blockId], "queuedDelay")
      && AppState.configuredQueuedDelays && AppState.configuredQueuedDelays.indexOf(this.blockId) > -1;

    if (this.lockedArg != "false" && !isQueuedDelay) {
      $("#dialog-edit-break .nav-tabs a").on("click", blockTabClick).addClass("not-allowed-tab");
      $("#dialog-edit-break .nav-tabs li").addClass("not-allowed-tab-li");
      $("#break-none").off("click", blockTabClick).removeClass("not-allowed-tab").parent().off("click", blockTabClick).removeClass("not-allowed-tab-li");
      $("#break-" + this.breakType).off("click", blockTabClick).removeClass("not-allowed-tab").parent().removeClass("not-allowed-tab-li");

      this.maxAllowanceMinutes = p.allowanceUnit == "h" ? p.allowanceValue * 60 : p.allowanceValue;
      this.maxRandomTextBreakLimit = p.randomTextMaxBreak;
      this.minRandomTextLength = p.randomTextLength;
      this.maxDelayBreakLimit = p.delayMaxBreak;
      this.minDelaySeconds = p.delayUnit == "h" ? p.delayValue * 3600 : p.delayUnit == "m" ? p.delayValue * 60 : p.delayValue;
      this.maxSessionsLimit = p.sessionsValue;

      var disables = [
        "#edit-break-pomodoro-break", "#edit-break-pomodoro-work", "#edit-break-allowance-type",
        "#edit-break-allowance-day", "#edit-break-reward-break", "#edit-break-reward-work",
        "#edit-break-reward-type", "#edit-break-reward-day", "#edit-break-randomText-type",
        "#edit-break-randomText-errors", "#edit-break-randomText-clear", "#edit-break-sessions-type",
        "#edit-break-sessions-max"
      ];
      disables.forEach(function(s) { $(s).prop("disabled", true); });

      $("#edit-break-allowance-time").data("DateTimePicker").disable();
      $("#edit-break-reward-time").data("DateTimePicker").disable();
      $("#edit-break-sessions-time").data("DateTimePicker").disable();

      if (p.randomTextType == "custom") {
        $("#edit-break-randomText-example").prop("disabled", true).addClass("no-select");
      }
    } else {
      $("#dialog-edit-break .nav-tabs a").off("click", blockTabClick).removeClass("not-allowed-tab");
      $("#dialog-edit-break .nav-tabs li").removeClass("not-allowed-tab-li");

      var enables = [
        "#edit-break-pomodoro-break", "#edit-break-pomodoro-work", "#edit-break-allowance-type",
        "#edit-break-allowance-day", "#edit-break-reward-break", "#edit-break-reward-work",
        "#edit-break-reward-type", "#edit-break-reward-day", "#edit-break-randomText-type",
        "#edit-break-randomText-errors", "#edit-break-randomText-clear", "#edit-break-randomText-example",
        "#edit-break-sessions-type", "#edit-break-sessions-max"
      ];
      enables.forEach(function(s) { $(s).prop("disabled", false); });
      $("#edit-break-randomText-example").removeClass("no-select");

      $("#edit-break-allowance-time").data("DateTimePicker").enable();
      $("#edit-break-reward-time").data("DateTimePicker").enable();
      $("#edit-break-sessions-time").data("DateTimePicker").enable();
    }
  },

  // ── Close callback ────────────────────────────────────────────────────────
  _onClose: function () {
    var $dlg = $("#dialog-edit-break");
    $("#dialog-edit-break .nav-tabs a").off("click", blockTabClick);

    var offs = [
      "#edit-break-pomodoro-break", "#edit-break-pomodoro-work", "#edit-break-allowance-value",
      "#edit-break-reward-work", "#edit-break-reward-break", "#edit-break-randomText-value",
      "#edit-break-delay-value", "#edit-break-sessions-value"
    ];
    offs.forEach(function(s) { $(s).off("keypress"); });
    $("#edit-break-randomText-value").off("keyup paste");

    ["#edit-break-allowance-type", "#edit-break-reward-type", "#edit-break-randomText-type", "#edit-break-sessions-type"].forEach(function(s) { $(s).off("change"); });
    ["#edit-break-allowance-time", "#edit-break-reward-time", "#edit-break-sessions-time"].forEach(function(s) {
      if ($(s).data("DateTimePicker")) $(s).data("DateTimePicker").destroy();
    });

    $dlg.hide();
    $dlg.dialog("destroy");
  },

  // ── Save handler ──────────────────────────────────────────────────────────
  _onSave: function () {
    var self = this;
    var activeTabId = $("#dialog-edit-break .nav-tabs li.active")[0].children[0].id.split("-")[1];
    var savedBreakData = "none";

    // Reusable stats enabler prompt
    var promptStats = function(onEnabled) {
      if (settings.settings.statsEnabled == "true") {
        onEnabled();
      } else {
        var $dlgStats = $("#dialog-settings-enable-statistics");
        $dlgStats.dialog({
          modal: true, position: { my: "center", at: "center", of: $(".page-content-wrapper") }, width: "350px", draggable: false,
          title: "Enable Statistics Feature",
          open: function () {
            var mz = getMaxZ($(".ui-widget-overlay"));
            $(".ui-widget-overlay").filter(function () { return $(this).css("z-index") == mz; })
              .off("click").on("click", function () { $dlgStats.dialog("close"); });
            $dlgStats.parent().focus().off("keypress").on("keypress", function (e) {
              if (e.which == 13) $(this).find(".btn-green-dialog").click();
            });
          },
          close: function () { $dlgStats.hide(); $dlgStats.dialog("destroy"); },
          buttons: {
            "No, don't enable": { class: "btn-grey-dialog", text: "No, don't enable", click: function () { $dlgStats.dialog("close"); } },
            "Yes, enable": {
              class: "btn-green-dialog", text: "Yes, enable",
              click: function () {
                settings.settings.statsEnabled = "true";
                $dlgStats.dialog("close");
                onEnabled();
              }
            }
          }
        }).show();
      }
    };

    var _finalizeSave = function(dataStr) {
      if (typeof self.targetBlockOrElement != "string") {
        $(self.targetBlockOrElement).data("break", dataStr);
        $(self.targetBlockOrElement).html(getBreakText(dataStr, self.blockId));
        $("#dialog-edit-break").dialog("close");
      } else {
        // ── Queued Delay intercept (continuous-break saves only) ──
        var isQDBreak = isExtensionLock(settings.blocks[self.blockId], "queuedDelay")
          && AppState.configuredQueuedDelays && AppState.configuredQueuedDelays.indexOf(self.blockId) > -1
          && settings.blocks[self.blockId].enabled === "true";
        var isFrozenContinuous = self.blockId.indexOf("Frozen Turkey") === 0
          && settings.blocks[self.blockId].type === "continuous";

        if (isQDBreak && !isFrozenContinuous) {
          enqueueBlockConfigChange(self.blockId, { "break": dataStr });
          $("#dialog-edit-break").dialog("close");
          return;
        }

        settings.blocks[self.blockId].break = dataStr;
        $("#dialog-edit-break").dialog("close");
        updateBlocks(false);
        save();
      }
    };

    switch (activeTabId) {
      case "none":
        _finalizeSave("none");
        break;

      case "pomodoro":
        var pw = parseInt($("#edit-break-pomodoro-work").val());
        var pb = parseInt($("#edit-break-pomodoro-break").val());
        if (!(pw > 0) || !(pw <= 999) || !(pb > 0) || !(pb <= 999)) {
          showErrorDialog("#dialog-edit-break-error-pomodoro", "Invalid Pomodoro Values"); return;
        }
        _finalizeSave($("#edit-break-pomodoro-work").val() + "," + $("#edit-break-pomodoro-break").val());
        break;

      case "allowance":
        var aMin = $("#edit-break-allowance-unit").val() == "h" ? parseInt($("#edit-break-allowance-value").val()) * 60 : parseInt($("#edit-break-allowance-value").val());
        if (!(aMin > 0) || !(aMin <= this.maxAllowanceMinutes)) {
          showErrorDialog("#dialog-edit-break-error-allowance", "Invalid Allowance", undefined, function () {
            if (self.lockedArg != "false") {
              $("#dialog-edit-break-error-allowance-max").text($("#edit-break-allowance-unit").val() == "h" ? Math.round(self.maxAllowanceMinutes / 60).toString() + " hour(s)" : self.maxAllowanceMinutes.toString() + " minute(s)");
              $("#dialog-edit-break-error-allowance-locked-text").show();
            } else {
              $("#dialog-edit-break-error-allowance-max").text(self.maxAllowanceMinutes == 30 ? "30 minutes" : (self.maxAllowanceMinutes / 60).toString() + " hour(s)");
              $("#dialog-edit-break-error-allowance-locked-text").hide();
            }
          });
          return;
        }
        promptStats(function() {
          var dt = $("#edit-break-allowance-time").data("DateTimePicker").date().toDate();
          var timeStr = $("#edit-break-allowance-day").val() + "," + dt.getHours() + "," + dt.getMinutes();
          _finalizeSave("allowance," + $("#edit-break-allowance-value").val() + "," + $("#edit-break-allowance-unit").val() + "," + $("#edit-break-allowance-type").val() + "," + timeStr);
        });
        break;

      case "reward":
        var rw = parseInt($("#edit-break-reward-work").val());
        var rb = parseInt($("#edit-break-reward-break").val());
        if (!(rw > 0) || !(rw <= 999) || !(rb > 0) || !(rb <= 999)) {
          showErrorDialog("#dialog-edit-break-error-reward", "Invalid Reward Values"); return;
        }
        promptStats(function() {
          var dt = $("#edit-break-reward-time").data("DateTimePicker").date().toDate();
          var timeStr = $("#edit-break-reward-day").val() + "," + dt.getHours() + "," + dt.getMinutes();
          _finalizeSave("reward," + $("#edit-break-reward-work").val() + "," + $("#edit-break-reward-break").val() + "," + $("#edit-break-reward-type").val() + "," + timeStr);
        });
        break;

      case "randomText":
        if ($("#edit-break-randomText-type").val() != "custom") {
          var rtVal = parseInt($("#edit-break-randomText-value").val());
          if ($("#edit-break-randomText-value").val() == "" || rtVal < this.minRandomTextLength || rtVal > 5000) {
            showErrorDialog("#dialog-edit-break-error-randomText-invalid", "Invalid Random Text Length", undefined, function () {
              $("#dialog-edit-break-randomText-range-min").text(self.minRandomTextLength.toString());
              if (self.lockedArg != "false") $("#dialog-edit-break-randomText-error-range-text").show();
              else $("#dialog-edit-break-randomText-error-range-text").hide();
            });
            return;
          }
        } else {
          var normCT = $("#edit-break-randomText-example").val().trimEnd().replace(/[\t\v\f ]+/g, " ").replace(/(\r\n|\r|\n)/g, "\n").normalizeCustomText();
          if (normCT.length == 0 || normCT.length > 10000) { showErrorDialog("#dialog-edit-randomText-error-invalid-empty", "Invalid Custom Text Length"); return; }
          if (normCT.indexOf("\\") > -1) { showErrorDialog("#dialog-edit-randomText-error-invalid-char", "Invalid Custom Text"); return; }
        }
        if (parseInt($("#edit-break-randomText-max-break").val()) > this.maxRandomTextBreakLimit) {
          showErrorDialog("#dialog-edit-break-error-randomText-break-invalid", "Invalid Random Text Break", function () {
            $("#dialog-edit-break-randomText-break-range-max").text($("#edit-break-randomText-max-break option[value='" + self.maxRandomTextBreakLimit.toString() + "']").text() + "(s)");
          });
          return;
        }
        var rtRefillStr = (this.randomTextRefillDate == undefined) ? "0,0,0,0,0,0" : this.randomTextRefillDate.getFullYear() + "," + (this.randomTextRefillDate.getMonth() + 1) + "," + this.randomTextRefillDate.getDate() + "," + this.randomTextRefillDate.getHours() + "," + this.randomTextRefillDate.getMinutes() + "," + this.randomTextRefillDate.getSeconds();
        if (this.randomTextRefillType == undefined) this.randomTextRefillType = "none";
        var custSave = $("#edit-break-randomText-type").val() == "custom" ? $("#edit-break-randomText-example").val().trimEnd().replace(/[\t\v\f ]+/g, " ").replace(/(\r\n|\r|\n)/g, "\n").normalizeCustomText() : "";
        var savedRT = "randomText," + ($("#edit-break-randomText-value").val() || "100") + "," + $("#edit-break-randomText-max-break").val() + "," + $("#edit-break-randomText-type").val() + "," + this.randomTextRefillType + "," + rtRefillStr + "," + $("#edit-break-randomText-errors").val() + "," + $("#edit-break-randomText-clear").val() + "," + custSave;
        _finalizeSave(savedRT);
        break;

      case "delay":
        var dVal = parseInt($("#edit-break-delay-value").val());
        if ($("#edit-break-delay-unit").val() == "h") dVal *= 3600;
        else if ($("#edit-break-delay-unit").val() == "m") dVal *= 60;

        if ($("#edit-break-delay-value").val() == "" || dVal < this.minDelaySeconds) {
          showErrorDialog("#dialog-edit-break-error-delay", "Invalid Delay", function () {
            if ($("#edit-break-delay-unit").val() == "h") $("#dialog-edit-break-delay-range-min").text((Math.round(self.minDelaySeconds / 3600 * 100) / 100).toString() + " hour(s)");
            else if ($("#edit-break-delay-unit").val() == "m") $("#dialog-edit-break-delay-range-min").text((Math.round(self.minDelaySeconds / 60 * 100) / 100).toString() + " minute(s)");
            else $("#dialog-edit-break-delay-range-min").text(self.minDelaySeconds.toString() + " second(s)");
          });
          return;
        }
        if (parseInt($("#edit-break-delay-max-break").val()) > this.maxDelayBreakLimit) {
          showErrorDialog("#dialog-edit-break-error-delay-break-invalid", "Invalid Delay Break", function () {
            $("#dialog-edit-break-delay-break-range-max").text($("#edit-break-delay-max-break option[value='" + self.maxDelayBreakLimit.toString() + "']").text() + "(s)");
          });
          return;
        }
        var dRefillStr = (this.delayRefillDate == undefined) ? "0,0,0,0,0,0" : this.delayRefillDate.getFullYear() + "," + (this.delayRefillDate.getMonth() + 1) + "," + this.delayRefillDate.getDate() + "," + this.delayRefillDate.getHours() + "," + this.delayRefillDate.getMinutes() + "," + this.delayRefillDate.getSeconds();
        if (this.delayRefillType == undefined) this.delayRefillType = "none";
        _finalizeSave("delay," + $("#edit-break-delay-value").val() + "," + $("#edit-break-delay-unit").val() + "," + $("#edit-break-delay-max-break").val() + "," + this.delayRefillType + "," + dRefillStr);
        break;

      case "sessions":
        var sVal = parseInt($("#edit-break-sessions-value").val());
        if (!(sVal > 0) || !(sVal <= this.maxSessionsLimit)) {
          showErrorDialog("#dialog-edit-break-error-sessions", "Invalid Number of Sessions", function () {
            $("#dialog-edit-break-error-sessions-max").text(self.maxSessionsLimit.toString());
          }, function () {
            if (self.lockedArg != "false") $("#dialog-edit-break-error-sessions-locked-text").show();
            else $("#dialog-edit-break-error-sessions-locked-text").hide();
          });
          return;
        }
        promptStats(function() {
          var dt = $("#edit-break-sessions-time").data("DateTimePicker").date().toDate();
          var timeStr = $("#edit-break-sessions-day").val() + "," + dt.getHours() + "," + dt.getMinutes();
          _finalizeSave("sessions," + $("#edit-break-sessions-value").val() + "," + $("#edit-break-sessions-type").val() + "," + $("#edit-break-sessions-max").val() + "," + timeStr);
        });
        break;

      default:
        _finalizeSave("none");
    }
  }
};

// ── Legacy entry point ────────────────────────────────────────────────────────
export function editBreak(targetBlockOrElement, lockedArg) {
  BreakEditor.open(targetBlockOrElement, lockedArg);
}
