
import { getMaxZ } from '../Modal/Modal';
import { updateBlocks } from '../../pages/BlocksPage/BlocksPage';
import { updateSettings } from '../../pages/SettingsPage/SettingsPage';
import { AppState } from '../../store/AppState';

export function addRemovePayWallEvents() {
  switch (settings.additional.proStatus) {
    case "free":
      $("#sidebar-button-upgrade").show();
      $(".pro-cursor").off("click", showPayWall);
      $(".pro-cursor").on("click", showPayWall);
      break;
    case "trialed":
      $("#sidebar-button-upgrade").show();
      $(".pro-cursor-trial").addClass("pro-cursor");
      $(".pro-cursor-trial").removeClass("pro-cursor-trial");
      $(".pro-cursor").off("click", showPayWall);
      $(".pro-cursor").on("click", showPayWall);
      $(".trialed").hide();
      break;
    case "trial":
      $("#sidebar-button-upgrade").show();
      $(".pro-cursor").off("click", showPayWall);
      $(".pro-cursor").addClass("pro-cursor-trial");
      $(".pro-cursor").removeClass("pro-cursor");
      $(".trialed").hide();
      break;
    case "pro":
      $("#sidebar-button-upgrade").hide();
      $(".pro-cursor").off("click", showPayWall);
      $(".pro-cursor").removeClass("pro-cursor");
      $(".pro-cursor-trial").off("click", showPayWall);
      $(".pro-cursor-trial").removeClass("pro-cursor-trial");
      break;
    default:
      $("#sidebar-button-upgrade").show();
      $(".pro-cursor").off("click", showPayWall);
      $(".pro-cursor").on("click", showPayWall);
      $(".trialed").hide();
      break;
  }
}
export function showPayWall(event) {
  if (event !== undefined) {
    event.preventDefault();
    event.stopPropagation();
  }
  var $paywallDialog = $("#dialog-paywall");
  $paywallDialog.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "450px",
    draggable: false,
    title: "Please Consider Upgrading",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $paywallDialog.dialog("close");
      });
      $paywallDialog.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $paywallDialog.parent().off("keypress");
      $paywallDialog.dialog("destroy");
      $paywallDialog.hide();
    },
    buttons: {
      Upgrade: {
        text: "Upgrade",
        class: "btn-grey-dialog",
        click: function () {
          $paywallDialog.dialog("close");
          showUpgradeModal();
        }
      },
      Close: {
        text: "Close",
        class: "btn-green-dialog",
        click: function () {
          $paywallDialog.dialog("close");
        }
      }
    }
  }).show();
}
export function showUpgradeModal() {
  var $upgradeDialog = $("#dialog-upgrade");
  $upgradeDialog.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "650px",
    draggable: false,
    dialogClass: "noTitleModal",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $upgradeDialog.dialog("close");
      });
      $("#upgrade-key").focus();
      $("#upgrade-key").on("keydown", function (event) {
        event = event ? event : window.event;
        var keyCode = event.which ? event.which : event.keyCode;
        if (keyCode == 13) {
          event.preventDefault();
          $("#upgrade-button").click();
        }
      });
    },
    close: function () {
      $("#upgrade-key").off("keydown");
      $upgradeDialog.dialog("destroy");
      $upgradeDialog.hide();
    },
    buttons: {
      Close: {
        text: "Close",
        class: "btn-green-dialog",
        click: function () {
          $upgradeDialog.dialog("close");
        }
      }
    }
  }).show();
}
export function showTrialModal() {
  if (settings.additional.proStatus == "trial") {
    var trialEndDate = moment(settings.additional.trialEnd, ["YYYY,M,D,H,m"]);
    if (moment().isBefore(trialEndDate)) {
      $("#dialog-upgrade-trial-reminder-body").html("<p>Your pro trial ends in <span class=\"bold\">" + trialEndDate.toNow(true) + "</span>. The following settings will be deleted unless you upgrade before the trial ends:</p><ol><li>Block schedules</li><li>Block passwords</li><li>Block breaks</li><li>Apps in all blocks</li><li>Custom user selections for blocks</li><li>Settings password</li></ol>");
    } else {
      $("#dialog-upgrade-trial-reminder-body").html("<p>Unfortunately, your pro trial has ended. Only the settings that require the pro version have been deleted. You can continue to use the free features as long as you want.");
      deleteProSettings();
    }
    var $trialReminderDialog = $("#dialog-upgrade-trial-reminder");
    $trialReminderDialog.dialog({
      modal: true,
      position: {
        my: "center",
        at: "center",
        of: $(".page-content-wrapper")
      },
      width: "400px",
      draggable: false,
      title: "Trial Status",
      open: function () {
        var maxZIndex = getMaxZ($(".ui-widget-overlay"));
        $(".ui-widget-overlay").filter(function () {
          return $(this).css("z-index") == maxZIndex;
        }).off("click").on("click", function () {
          $trialReminderDialog.dialog("close");
        });
        $trialReminderDialog.parent().focus().off("keypress").on("keypress", function (event) {
          if (event.which == 13) {
            $(this).find(".btn-green-dialog").click();
          }
        });
      },
      close: function () {
        $trialReminderDialog.parent().off("keypress");
        $trialReminderDialog.dialog("destroy");
        $trialReminderDialog.hide();
      },
      buttons: {
        Close: {
          class: "btn-green-dialog",
          text: "Close",
          click: function () {
            $trialReminderDialog.dialog("close");
          }
        }
      }
    }).show();
  }
}
export function deleteProSettings() {
  settings.additional.proStatus = "trialed";
  $.each(settings.blocks, function (blockIndex, blockData) {
    blockData.apps = [];
    blockData.users = "all";
    blockData.customUsers = [];
    if (blockData.type == "scheduled") {
      blockData.type = "continuous";
      blockData.enabled = "false";
    }
    blockData.schedule = [];
    blockData.break = "none";
    blockData.autostart = "none";
    blockData.password = "";
    if (blockData.lock == "password" || blockData.lock == "spassword" || blockData.lock.indexOf("schedule") == 0) {
      blockData.lock = "none";
    }
  });
  settings.settings.password = "";
  addRemovePayWallEvents();
  updateBlocks(true);
  updateSettings(false);
  save();
}
export function showHideUpdateButton() {
  if (settings.additional.updateAvailable == "true") {
    $("#sidebar-button-update").show();
  } else {
    $("#sidebar-button-update").hide();
  }
}
export function startTrial() {
  var $upgradeTrialDialog = $("#dialog-upgrade-trial-start");
  $upgradeTrialDialog.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "350px",
    draggable: false,
    title: "Start Trial?",
    open: function () {
      var maxZ1 = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ1;
      }).off("click").on("click", function () {
        $upgradeTrialDialog.dialog("close");
      });
      $upgradeTrialDialog.parent().focus().off("keypress").on("keypress", function (keypressEvent1) {
        if (keypressEvent1.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $upgradeTrialDialog.parent().off("keypress");
      $upgradeTrialDialog.dialog("destroy");
      $upgradeTrialDialog.hide();
    },
    buttons: {
      Close: {
        text: "Close",
        class: "btn-grey-dialog",
        click: function () {
          $upgradeTrialDialog.dialog("close");
        }
      },
      "Start trial": {
        text: "Start trial",
        class: "btn-green-dialog",
        click: function () {
          $upgradeTrialDialog.dialog("close");
          settings.additional.trialEnd = moment().add(7, "days").format("YYYY,M,D,H,m");
          settings.additional.proStatus = "trial";
          addRemovePayWallEvents();
          setTimeout(function () {
            $("div:visible[id*='dialog-']").dialog("option", "position", {
              my: "center",
              at: "center",
              of: $(".page-content-wrapper")
            });
          }, 100);
          save();
        }
      }
    }
  }).show();
}
export function upgradeResult(upgradeResult) {
  if (upgradeResult === "pass") {
    settings.additional.proStatus = "pro";
    addRemovePayWallEvents();
    updateBlocks(true);
    updateSettings(true);
    save();
    var $upgradePassDialog = $("#dialog-upgrade-pass");
    $upgradePassDialog.dialog({
      modal: true,
      position: {
        my: "center",
        at: "center",
        of: $(".page-content-wrapper")
      },
      width: "350px",
      draggable: false,
      title: "Thank You!",
      open: function () {
        var maxZ2 = getMaxZ($(".ui-widget-overlay"));
        $(".ui-widget-overlay").filter(function () {
          return $(this).css("z-index") == maxZ2;
        }).off("click").on("click", function () {
          $upgradePassDialog.dialog("close");
        });
        $upgradePassDialog.parent().focus().off("keypress").on("keypress", function (keypressEvent2) {
          if (keypressEvent2.which == 13) {
            $(this).find(".btn-green-dialog").click();
          }
        });
      },
      close: function () {
        $upgradePassDialog.parent().off("keypress");
        $upgradePassDialog.dialog("destroy");
        $upgradePassDialog.hide();
      },
      buttons: {
        Close: {
          text: "Close",
          class: "btn-green-dialog",
          click: function () {
            $upgradePassDialog.dialog("close");
            $("#dialog-upgrade").dialog("close");
          }
        }
      }
    }).show();
  } else if (upgradeResult === "update") {
    var $upgradeFailDialog = $("#dialog-upgrade-update");
    $upgradeFailDialog.dialog({
      modal: true,
      position: {
        my: "center",
        at: "center",
        of: $(".page-content-wrapper")
      },
      width: "350px",
      draggable: false,
      title: "New Product Key Required",
      open: function () {
        var maxZ3 = getMaxZ($(".ui-widget-overlay"));
        $(".ui-widget-overlay").filter(function () {
          return $(this).css("z-index") == maxZ3;
        }).off("click").on("click", function () {
          $upgradeFailDialog.dialog("close");
        });
        $upgradeFailDialog.parent().focus().off("keypress").on("keypress", function (keypressEvent3) {
          if (keypressEvent3.which == 13) {
            $(this).find(".btn-green-dialog").click();
          }
        });
      },
      close: function () {
        $upgradeFailDialog.parent().off("keypress");
        $upgradeFailDialog.dialog("destroy");
        $upgradeFailDialog.hide();
      },
      buttons: {
        Close: {
          text: "Close",
          class: "btn-green-dialog",
          click: function () {
            $upgradeFailDialog.dialog("close");
          }
        }
      }
    }).show();
  } else {
    var $upgradeFailDialog = $("#dialog-upgrade-fail");
    $upgradeFailDialog.dialog({
      modal: true,
      position: {
        my: "center",
        at: "center",
        of: $(".page-content-wrapper")
      },
      width: "350px",
      draggable: false,
      title: "Invalid Product Key",
      open: function () {
        var maxZ4 = getMaxZ($(".ui-widget-overlay"));
        $(".ui-widget-overlay").filter(function () {
          return $(this).css("z-index") == maxZ4;
        }).off("click").on("click", function () {
          $upgradeFailDialog.dialog("close");
        });
        $upgradeFailDialog.parent().focus().off("keypress").on("keypress", function (keypressEvent4) {
          if (keypressEvent4.which == 13) {
            $(this).find(".btn-green-dialog").click();
          }
        });
      },
      close: function () {
        $upgradeFailDialog.parent().off("keypress");
        $upgradeFailDialog.dialog("destroy");
        $upgradeFailDialog.hide();
      },
      buttons: {
        Close: {
          text: "Close",
          class: "btn-green-dialog",
          click: function () {
            $upgradeFailDialog.dialog("close");
          }
        }
      }
    }).show();
  }
}
