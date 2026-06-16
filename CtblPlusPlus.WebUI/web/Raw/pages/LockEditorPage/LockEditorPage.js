/**
 * @file LockEditorPage.js
 * @description Manages the "Edit Lock" modal dialog.
 *
 * Refactored from a monolithic closure into the LockEditor object.
 * The legacy `editLock()` function is kept as a thin wrapper so no call
 * sites need to change.
 */

import { toggleQueuedDelay } from '../../services/CtblApiClient.js';
import { getMaxZ, showErrorDialog } from '../../components/Modal/Modal';
import { updateRandomTextDisplay } from '../../components/StatsToggle/StatsToggle';
import { ensureStatsEnabled } from '../../components/StatsEnabler/StatsEnabler';
import { getLockDurationWarningText, dist, minutesOfDay } from '../../utils/calculateTime';
import { updateBlocks, blockTabClick } from '../BlocksPage/BlocksPage';
import { AppState } from '../../store/AppState';
import { makeTitleWithBlockName } from '../../utils/formatString';
import { findLockType } from '../../lockTypes';

export var LockEditor = {

  // ── State ──────────────────────────────────────────────────────────────────
  blockName:         null,
  isLocked:          false,
  isFrozenTurkey:    false,
  displayBlockName:  null,
  currentLock:       null,

  // Parsed state from the current lock string
  activeTab:         "none",
  isForChange:       false,
  delayEndDate:      undefined,
  delayStatus:       undefined,
  currentWindowStart: null,
  currentWindowEnd:  null,
  currentWindowType: "lock",
  minRandomTextLength: 1,
  minDelayValue:     1,
  minScheduleBefore: 0,

  // ── Entry point ────────────────────────────────────────────────────────────
  open: function (blockName, isLocked) {
    this.blockName        = blockName;
    this.isLocked         = isLocked;
    var lockMode = settings.blocks[blockName].lock;
    this.matchedLockType = findLockType(blockName, settings.blocks[blockName]);
    if (this.matchedLockType) {
        var editorLockMode = this.matchedLockType.getEditorLockMode(blockName, settings.blocks[blockName]);
        if (editorLockMode != null) {
            lockMode = editorLockMode;
        }
    }
    this.currentLock      = lockMode;
    this.displayBlockName = blockName;
    this.isFrozenTurkey   = false;

    if (blockName.indexOf("Frozen Turkey") == 0) {
      this.isFrozenTurkey = true;
      if (blockName.indexOf("Frozen Turkey,") == 0) {
        this.displayBlockName = blockName.replace("Frozen Turkey,", "");
      }
    } else if (blockName.indexOf("Focused Turkey,") == 0) {
      this.displayBlockName = blockName.replace("Focused Turkey,", "");
    }

    // Reset per-open state
    this.isForChange       = false;
    this.delayEndDate      = undefined;
    this.delayStatus       = undefined;
    this.currentWindowStart = null;
    this.currentWindowEnd  = null;
    this.currentWindowType = "lock";
    this.minRandomTextLength = 1;
    this.minDelayValue     = 1;
    this.minScheduleBefore = 0;

    this._openDialog();
  },

  // ── Dialog setup ───────────────────────────────────────────────────────────
  _openDialog: function () {
    var self = this;
    var $dlg = $("#dialog-edit-lock");

    $dlg.dialog({
      modal:     true,
      position:  { my: "center", at: "center", of: $(".page-content-wrapper") },
      width:     "890px",
      draggable: false,
      title:     makeTitleWithBlockName("Choose a Lock for '", self.displayBlockName, "'", 890),
      open:      function () { self._onOpen(); },
      close:     function () { self._onClose(); },
      buttons: {
        "Close without saving": {
          class: "btn-grey-dialog",
          text:  "Close without saving",
          click: function () { $dlg.dialog("close"); }
        },
        Save: {
          id:    "dialog-edit-lock-save",
          class: "btn-green-dialog",
          text:  "Save",
          click: function () { self._onSave(); }
        }
      }
    }).show();
  },

  // ── Open callback ──────────────────────────────────────────────────────────
  _onOpen: function () {
    var self = this;

    // Overlay click-to-close
    var maxZ = getMaxZ($(".ui-widget-overlay"));
    $(".ui-widget-overlay").filter(function () {
      return $(this).css("z-index") == maxZ;
    }).off("click").on("click", function () {
      $("#dialog-edit-lock").dialog("close");
    });

    // Determine which tab to activate
    this.activeTab = this.currentLock.split(",")[0];
    if (!isNaN(this.activeTab)) { this.activeTab = "timer"; }
    $("#lock-" + this.activeTab).trigger("click");

    // Numeric input constraints
    $("#edit-lock-randomText-value").numeric("positiveInteger");
    $("#edit-lock-delay-value").numeric("positiveInteger");

    this._applyDatetimeFormat();
    this._applyWeekStart();
    this._applyBlockTypeVisibility();
    this._applyFrozenVisibility();

    // Parse existing lock string into local vars
    var parsed = this._parseState();

    this._bindUI(parsed);
    this._applyLockedRestrictions(parsed);
  },

  // ── Datetime / week-start helpers ──────────────────────────────────────────
  _applyDatetimeFormat: function () {
    if (settings.settings.show24hour === "true") {
      this._datetimeFormat = "HH:mm, D MMM YYYY";
      this._timeFormat     = "HH:mm";
    } else {
      this._datetimeFormat = "h:mm a, D MMM YYYY";
      this._timeFormat     = "h:mm a";
    }
  },

  _applyWeekStart: function () {
    var ws = settings.settings.weekStart;
    if (ws == "monday") {
      $(".saturday-first").hide();
      $(".sunday-first").hide();
      $(".monday-first").show();
    } else if (ws == "saturday") {
      $(".sunday-first").hide();
      $(".monday-first").hide();
      $(".saturday-first").show();
    } else {
      $(".monday-first").hide();
      $(".saturday-first").hide();
      $(".sunday-first").show();
    }
  },

  _applyBlockTypeVisibility: function () {
    if (settings.blocks[this.blockName].type == "continuous") {
      $("#lock-schedule").hide();
    } else {
      $("#lock-schedule").show();
    }
    if (settings.blocks[this.blockName].autostart == "login") {
      $("#lock-restart").hide();
    } else {
      $("#lock-restart").show();
    }
  },

  _applyFrozenVisibility: function () {
    if (this.isFrozenTurkey) {
      $(".lock-schedule-normal").hide();
      $(".lock-schedule-frozen").show();
      $("#edit-lock-schedule-before option[value='0']").remove();
    } else {
      $(".lock-schedule-frozen").hide();
      $(".lock-schedule-normal").show();
      if ($("#edit-lock-schedule-before option[value='0']").length == 0) {
        $("#edit-lock-schedule-before").prepend($("<option>", { value: "0", text: "not" }));
      }
    }
  },

  // ── Parse current lock string into UI defaults ─────────────────────────────
  _parseState: function () {
    var blockName   = this.blockName;
    var currentLock = this.currentLock;
    var parsed = {
      lockUnblock:       true,
      randomTextLength:  200,
      randomTextType:    "words",
      randomTextErrors:  "show",
      randomTextClear:   "keep",
      randomTextCustom:  "",
      delayValue:        5,
      delayUnit:         "m",
      delayUnblock:      true,
      windowStartDate:   (function() { var d = new Date(); d.setHours(9,0,0,0); return d; })(),
      windowEndDate:     (function() { var d = new Date(); d.setHours(17,0,0,0); return d; })(),
      windowType:        "lock",
      windowDays:        "0123456",
      restartUnblock:    true,
      scheduleBefore:    30,
      scheduleUnlock:    false,
      passwordVal:       "",
      timerDate:         new Date(),
      now:               (function() { var d = new Date(); d.setSeconds(0,0); return d; })(),
      maxDate:           new Date(2037, 11, 31, 23, 59)
    };

    if (currentLock.indexOf("randomText") == 0) {
      var rtLen = settings.blocks[blockName].randomTextLength;
      if (rtLen.indexOf(",") > 0) {
        var rtParts   = rtLen.split(",");
        var rtSpliced = rtParts.splice(0, 4);
        rtSpliced.push(rtParts.join(","));
        parsed.randomTextLength  = parseInt(rtSpliced[0]);
        parsed.randomTextType    = rtSpliced[1];
        parsed.randomTextErrors  = rtSpliced[2];
        parsed.randomTextClear   = rtSpliced[3];
        parsed.randomTextCustom  = rtSpliced[4];
      } else {
        parsed.randomTextLength = parseInt(rtLen);
      }
    } else if (currentLock.indexOf("delay") == 0) {
      var dParts = currentLock.replace("delay,", "").split(",");
      parsed.delayValue   = parseInt(dParts[0]);
      parsed.delayUnit    = dParts[1];
      parsed.delayUnblock = dParts[2] == "true";
      this.delayStatus    = dParts[3];
      this.delayEndDate   = new Date(dParts[4], dParts[5]-1, dParts[6], dParts[7], dParts[8], dParts[9], 0);
    } else if (currentLock.indexOf("window") == 0) {
      var wParts = settings.blocks[blockName].window.split("@");
      parsed.windowStartDate.setHours(parseInt(wParts[1].split(",")[0]), parseInt(wParts[1].split(",")[1]), 0, 0);
      parsed.windowEndDate.setHours(parseInt(wParts[2].split(",")[0]),   parseInt(wParts[2].split(",")[1]), 0, 0);
      parsed.windowType = wParts[0];
      if (wParts[3]) { parsed.windowDays = wParts[3]; }
    } else if (currentLock.indexOf("schedule") == 0) {
      if (currentLock.indexOf(",") > 0) {
        var sParts = currentLock.replace("schedule,", "").split(",");
        parsed.scheduleBefore  = parseInt(sParts[0]);
        parsed.scheduleUnlock  = sParts[1] == "true";
      } else if (blockName != "Frozen Turkey" && blockName.indexOf("Frozen Turkey,") != 0 && blockName.indexOf("Focused Turkey,") != 0) {
        parsed.scheduleBefore = 0;
      }
    } else if (currentLock.indexOf("queuedDelay") == 0) {
      if (LockEditor.matchedLockType) {
        var parsedQueuedDelay = LockEditor.matchedLockType.parseEditorState(currentLock);
        parsed.queuedDelayUnblock = parsedQueuedDelay.queuedDelayUnblock;
      } else if (currentLock.indexOf(",") > 0) {
        var qParts = currentLock.replace("queuedDelay,", "").split(",");
        parsed.queuedDelayUnblock = qParts[0] == "true";
      } else {
        parsed.queuedDelayUnblock = false;
      }
    } else if (currentLock.indexOf("restart") == 0) {
      if (settings.blocks[blockName].restartUnblock != "true") {
        parsed.restartUnblock = false;
      }
    } else if (currentLock.indexOf("password") == 0) {
      parsed.passwordVal = settings.blocks[blockName].password.normalizePassword();
    } else if (currentLock != "none") {
      var tParts = currentLock.split(",");
      parsed.timerDate = new Date(tParts[0], tParts[1]-1, tParts[2], tParts[3], tParts[4], 0, 0);
      if (settings.blocks[blockName].lockUnblock != "true") {
        parsed.lockUnblock = false;
      }
    }

    return parsed;
  },

  // ── Bind UI controls ──────────────────────────────────────────────────────
  _bindUI: function (p) {
    var self = this;

    // Enter-key shortcuts
    $("#edit-lock-randomText-value").on("keypress", function (e) { if (e.which==13) { $("#dialog-edit-lock-save").click(); } });
    $("#edit-lock-delay-value").on("keypress",      function (e) { if (e.which==13) { $("#dialog-edit-lock-save").click(); } });
    $("#edit-lock-password2").on("keypress",        function (e) { if (e.which==13) { $("#dialog-edit-lock-save").click(); } });

    // Timer datepicker
    $("#edit-lock-for").val("custom");
    $("#edit-lock-for").on("change", function () {
      if (this.value != "custom") {
        self.isForChange = true;
        var d = this.value == "forever"
          ? new Date(2037, 11, 31)
          : moment(new Date()).add(parseInt(this.value, 10), "m").toDate();
        $("#edit-lock-timer-datetime").data("DateTimePicker").date(d);
      }
    });
    $("#edit-lock-timer-datetime").datetimepicker({
      sideBySide: true,
      keepOpen:   true,
      date:       p.timerDate > p.now ? p.timerDate : p.now,
      minDate:    p.now,
      maxDate:    p.maxDate,
      format:     this._datetimeFormat,
      widgetPositioning: { horizontal: "auto", vertical: "bottom" }
    }).on("dp.change", function () {
      if (self.isForChange) { self.isForChange = false; }
      else { $("#edit-lock-for").val("custom"); }
    });

    // Random-text controls
    $("#lock_unblock").prop("checked", p.lockUnblock);
    $("#edit-lock-randomText-errors").val(p.randomTextErrors);
    $("#edit-lock-randomText-clear").val(p.randomTextClear);
    $("#edit-lock-randomText-type").val(p.randomTextType);
    $("#edit-lock-randomText-value").val(p.randomTextLength.toString());
    updateRandomTextDisplay("lock", p.randomTextType, p.randomTextLength, p.randomTextCustom);

    var prevRTType   = p.randomTextType;
    var prevRTLength = p.randomTextLength;
    var rtCustom     = p.randomTextCustom;

    $("#edit-lock-randomText-type").on("change", function () {
      if (this.value != prevRTType) {
        if (prevRTType == "custom") {
          rtCustom = $("#edit-lock-randomText-example").val().replace(/[\t\v\f ]+/g, " ").trimEnd();
        }
        prevRTType = this.value;
        updateRandomTextDisplay("lock", this.value, parseInt($("#edit-lock-randomText-value").val()), rtCustom);
      }
    });
    $("#edit-lock-randomText-value").on("keyup paste", function () {
      var len = isNaN(parseInt(this.value)) ? 0 : parseInt(this.value);
      if (len != prevRTLength) {
        prevRTLength = len;
        updateRandomTextDisplay("lock", $("#edit-lock-randomText-type").val(), len, rtCustom);
      }
    });

    // Delay controls
    $("#edit-lock-delay-value").val(p.delayValue);
    $("#edit-lock-delay-unit").val(p.delayUnit);
    $("#delay_unblock").prop("checked", p.delayUnblock);

    // Queued Delay controls
    if (LockEditor.matchedLockType) {
      LockEditor.matchedLockType.bindEditorUI(p);
    } else {
      $("#queuedDelay_unblock").prop("checked", p.queuedDelayUnblock);
    }

    // Window controls
    var currentWindowStartVal = p.windowStartDate;
    var currentWindowEndVal   = p.windowEndDate;
    if (p.windowEndDate <= p.windowStartDate) { $(".next-day-warning").show(); }
    else { $(".next-day-warning").hide(); }
    $("#edit-lock-window-type").val(p.windowType);
    $("#edit-lock-window-start").datetimepicker({
      keepOpen: true, date: moment(p.windowStartDate), format: this._timeFormat,
      widgetPositioning: { horizontal: "auto", vertical: "bottom" }
    }).on("dp.change", function (e) {
      var d = e.date.toDate(); d.setDate(new Date().getDate());
      currentWindowStartVal = d;
      if (currentWindowEndVal <= currentWindowStartVal) { $(".next-day-warning").show(); }
      else { $(".next-day-warning").hide(); }
    });
    $("#edit-lock-window-end").datetimepicker({
      keepOpen: true, date: moment(p.windowEndDate), format: this._timeFormat,
      widgetPositioning: { horizontal: "auto", vertical: "bottom" }
    }).on("dp.change", function (e) {
      var d = e.date.toDate(); d.setDate(new Date().getDate());
      currentWindowEndVal = d;
      if (currentWindowEndVal <= currentWindowStartVal) { $(".next-day-warning").show(); }
      else { $(".next-day-warning").hide(); }
    });

    // Window day checkboxes
    $(".edit-lock-window-checkbox input").prop("checked", false);
    $.each(p.windowDays.split(""), function (i, dayVal) {
      var dayOffset = settings.settings.weekStart == "monday" ? "1" : settings.settings.weekStart == "saturday" ? "6" : "0";
      $("#lock-" + dayOffset + "-day-" + dayVal).prop("checked", true);
    });

    // Schedule / restart / password controls
    $("#edit-lock-schedule-before").val(p.scheduleBefore);
    $("#schedule_unlock").prop("checked", p.scheduleUnlock);
    $("#restart_unblock").prop("checked", p.restartUnblock);
    $("#edit-lock-password1").val(p.passwordVal);
    $("#edit-lock-password2").val(p.passwordVal);

    // Store window vals for save-time validation
    this._currentWindowStartVal = currentWindowStartVal;
    this._currentWindowEndVal   = currentWindowEndVal;
  },

  // ── Apply restrictions when block is already locked ───────────────────────
  _applyLockedRestrictions: function (p) {
    if (this.isLocked != "false") {
      $("#dialog-edit-lock .nav-tabs a").on("click", blockTabClick).addClass("not-allowed-tab");
      $("#dialog-edit-lock .nav-tabs li").addClass("not-allowed-tab-li");
      $("#lock-" + this.activeTab).removeClass("not-allowed-tab");
      $("#lock-" + this.activeTab).parent().removeClass("not-allowed-tab-li");
      $("#edit-lock-timer-datetime").data("DateTimePicker").minDate(p.timerDate);
      this.minRandomTextLength = p.randomTextLength;
      this.minScheduleBefore   = p.scheduleBefore;
      this.minDelayValue       = p.delayUnit == "h" ? p.delayValue * 60 : p.delayValue;
      $("#edit-lock-for").prop("disabled", true);
      $("#edit-lock-randomText-type").prop("disabled", true);
      $("#edit-lock-randomText-errors").prop("disabled", true);
      $("#edit-lock-randomText-clear").prop("disabled", true);
      if (p.randomTextType == "custom") {
        $("#edit-lock-randomText-example").prop("disabled", true).addClass("no-select");
      }
      this.currentWindowStart = p.windowStartDate;
      this.currentWindowEnd   = p.windowEndDate;
      this.currentWindowType  = p.windowType;
      $("#edit-lock-window-type").prop("disabled", true);
      if (p.windowType == "lock") {
        $(".edit-lock-window-checkbox input:checked").prop("disabled", true);
      } else {
        $(".edit-lock-window-checkbox input:not(:checked)").prop("disabled", true);
      }
      if (this.minScheduleBefore == 0) { $("#edit-lock-schedule-before").prop("disabled", true); }
      if (!$("#schedule_unlock").is(":checked")) { $("#schedule_unlock").prop("disabled", true); }
      $("#edit-lock-password1").prop("disabled", true).css("user-select", "none");
      $("#edit-lock-password2").prop("disabled", true).css("user-select", "none");
    } else {
      $("#dialog-edit-lock .nav-tabs a").off("click", blockTabClick).removeClass("not-allowed-tab");
      $("#dialog-edit-lock .nav-tabs li").removeClass("not-allowed-tab-li");
      $("#edit-lock-for").prop("disabled", false);
      $("#edit-lock-randomText-type").prop("disabled", false);
      $("#edit-lock-randomText-errors").prop("disabled", false);
      $("#edit-lock-randomText-clear").prop("disabled", false);
      $("#edit-lock-randomText-example").prop("disabled", false).removeClass("no-select");
      $("#edit-lock-window-type").prop("disabled", false);
      $(".edit-lock-window-checkbox input").prop("disabled", false);
      $("#edit-lock-schedule-before").prop("disabled", false);
      $("#schedule_unlock").prop("disabled", false);
      $("#edit-lock-password1").prop("disabled", false).css("user-select", "text");
      $("#edit-lock-password2").prop("disabled", false).css("user-select", "text");
    }
  },

  // ── Close callback ────────────────────────────────────────────────────────
  _onClose: function () {
    var $dlg = $("#dialog-edit-lock");
    $("#dialog-edit-lock .nav-tabs a").off("click", blockTabClick);
    ["#edit-lock-timer-datetime", "#edit-lock-window-start", "#edit-lock-window-end"].forEach(function (sel) {
      $(sel).off("dp.change");
      $(sel).data("DateTimePicker").destroy();
    });
    $("#edit-lock-randomText-type").off("change");
    $("#edit-lock-randomText-value").off("keyup paste").off("keypress");
    $("#edit-lock-delay-value").off("keypress");
    $("#edit-lock-password2").off("keypress");
    $("#edit-lock-for").off("change");
    $dlg.hide();
    $dlg.dialog("destroy");
  },

  // ── Save handler ──────────────────────────────────────────────────────────
  _onSave: function () {
    var self        = this;
    var blockName   = this.blockName;
    var $dlg        = $("#dialog-edit-lock");
    var selectedLockType = $("#dialog-edit-lock .nav-tabs li.active")[0].children[0].id.split("-")[1];

    var lockConfig      = settings.blocks[blockName].lock;
    var passwordConfig  = settings.blocks[blockName].password;
    var randomTextConfig = settings.blocks[blockName].randomTextLength;
    var windowConfig    = settings.blocks[blockName].window;

    switch (selectedLockType) {
      case "none":
        lockConfig = "none";
        break;

      case "randomText":
        if ($("#edit-lock-randomText-type").val() != "custom") {
          var rtVal = parseInt($("#edit-lock-randomText-value").val());
          if ($("#edit-lock-randomText-value").val() == "" || rtVal < this.minRandomTextLength || rtVal > 5000) {
            showErrorDialog("#dialog-edit-lock-randomText-error-invalid", "Invalid Random Text Length", function () {
              $("#dialog-edit-lock-randomText-range-min").text(self.minRandomTextLength.toString());
            }, function () {
              if (self.isLocked != "false") { $("#dialog-edit-lock-randomText-error-range-text").show(); }
              else { $("#dialog-edit-lock-randomText-error-range-text").hide(); }
            });
            return;
          }
        } else {
          var ctNorm = $("#edit-lock-randomText-example").val().trimEnd().replace(/[\t\v\f ]+/g, " ").replace(/(\r\n|\r|\n)/g, "\n").normalizeCustomText();
          if (ctNorm.length == 0 || ctNorm.length > 10000) {
            showErrorDialog("#dialog-edit-randomText-error-invalid-empty", "Invalid Custom Text Length");
            return;
          }
          if (ctNorm.indexOf("\\") > -1) {
            showErrorDialog("#dialog-edit-randomText-error-invalid-char", "Invalid Custom Text");
            return;
          }
        }
        lockConfig = "randomText";
        var customTextValue = $("#edit-lock-randomText-type").val() == "custom"
          ? $("#edit-lock-randomText-example").val().trimEnd().replace(/[\t\v\f ]+/g, " ").replace(/(\r\n|\r|\n)/g, "\n").normalizeCustomText()
          : "";
        randomTextConfig = ($("#edit-lock-randomText-value").val() || "200") + "," +
          $("#edit-lock-randomText-type").val() + "," +
          $("#edit-lock-randomText-errors").val() + "," +
          $("#edit-lock-randomText-clear").val() + "," + customTextValue;
        break;

      case "delay":
        var inputDelay = parseInt($("#edit-lock-delay-value").val());
        if ($("#edit-lock-delay-unit").val() == "h") { inputDelay *= 60; }
        if ($("#edit-lock-delay-value").val() == "" || inputDelay < this.minDelayValue) {
          showErrorDialog("#dialog-edit-lock-delay-error-invalid", "Invalid Delay", function () {
            if ($("#edit-lock-delay-unit").val() == "h") {
              $("#dialog-edit-lock-delay-range-min").text((Math.round(self.minDelayValue / 60 * 100) / 100).toString() + " hour(s)");
            } else {
              $("#dialog-edit-lock-delay-range-min").text(self.minDelayValue.toString() + " minute(s)");
            }
          });
          return;
        }
        var delayDateString = (this.delayEndDate == undefined)
          ? "0,0,0,0,0,0"
          : this.delayEndDate.getFullYear() + "," + (this.delayEndDate.getMonth()+1) + "," +
            this.delayEndDate.getDate() + "," + this.delayEndDate.getHours() + "," +
            this.delayEndDate.getMinutes() + "," + this.delayEndDate.getSeconds();
        if (this.delayStatus == undefined || this.delayStatus == "unlocked") { this.delayStatus = "none"; }
        lockConfig = "delay," + $("#edit-lock-delay-value").val() + "," + $("#edit-lock-delay-unit").val() + "," +
          $("#delay_unblock").is(":checked").toString() + "," + this.delayStatus + "," + delayDateString;
        break;

      case "password":
        if ($("#edit-lock-password1").val().normalizePassword() == "") {
          showErrorDialog("#dialog-settings-password-error-blank", "Invalid Password"); return;
        }
        if ($("#edit-lock-password1").val().normalizePassword() != $("#edit-lock-password2").val().normalizePassword()) {
          showErrorDialog("#dialog-edit-lock-password-error-match", "Passwords Don't Match"); return;
        }
        if ($("#edit-lock-password1").val().normalizePassword().indexOf("\\") > -1) {
          showErrorDialog("#dialog-edit-lock-password-error-invalid", "Invalid Password"); return;
        }
        lockConfig    = "password";
        passwordConfig = $("#edit-lock-password1").val().normalizePassword();
        break;

      case "window":
        var wStart = $("#edit-lock-window-start").data("DateTimePicker").date().toDate();
        var wEnd   = $("#edit-lock-window-end").data("DateTimePicker").date().toDate();
        var wDays  = "";
        $(".edit-lock-window-checkbox input:checked").each(function () { wDays += this.id.slice(-1); });
        if ((wStart.toTimeString() == wEnd.toTimeString() && wDays.length == 7) || wDays.length == 0) {
          showErrorDialog("#dialog-edit-lock-window-invalid", "Invalid Time Range"); return;
        }
        if (this.currentWindowStart != null && this.currentWindowEnd != null) {
          var csMin = minutesOfDay(this.currentWindowStart);
          var ceMin = minutesOfDay(this.currentWindowEnd);
          var ssMin = minutesOfDay(wStart);
          var seMin = minutesOfDay(wEnd);
          var cd    = dist(csMin, ceMin);
          var sd    = dist(ssMin, seMin);
          if ((this.currentWindowType == "lock"   && (dist(ssMin, csMin) > sd || dist(ssMin, ceMin) > sd)) ||
              (this.currentWindowType == "unlock"  && (dist(csMin, ssMin) > cd || dist(csMin, seMin) > cd))) {
            $("#edit-lock-window-start").data("DateTimePicker").date(this.currentWindowStart);
            $("#edit-lock-window-end").data("DateTimePicker").date(this.currentWindowEnd);
            showErrorDialog("#dialog-edit-lock-window-invalid-range", "Invalid Time Range"); return;
          }
        }
        windowConfig = $("#edit-lock-window-type").val() + "@" +
          wStart.getHours() + "," + wStart.getMinutes() + "@" +
          wEnd.getHours()   + "," + wEnd.getMinutes()   + "@" + wDays;
        lockConfig = "window";
        break;

      case "restart":
        lockConfig = "restart";
        break;

      case "schedule":
        if (parseInt($("#edit-lock-schedule-before").val()) < this.minScheduleBefore) {
          showErrorDialog("#dialog-edit-lock-schedule-error-invalid", "Invalid Schedule Lock", function () {
            $("#dialog-edit-lock-schedule-range-min").text(
              $("#edit-lock-schedule-before option[value='" + self.minScheduleBefore + "']").text() + "(s)"
            );
          });
          return;
        }
        lockConfig = "schedule," + $("#edit-lock-schedule-before").val() + "," + $("#schedule_unlock").is(":checked").toString();
        break;

      case "queuedDelay":
        lockConfig = LockEditor.matchedLockType ? LockEditor.matchedLockType.buildLockConfig() : "queuedDelay," + $("#queuedDelay_unblock").is(":checked").toString();
        break;

      case "timer":
        var timerMin = new Date(new Date().getTime() + 60000);
        var timerSel = null;
        if ($("#edit-lock-timer-datetime").data("DateTimePicker").date() != null) {
          timerSel = $("#edit-lock-timer-datetime").data("DateTimePicker").date().toDate();
        }
        if (timerSel == null || timerMin >= timerSel) {
          showErrorDialog("#dialog-edit-lock-timer-error-invalid", "Invalid Date & Time"); return;
        }
        lockConfig = timerSel.getFullYear() + "," + (timerSel.getMonth()+1) + "," +
          timerSel.getDate() + "," + timerSel.getHours() + "," + timerSel.getMinutes();
        break;

      default:
        lockConfig = "none";
    }

    // Apply & save
    var applyAndSave = function () {
      var $dlg = $("#dialog-edit-lock");
      $dlg.dialog("close");
      
      if (lockConfig && lockConfig.indexOf("queuedDelay") === 0) {
          var queuedDelaySaveResult = LockEditor.matchedLockType ? LockEditor.matchedLockType.onSave(blockName) : null;
          if (queuedDelaySaveResult) {
              passwordConfig = queuedDelaySaveResult.password;
              lockConfig = queuedDelaySaveResult.lock;
          } else {
              toggleQueuedDelay(blockName, true);
              if (AppState.configuredQueuedDelays && AppState.configuredQueuedDelays.indexOf(blockName) === -1) {
                  AppState.configuredQueuedDelays.push(blockName);
              }
              passwordConfig = "CTBL_QUEUED_DELAY";
              lockConfig = "password";
          }
      } else {
          toggleQueuedDelay(blockName, false);
          if (AppState.configuredQueuedDelays) {
              var idx = AppState.configuredQueuedDelays.indexOf(blockName);
              if (idx > -1) {
                  AppState.configuredQueuedDelays.splice(idx, 1);
              }
          }
      }

      settings.blocks[blockName].lock             = lockConfig;
      settings.blocks[blockName].password         = passwordConfig;
      settings.blocks[blockName].randomTextLength = randomTextConfig;
      settings.blocks[blockName].window           = windowConfig;
      settings.blocks[blockName].lockUnblock      = $("#lock_unblock").is(":checked").toString();
      settings.blocks[blockName].restartUnblock   = $("#restart_unblock").is(":checked").toString();
      $.each(AppState.unlockedBlocks, function (i, name) {
        if (name.indexOf(blockName + "\\") == 0) { AppState.unlockedBlocks.splice(i, 1); }
      });
      updateBlocks(false);
      save();
    };

    if (selectedLockType != "none" && settings.blocks[blockName].enabled == "true") {
      ensureStatsEnabled(blockName, true, function () {
        var $warn = $("#dialog-edit-lock-starting-blocked-warning");
        $warn.dialog({
          modal: true,
          position: { my: "center", at: "center", of: $(".page-content-wrapper") },
          width: "500px",
          draggable: false,
          title: "Lock " + getLockDurationWarningText(lockConfig, randomTextConfig, windowConfig) + "?",
          open: function () {
            var mz = getMaxZ($(".ui-widget-overlay"));
            $(".ui-widget-overlay").filter(function () { return $(this).css("z-index") == mz; })
              .off("click").on("click", function () { $warn.dialog("close"); });
            $warn.parent().focus();
          },
          close: function () { $warn.dialog("destroy"); $warn.hide(); },
          buttons: {
            "Wait, no!": {
              class: "btn-grey-dialog", text: "Wait, no!",
              click: function () { $warn.dialog("close"); }
            },
            Yes: {
              class: "btn-green-dialog",
              text: "Lock " + getLockDurationWarningText(lockConfig, randomTextConfig, windowConfig).toLowerCase(),
              click: function () { $warn.dialog("close"); applyAndSave(); }
            }
          }
        }).show();
      });
    } else {
      applyAndSave();
    }
  }
};

// ── Legacy entry point (keeps all existing call sites working) ────────────────
export function editLock(blockName, isLocked) {
  LockEditor.open(blockName, isLocked);
}
