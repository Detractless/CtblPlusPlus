
import { showExtensionHelp } from '../ThemeModal/ThemeModal';
import { getMaxZ } from '../Modal/Modal';
import { passwordCheck } from '../SecurityModal/SecurityModal';
import { showTrialModal } from '../TrialModal/TrialModal';
import { updateOverview } from '../../pages/OverviewPage/OverviewPage';
import { updateSettings } from '../../pages/SettingsPage/SettingsPage';
import { hideAllContent, unselectMenu, hideSelected } from '../../routes/router';
import { AppState } from '../../store/AppState';

export function showExtensionInstall(isStartup) {
  var installBrowsers = settings.additional.browserList.split("@")[0].split(",").filter(Boolean);
  var restartBrowsers = settings.additional.browserList.split("@")[1].split(",").filter(Boolean);
  var installedBrowsers = settings.additional.browserList.split("@")[2].split(",").filter(Boolean);
  var unsupportedBrowsers = settings.additional.browserList.split("@")[3].split(",").filter(Boolean);
  var $dialogExtInstall = $("#dialog-extensions");
  $dialogExtInstall.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "550px",
    draggable: false,
    title: "Install Extensions",
    create: function () {
      $(".ext-install").hide();
      $(".ext-restart").hide();
      $(".ext-installed").hide();
      if (installBrowsers.length > 0) {
        $(".ext-nothing").hide();
        $.each(installBrowsers, function (index, browser) {
          $(".ext-install.ext-" + browser).show();
        });
      }
      if (restartBrowsers.length > 0) {
        $(".ext-nothing").hide();
        $.each(restartBrowsers, function (index, browser) {
          $(".ext-restart.ext-" + browser).show();
        });
      }
      $.each(installedBrowsers, function (index, browser) {
        $(".ext-installed.ext-" + browser).show();
      });
      if (unsupportedBrowsers.length > 0) {
        $(".ext-nothingunsupported").hide();
        $.each(unsupportedBrowsers, function (index, browser) {
          $(".ext-unsupported.ext-" + browser).show();
        });
      }
    },
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        setTimeout(function () {
          $dialogExtInstall.dialog("close");
        }, 50);
      });
      $dialogExtInstall.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
      if (settings.settings.showExtensionWarning == "false") {
        $("#dialog-extensions-again").prop("checked", true);
      } else {
        $("#dialog-extensions-again").prop("checked", false);
      }
    },
    close: function () {
      $dialogExtInstall.dialog("destroy");
      $dialogExtInstall.hide();
      if (isStartup) {
        AppState.passwordChecked = false;
        passwordCheck("page-overview", function () {
          hideAllContent();
          unselectMenu();
          hideSelected();
          $("#page-overview").addClass("active");
          $("#page-overview-content").show();
          $(".page-body").scrollTop(0);
          showTrialModal();
          updateOverview();
        });
      }
      $("#sidebar-button-extensions").hide();
      $("#sidebar-button-extensions-loading").show();
      setTimeout(function () {
        updateBrowserList("false");
      }, 10000);
    },
    buttons: {
      Help: {
        text: "Help",
        class: "btn-blue-dialog btn-no-margin float-left",
        click: function () {
          showExtensionHelp();
        }
      },
      Close: {
        text: "Close",
        class: "btn-green-dialog",
        click: function () {
          setTimeout(function () {
            if ($("#dialog-extensions-again").is(":checked")) {
              settings.settings.showExtensionWarning = "false";
              updateSettings(true);
              save();
            } else {
              settings.settings.showExtensionWarning = "true";
              updateSettings(true);
              save();
            }
            $dialogExtInstall.dialog("close");
          }, 50);
        }
      }
    }
  }).show();
}
export function ForceExtensionInstall(browserListString, showInstallDialog) {
  settings.additional.browserList = browserListString;
  var installBrowsers = settings.additional.browserList.split("@")[0].split(",").filter(Boolean);
  var restartBrowsers = settings.additional.browserList.split("@")[1].split(",").filter(Boolean);
  var installedBrowsers = settings.additional.browserList.split("@")[2].split(",").filter(Boolean);
  if (installBrowsers.length > 0 || restartBrowsers.length > 0 || installBrowsers.length == 0 && restartBrowsers.length == 0 && installedBrowsers.length == 0) {
    $("#sidebar-button-extensions").show();
    if (showInstallDialog == "true") {
      showExtensionInstall(true);
    }
  } else {
    $("#sidebar-button-extensions").hide();
  }
}
export function updateBrowserList(showDialogAfterUpdate) {
  settings.additional.browserList = window.external.GetBrowserInstallList();
  var installBrowsers = settings.additional.browserList.split("@")[0].split(",").filter(Boolean);
  var restartBrowsers = settings.additional.browserList.split("@")[1].split(",").filter(Boolean);
  var installedBrowsers = settings.additional.browserList.split("@")[2].split(",").filter(Boolean);
  $("#sidebar-button-extensions-loading").hide();
  if (installBrowsers.length > 0 || restartBrowsers.length > 0 || installBrowsers.length == 0 && restartBrowsers.length == 0 && installedBrowsers.length == 0) {
    $("#sidebar-button-extensions").show();
    if (showDialogAfterUpdate == "true") {
      showExtensionInstall(false);
      if (settings.additional.forceExtensionInstall == "true") {
        settings.additional.forceExtensionInstall = "false";
        save();
      }
    }
  } else {
    $("#sidebar-button-extensions").hide();
  }
}
