
import { getMaxZ } from '../Modal/Modal';
import { requestUnlockRandomText } from '../RandomTextBreakModal/RandomTextBreakModal';
import { randomString } from '../StatsToggle/StatsToggle';
import { stats } from '../StatsChart/StatsChart';
import { requestUnlockDelay, requestUnlockQueuedDelay } from '../UnlockDelayModal/UnlockDelayModal';
import { updateBlocks } from '../../pages/BlocksPage/BlocksPage';
import { editLock } from '../../pages/LockEditorPage/LockEditorPage';
import { updateSettings } from '../../pages/SettingsPage/SettingsPage';
import { hideAllContent } from '../../routes/router';
import { AppState } from '../../store/AppState';
import { findLockType } from '../../lockTypes';

import { toggleBlock } from '../../services/blockManager';
import { editList } from '../../pages/ListEditorPage/ListEditorPage';

import { editSchedule } from '../../pages/ScheduleEditorPage/ScheduleEditorPage';
import { editAutostart } from '../AutostartEditor/AutostartEditor';
import { editFrozenAutostartTimer } from '../FrozenAutostartEditor/FrozenAutostartEditor';
import { editFrozenList, editFrozenTimer } from '../FrozenListEditor/FrozenListEditor';
import { deleteList } from '../StatsModal/StatsModal';
import { editBreak } from '../../pages/BreakEditorPage/BreakEditorPage';
import { editUsers } from '../UserListEditor/UserListEditor';

function executeAction(actionName, blockName, param) {
  switch (actionName) {
    case 'toggleBlock': return toggleBlock(blockName, param);
    case 'editList': return editList(blockName, param);
    case 'editLock': return editLock(blockName, param);
    case 'editSchedule': return editSchedule(blockName, param);
    case 'editAutostart': return editAutostart(blockName, param);
    case 'editFrozenAutostartTimer': return editFrozenAutostartTimer(blockName, param);
    case 'editFrozenList': return editFrozenList(blockName, param);
    case 'editFrozenTimer': return editFrozenTimer(blockName, param);
    case 'deleteList': return deleteList(blockName, param);
    case 'editBreak': return editBreak(blockName, param);
    case 'editUsers': return editUsers(blockName, param);
    default: console.error('Unknown action: ' + actionName);
  }
}

export function passwordCheck(targetPageId, successCallback) {
  var isSubmitting = false;
  var isShaking = false;
  if (settings.settings.password == "") {
    AppState.passwordChecked = true;
  }
  if (settings.settings.passwordStrict == "true") {
    AppState.passwordStrict = ["blocks", "stats", "settings", "overview", "newblocks"];
  } else if (settings.settings.passwordStrict == "false") {
    AppState.passwordStrict = ["blocks", "stats", "settings"];
  } else {
    AppState.passwordStrict = settings.settings.passwordStrict.split(",");
  }
  if (!AppState.passwordChecked && (AppState.passwordStrict.indexOf("overview") >= 0 && targetPageId == "page-overview" || AppState.passwordStrict.indexOf(targetPageId.replace("page-", "")) >= 0)) {
    if (AppState.passwordStrict.indexOf("overview") >= 0 && targetPageId == "page-overview") {
      hideAllContent();
      $(".page-sidebar").hide();
    }
    var $passwordDialog = $("#dialog-password");
    $passwordDialog.dialog({
      modal: true,
      position: {
        my: "center",
        at: "center",
        of: $(".page-content-wrapper")
      },
      width: "450px",
      draggable: false,
      title: "Settings Password Required",
      open: function () {
        var maxZIndex = getMaxZ($(".ui-widget-overlay"));
        $(".ui-widget-overlay").filter(function () {
          return $(this).css("z-index") == maxZIndex;
        }).css({
          cursor: "default"
        });
        $("#dialog-password-text").val("").on("keypress", function (event) {
          if (event.which === 13) {
            event.preventDefault();
            $("#dialog-password-unlock").click();
            isSubmitting = true;
          }
        }).on("keyup", function (event) {
          isSubmitting = false;
        });
        if (!(AppState.passwordStrict.indexOf("overview") >= 0) || targetPageId != "page-overview") {
          $(".ui-widget-overlay").filter(function () {
            return $(this).css("z-index") == maxZIndex;
          }).css({
            cursor: "pointer"
          });
          $(".ui-widget-overlay").filter(function () {
            return $(this).css("z-index") == maxZIndex;
          }).off("click").on("click", function () {
            $passwordDialog.dialog("close");
          });
          $("#dialog-password-cancel").show();
        } else {
          $("#dialog-password-cancel").hide();
        }
        $("#dialog-password-text").focus();
      },
      close: function () {
        $("#dialog-password-text").off("keypress");
        $("#dialog-password-text").off("keyup");
        $passwordDialog.dialog("destroy");
        $passwordDialog.hide();
      },
      buttons: {
        Cancel: {
          text: "Cancel",
          id: "dialog-password-cancel",
          class: "btn-grey-dialog",
          click: function () {
            $passwordDialog.dialog("close");
          }
        },
        Unlock: {
          text: "Unlock",
          id: "dialog-password-unlock",
          class: "btn-green-dialog",
          click: function () {
            if (!isShaking && !isSubmitting) {
              if ($("#dialog-password-text").val().normalizePassword() === settings.settings.password.normalizePassword()) {
                AppState.passwordChecked = true;
                $passwordDialog.dialog("close");
                $(".page-sidebar").show();
                successCallback();
              } else {
                isShaking = true;
                $("#dialog-password").parent().effect("shake", function () {
                  isShaking = false;
                });
                $("#dialog-password-text").val("").focus();
              }
            }
          }
        }
      }
    }).show();
  } else {
    successCallback();
  }
}
export function showPasswordCleared() {
  var $dialogFullContentPassPass = $("#dialog-settings-password-cleared");
  $dialogFullContentPassPass.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "300px",
    draggable: false,
    title: "Your Password Is Cleared!",
    open: function () {
      var maxZ5 = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ5;
      }).off("click").on("click", function () {
        $dialogFullContentPassPass.dialog("close");
      });
      $dialogFullContentPassPass.parent().focus().off("keypress").on("keypress", function (keypressEvent5) {
        if (keypressEvent5.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogFullContentPassPass.dialog("destroy");
      $dialogFullContentPassPass.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogFullContentPassPass.dialog("close");
        }
      }
    }
  }).show();
}
export function showPasswordSet() {
  var $dialogFullContentPassPass = $("#dialog-settings-password-set");
  $dialogFullContentPassPass.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "300px",
    draggable: false,
    title: "Your Password Is Set!",
    open: function () {
      var maxZ6 = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ6;
      }).off("click").on("click", function () {
        $dialogFullContentPassPass.dialog("close");
      });
      $dialogFullContentPassPass.parent().focus().off("keypress").on("keypress", function (keypressEvent6) {
        if (keypressEvent6.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogFullContentPassPass.dialog("destroy");
      $dialogFullContentPassPass.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogFullContentPassPass.dialog("close");
        }
      }
    }
  }).show();
}
export function setPassword(isSilent) {
  var pass1 = $("#settings_password1").val().normalizePassword();
  var pass2 = $("#settings_password2").val().normalizePassword();
  if (pass1.indexOf("\\") >= 0) {
    var $dialogFullContentPassFail = $("#dialog-settings-password-error-invalid");
    $dialogFullContentPassFail.dialog({
      modal: true,
      position: {
        my: "center",
        at: "center",
        of: $(".page-content-wrapper")
      },
      width: "300px",
      draggable: false,
      title: "Invalid Password",
      open: function () {
        var maxZ7 = getMaxZ($(".ui-widget-overlay"));
        $(".ui-widget-overlay").filter(function () {
          return $(this).css("z-index") == maxZ7;
        }).off("click").on("click", function () {
          $dialogFullContentPassFail.dialog("close");
        });
        $dialogFullContentPassFail.parent().focus().off("keypress").on("keypress", function (keypressEvent7) {
          if (keypressEvent7.which == 13) {
            $(this).find(".btn-green-dialog").click();
          }
        });
      },
      close: function () {
        $dialogFullContentPassFail.dialog("destroy");
        $dialogFullContentPassFail.hide();
      },
      buttons: {
        Close: {
          class: "btn-green-dialog",
          text: "Close",
          click: function () {
            $dialogFullContentPassFail.dialog("close");
          }
        }
      }
    }).show();
    return;
  }
  if (pass1 != pass2) {
    var $dialogFullContentPassFail = $("#dialog-settings-password-error-match");
    $dialogFullContentPassFail.dialog({
      modal: true,
      position: {
        my: "center",
        at: "center",
        of: $(".page-content-wrapper")
      },
      width: "300px",
      draggable: false,
      title: "Password's Don't Match",
      open: function () {
        var maxZ8 = getMaxZ($(".ui-widget-overlay"));
        $(".ui-widget-overlay").filter(function () {
          return $(this).css("z-index") == maxZ8;
        }).off("click").on("click", function () {
          $dialogFullContentPassFail.dialog("close");
        });
        $dialogFullContentPassFail.parent().focus().off("keypress").on("keypress", function (keypressEvent8) {
          if (keypressEvent8.which == 13) {
            $(this).find(".btn-green-dialog").click();
          }
        });
      },
      close: function () {
        $dialogFullContentPassFail.dialog("destroy");
        $dialogFullContentPassFail.hide();
      },
      buttons: {
        Close: {
          class: "btn-green-dialog",
          text: "Close",
          click: function () {
            $dialogFullContentPassFail.dialog("close");
          }
        }
      }
    }).show();
    return;
  }
  if (pass1 == "") {
    if (isSilent && AppState.passwordStrict.indexOf("unlock") >= 0 && AppState.passwordStrict.indexOf("lock") < 0) {
      togglePasswordUnlockFeature(function () {
        if (AppState.passwordStrict.indexOf("lock") >= 0) {
          $.each(settings.blocks, function (blockName1, blockData1) {
            settings.blocks[blockName1].lock = "none";
            if (typeof settings.blocks[blockName1].autostart == "string" && settings.blocks[blockName1].autostart != "none") {
              if (settings.blocks[blockName1].autostart.indexOf("time,") == 0) {
                settings.blocks[blockName1].autostart = settings.blocks[blockName1].autostart.replace(",true", ",false");
              }
            }
          });
        }
        for (var strictIndex1 = AppState.passwordStrict.length - 1; strictIndex1 >= 0; strictIndex1--) {
          if (AppState.passwordStrict[strictIndex1] == "lock" || AppState.passwordStrict[strictIndex1] == "unlock") {
            AppState.passwordStrict.splice(strictIndex1, 1);
          }
        }
        settings.settings.password = pass1;
        settings.settings.passwordStrict = AppState.passwordStrict.join();
        updateSettings(true);
        save();
        showPasswordCleared();
      });
    } else {
      if (AppState.passwordStrict.indexOf("lock") >= 0) {
        $.each(settings.blocks, function (blockName2, blockData2) {
          settings.blocks[blockName2].lock = "none";
          if (typeof settings.blocks[blockName2].autostart == "string" && settings.blocks[blockName2].autostart != "none") {
            if (settings.blocks[blockName2].autostart.indexOf("time,") == 0) {
              settings.blocks[blockName2].autostart = settings.blocks[blockName2].autostart.replace(",true", ",false");
            }
          }
        });
      }
      for (var strictIndex2 = AppState.passwordStrict.length - 1; strictIndex2 >= 0; strictIndex2--) {
        if (AppState.passwordStrict[strictIndex2] == "lock" || AppState.passwordStrict[strictIndex2] == "unlock") {
          AppState.passwordStrict.splice(strictIndex2, 1);
        }
      }
      settings.settings.password = pass1;
      settings.settings.passwordStrict = AppState.passwordStrict.join();
      updateSettings(true);
      save();
      showPasswordCleared();
    }
  } else {
    settings.settings.password = pass1;
    updateSettings(true);
    save();
    showPasswordSet();
  }
}
export function requestUnlock(callbackFunctionName, blockName, lockType, unlockParam) {
  switch (lockType) {
    case "spassword":
      if (callbackFunctionName == "editLock") {
        $("#page-settings").click();
        $("#settings-password-tab").click();
      } else {
        executeAction(callbackFunctionName, blockName, "false");
      }
      break;
    case "password":
      var matchedLockType = findLockType(blockName, settings.blocks[blockName]);
      if (matchedLockType) {
        matchedLockType.requestUnlock(blockName, {
          continueRestrictionsCallback: function () {
            executeAction(callbackFunctionName, blockName, "true");
          },
          showRestrictionsButton: unlockParam
        });
      } else if (settings.blocks[blockName].password === "CTBL_QUEUED_DELAY") {
        requestUnlockQueuedDelay(blockName, function () {
          executeAction(callbackFunctionName, blockName, "true");
        }, unlockParam);
      } else {
        requestUnlockPassword(settings.blocks[blockName].password, function () {
          if (AppState.unlockedBlocks.indexOf(blockName + "\\" + settings.blocks[blockName].lock + "\\" + settings.blocks[blockName].randomTextLength + "\\" + settings.blocks[blockName].password) < 0) {
            AppState.unlockedBlocks.push(blockName + "\\" + settings.blocks[blockName].lock + "\\" + settings.blocks[blockName].randomTextLength + "\\" + settings.blocks[blockName].password);
          }
          updateBlocks(false);
          executeAction(callbackFunctionName, blockName, "false");
        }, function () {
          executeAction(callbackFunctionName, blockName, "true");
        }, unlockParam);
      }
      break;
    case "randomText":
      var randomTextString = "";
      var showText = true;
      var clearText = false;
      if (settings.blocks[blockName].randomTextLength.indexOf(",") > 0) {
        randomTextString = randomString(settings.blocks[blockName].randomTextLength);
        showText = settings.blocks[blockName].randomTextLength.split(",")[2] == "show";
        clearText = settings.blocks[blockName].randomTextLength.split(",")[3] == "clear";
      } else {
        randomTextString = randomString(parseInt(settings.blocks[blockName].randomTextLength));
      }
      requestUnlockRandomText(randomTextString, showText, clearText, function () {
        if (AppState.unlockedBlocks.indexOf(blockName + "\\" + settings.blocks[blockName].lock + "\\" + settings.blocks[blockName].randomTextLength + "\\" + settings.blocks[blockName].password) < 0) {
          AppState.unlockedBlocks.push(blockName + "\\" + settings.blocks[blockName].lock + "\\" + settings.blocks[blockName].randomTextLength + "\\" + settings.blocks[blockName].password);
        }
        updateBlocks(false);
        executeAction(callbackFunctionName, blockName, "false");
      }, function () {
        executeAction(callbackFunctionName, blockName, "true");
      }, unlockParam);
      break;
    case "delay":
      requestUnlockDelay(blockName, function () {
        executeAction(callbackFunctionName, blockName, "true");
      }, unlockParam);
      break;
    case "true":
      executeAction(callbackFunctionName, blockName, "true");
      break;
    case "false":
      executeAction(callbackFunctionName, blockName, "false");
      break;
    default:
      executeAction(callbackFunctionName, blockName, "false");
      break;
  }
}

export function requestUnlockPassword(correctPassword, unlockCallback, continueRestrictionsCallback, showRestrictionsButton) {
  var isEnterPressed = false;
  var isShaking = false;
  var $dialogBlockPassword = $("#dialog-password");
  $dialogBlockPassword.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "450px",
    draggable: false,
    title: "Block Password Required",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogBlockPassword.dialog("close");
      });
      $("#dialog-password-text").val("").on("keypress", function (event) {
        if (event.which == 13) {
          event.preventDefault();
          $("#dialog-password-unlock").click();
          isEnterPressed = true;
        }
      }).on("keyup", function (event) {
        isEnterPressed = false;
      });
      if (!showRestrictionsButton) {
        $("#btn-continue-password").hide();
      }
      $("#dialog-password-text").focus();
    },
    close: function () {
      $dialogBlockPassword.hide();
      $dialogBlockPassword.dialog("destroy");
      $("#dialog-password-text").off("keypress");
      $("#dialog-password-text").off("keyup");
    },
    buttons: {
      Cancel: {
        class: "btn-grey-dialog",
        text: "Cancel",
        click: function () {
          $dialogBlockPassword.dialog("close");
        }
      },
      "Continue with restrictions": {
        id: "btn-continue-password",
        class: "btn-grey-dialog",
        text: "Continue with restrictions",
        click: function () {
          $dialogBlockPassword.dialog("close");
          continueRestrictionsCallback();
        }
      },
      Unlock: {
        class: "btn-green-dialog",
        text: "Unlock",
        id: "dialog-password-unlock",
        click: function () {
          if (!isShaking && !isEnterPressed) {
            var enteredPassword = $("#dialog-password-text").val().normalizePassword();
            if (enteredPassword === correctPassword.normalizePassword()) {
              $dialogBlockPassword.dialog("close");
              unlockCallback();
            } else {
              isShaking = true;
              $("#dialog-password").parent().effect("shake", function () {
                isShaking = false;
              });
              $("#dialog-password-text").val("").focus();
            }
          }
        }
      }
    }
  }).show();
}
export function togglePasswordLockFeature(callback, isAllLocked) {
  var $dialogBlockLockedWarning = $("#dialog-edit-settings-starting-blocked-warning");
  $dialogBlockLockedWarning.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Lock All Blocks?",
    create: function () {
      if (isAllLocked) {
        $("#dialog-edit-settings-starting-blocked-warning-unlocked").hide();
      } else {
        $("#dialog-edit-settings-starting-blocked-warning-unlocked").show();
      }
    },
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogBlockLockedWarning.dialog("close");
      });
      $dialogBlockLockedWarning.parent().focus();
    },
    close: function () {
      $dialogBlockLockedWarning.dialog("destroy");
      $dialogBlockLockedWarning.hide();
    },
    buttons: {
      "Wait, no!": {
        class: "btn-grey-dialog",
        text: "Wait, no!",
        click: function () {
          $dialogBlockLockedWarning.dialog("close");
        }
      },
      "Lock all blocks": {
        class: "btn-green-dialog",
        text: "Lock all blocks",
        click: function () {
          $dialogBlockLockedWarning.dialog("close");
          callback();
        }
      }
    }
  }).show();
}
export function togglePasswordUnlockFeature(callback) {
  var $dialogBlockFeatureWarning = $("#dialog-settings-toggle-locked-password-warning");
  $dialogBlockFeatureWarning.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Are you sure?",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogBlockFeatureWarning.dialog("close");
      });
      $dialogBlockFeatureWarning.parent().focus();
    },
    close: function () {
      $dialogBlockFeatureWarning.dialog("destroy");
      $dialogBlockFeatureWarning.hide();
    },
    buttons: {
      "No, keep enabled": {
        class: "btn-grey-dialog",
        text: "No, keep enabled",
        click: function () {
          $dialogBlockFeatureWarning.dialog("close");
        }
      },
      "Yes, disable": {
        class: "btn-green-dialog",
        text: "Yes, disable",
        click: function () {
          $dialogBlockFeatureWarning.dialog("close");
          callback();
        }
      }
    }
  }).show();
}
