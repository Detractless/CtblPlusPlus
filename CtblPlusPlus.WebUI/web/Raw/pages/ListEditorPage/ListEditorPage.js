
import { customSelect, customSelectEdit, selectList, lastCustomSelectedIndex } from '../../components/StatsToggle/StatsToggle';
import { addList, importApplications, clearPendingQueueOps, flushPendingQueueOps, resetDirty } from '../../components/BlockModal/BlockModalListActions';
import { getMaxZ } from '../../components/Modal/Modal';
import { toHtml, fromHtml, makeTitleWithBlockName } from '../../utils/formatString';
import { updateBlocks } from '../BlocksPage/BlocksPage';
import { AppState } from '../../store/AppState';
import { findLockType } from '../../lockTypes';
import { isWhitelistBlock, initWhitelistAppsTab, cleanupWhitelistAppsTab, flushWhitelistOps } from '../../components/AppWhitelistTab/AppWhitelistTab';
import '../../components/AppListEditor/AppListEditor';
﻿function scrollUpIfNeeded(event) {
  if ($(".selected").first()[0].parentElement.scrollTop >= $(".selected").first()[0].offsetTop - 206) {
    $(".selected").first()[0].parentElement.scrollTop = $(".selected").first()[0].offsetTop - 206;
  }
}
export function scrollDownIfNeeded(event) {
  if ($(".selected").first()[0].parentElement.scrollTop <= $(".selected").first()[0].offsetTop - 400) {
    $(".selected").first()[0].parentElement.scrollTop = $(".selected").first()[0].offsetTop - 400;
  }
}
export function scrollUpIfNeededApp(event) {
  if ($(".selected").first()[0].parentElement.scrollTop >= $(".selected").first()[0].offsetTop - 246) {
    $(".selected").first()[0].parentElement.scrollTop = $(".selected").first()[0].offsetTop - 246;
  }
}
export function scrollDownIfNeededApp(event) {
  if ($(".selected").first()[0].parentElement.scrollTop <= $(".selected").first()[0].offsetTop - 400) {
    $(".selected").first()[0].parentElement.scrollTop = $(".selected").first()[0].offsetTop - 400;
  }
}
export function editList(blockName, isLockedStr) {
  var websitesHtml = "";
  var appsHtml = "";
  var exceptionsHtml = "";
  var websitesImportBlockList = [];
  var websitesImportExceptionsList = [];
  var exceptionsImportBlockList = [];
  var exceptionsImportExceptionsList = [];
  var appsImportBlockList = [];
  var isNewBlock = false;
  var dialogTitle;
  var saveButtonText;
  var saveTitle;
  if (typeof blockName == "undefined") {
    isNewBlock = true;
    dialogTitle = "What Do You Want to Block?";
    saveTitle = "New Block";
    saveButtonText = "Save As...";
  } else {
    dialogTitle = makeTitleWithBlockName("What Does '", blockName, "' Block?", 500);
    saveTitle = blockName;
    saveButtonText = "Save";
  }
  AppState.lockedBlockList = [];
  lastCustomSelectedIndex = null;
  if (!isNewBlock) {
    if (isLockedStr != "false") {
      AppState.lockedBlockList.push.apply(AppState.lockedBlockList, settings.blocks[blockName].web);
    }
    $.each(settings.blocks[blockName].web, function (webIndex, webEntry) {
      websitesHtml = websitesHtml + "<div class=\"custom-option\" ondblclick=\"customSelectEdit(this, 'websites');\" onmousedown=\"customSelect(this, event);\" data-locked=\"" + isLockedStr + "\" data-value=\"" + toHtml(webEntry) + "\">" + toHtml(webEntry) + "</div>";
    });
    $.each(settings.blocks[blockName].exceptions, function (exceptionIndex, exceptionEntry) {
      if (exceptionEntry == "file://*.*") {
        exceptionsHtml = exceptionsHtml + "<div class=\"custom-option\" ondblclick=\"customSelectEdit(this, 'exceptions');\" onmousedown=\"customSelect(this, event);\" data-locked=\"false\" title=\"The file://*.* exception ensures local files (like PDFs) are not blocked in case you block something that conflicts with the local file path.\" data-value=\"" + toHtml(exceptionEntry) + "\">" + toHtml(exceptionEntry) + "</div>";
      } else {
        exceptionsHtml = exceptionsHtml + "<div class=\"custom-option\" ondblclick=\"customSelectEdit(this, 'exceptions');\" onmousedown=\"customSelect(this, event);\" data-locked=\"false\" data-value=\"" + toHtml(exceptionEntry) + "\">" + toHtml(exceptionEntry) + "</div>";
      }
    });
    $.each(settings.blocks[blockName].apps, function (appIndex, appEntry) {
      if (appEntry.indexOf("folder:") == 0) {
        appsHtml = appsHtml + "<div class=\"custom-option\" onmousedown=\"customSelect(this, event);\" data-locked=\"" + isLockedStr + "\" data-value=\"" + toHtml(appEntry) + "\">" + toHtml(appEntry.replace(/[\/]/g, "\\").slice(appEntry.indexOf(":") + 1)) + "</div>";
      } else if (appEntry.indexOf("file:") == 0) {
        appsHtml = appsHtml + "<div class=\"custom-option\" onmousedown=\"customSelect(this, event);\" data-locked=\"" + isLockedStr + "\" data-value=\"" + toHtml(appEntry) + "\">" + toHtml(appEntry.replace(/[\/]/g, "\\").slice(appEntry.indexOf(":") + 1)) + "</div>";
      } else if (appEntry.indexOf("title:") == 0) {
        appsHtml = appsHtml + "<div class=\"custom-option\" onmousedown=\"customSelect(this, event);\" data-locked=\"" + isLockedStr + "\" data-value=\"" + toHtml(appEntry) + "\">\"" + toHtml(appEntry.slice(appEntry.indexOf(":") + 1)) + "\"</div>";
      } else if (appEntry.indexOf("win10:") == 0) {
        appsHtml = appsHtml + "<div class=\"custom-option\" onmousedown=\"customSelect(this, event);\" data-locked=\"" + isLockedStr + "\" data-value=\"" + toHtml(appEntry) + "\">" + toHtml(appEntry.slice(appEntry.indexOf(":") + 1)) + "</div>";
      }
    });
  } else {
    var defaultException = "file://*.*";
    exceptionsHtml = exceptionsHtml + "<div class=\"custom-option\" ondblclick=\"customSelectEdit(this, 'exceptions');\" onmousedown=\"customSelect(this, event);\" data-locked=\"false\" title=\"The file://*.* exception ensures local files (like PDFs) are not blocked in case you block something that conflicts with the local file path.\" data-value=\"" + toHtml(defaultException) + "\">" + toHtml(defaultException) + "</div>";
  }
  var otherBlocksCount = 0;
  $.each(settings.blocks, function (otherBlockName, otherBlockData) {
    if (otherBlockName != blockName && otherBlockName != "Frozen Turkey" && otherBlockName.indexOf("Frozen Turkey,") != 0 && otherBlockName.indexOf("Focused Turkey,") != 0) {
      otherBlocksCount++;
      var safeBlockName = toHtml(otherBlockName).replace(/"/g, "&quot;");
      websitesImportBlockList.push("<li><a class=\"action-import-list\" data-target=\"websites\" data-source-block=\"" + safeBlockName + "\" data-source-type=\"web\" data-alphabeticalOrder=\"" + toHtml(otherBlockName.toLowerCase().replace(/'/g, "\'")).replace(/"/g, "\"") + "\"> " + toHtml(otherBlockName) + " </a></li>");
      websitesImportExceptionsList.push("<li><a class=\"action-import-list\" data-target=\"websites\" data-source-block=\"" + safeBlockName + "\" data-source-type=\"exceptions\" data-alphabeticalOrder=\"" + toHtml(otherBlockName.toLowerCase().replace(/'/g, "\'")).replace(/"/g, "\"") + "\"> " + toHtml(otherBlockName) + " </a></li>");
      exceptionsImportBlockList.push("<li><a class=\"action-import-list\" data-target=\"exceptions\" data-source-block=\"" + safeBlockName + "\" data-source-type=\"web\" data-alphabeticalOrder=\"" + toHtml(otherBlockName.toLowerCase().replace(/'/g, "\'")).replace(/"/g, "\"") + "\"> " + toHtml(otherBlockName) + " </a></li>");
      exceptionsImportExceptionsList.push("<li><a class=\"action-import-list\" data-target=\"exceptions\" data-source-block=\"" + safeBlockName + "\" data-source-type=\"exceptions\" data-alphabeticalOrder=\"" + toHtml(otherBlockName.toLowerCase().replace(/'/g, "\'")).replace(/"/g, "\"") + "\"> " + toHtml(otherBlockName) + " </a></li>");
      appsImportBlockList.push("<li><a class=\"action-import-apps\" data-source-block=\"" + safeBlockName + "\" data-alphabeticalOrder=\"" + toHtml(otherBlockName.toLowerCase().replace(/'/g, "\'")).replace(/"/g, "\"") + "\"> " + toHtml(otherBlockName) + " </a></li>");
    }
  });
  websitesImportBlockList.sort();
  websitesImportExceptionsList.sort();
  exceptionsImportBlockList.sort();
  exceptionsImportExceptionsList.sort();
  appsImportBlockList.sort();
  var $dialogContent = $("#dialog-edit-block");
  $dialogContent.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "500px",
    draggable: false,
    title: dialogTitle,
    open: function () {
      clearPendingQueueOps();
      resetDirty();
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).css({
        cursor: "default"
      });
      $dialogContent.focus().off("keydown").on("keydown", function (keydownEvent) {
        if (keydownEvent.which == 27) {
          return false;
        }
      });
      $("#dialog-edit-block").attr("data-saveTitle", saveTitle);
      var matchedLockType = isNewBlock ? null : findLockType(blockName, settings.blocks[blockName]);
      if (matchedLockType) {
        $("#blocklist-queue").parent().show();
        $("#blocklist-queue-list").html("<div style='padding: 15px; text-align: center; opacity: 0.7;'>Loading...</div>");
        matchedLockType.getQueueListEntries(blockName).then(function(html) {
            $("#blocklist-queue-list").html(html);
        });
      } else {
        $("#blocklist-queue").parent().hide();
      }
      $("#blocklist-websites").trigger("click");
      $("#blocklist-websites-add").val("");
      $("#blocklist-exceptions-add").val("");
      $("#blocklist-websites-list").html(websitesHtml);
      $("#blocklist-exceptions-list").html(exceptionsHtml);
      $("#blocklist-apps-list").html(appsHtml);
      $("#blocklist-websites-import-block").parent().show();
      $("#blocklist-websites-import-exceptions").parent().show();
      $("#blocklist-exceptions-import-block").parent().show();
      $("#blocklist-exceptions-import-exceptions").parent().show();
      $("#blocklist-apps-import-block").parent().show();
      $("#blocklist-apps-import-block-divider").show();
      $("#blocklist-websites-import-block").html(websitesImportBlockList.join(""));
      $("#blocklist-websites-import-exceptions").html(websitesImportExceptionsList.join(""));
      $("#blocklist-exceptions-import-block").html(exceptionsImportBlockList.join(""));
      $("#blocklist-exceptions-import-exceptions").html(exceptionsImportExceptionsList.join(""));
      $("#blocklist-apps-import-block").html(appsImportBlockList.join(""));
      $(".import-divider").show();
      
      $dialogContent.off("click", ".action-import-list").on("click", ".action-import-list", function(e) {
        e.preventDefault();
        var target = $(this).attr("data-target");
        var sourceBlock = $(this).attr("data-source-block");
        var sourceType = $(this).attr("data-source-type");
        addList(target, settings.blocks[sourceBlock][sourceType]);
      });

      $dialogContent.off("click", ".action-import-apps").on("click", ".action-import-apps", function(e) {
        e.preventDefault();
        var sourceBlock = $(this).attr("data-source-block");
        importApplications(settings.blocks[sourceBlock].apps);
      });

      if (otherBlocksCount > 7) {
        $("#blocklist-websites-import-block").addClass("dropdown-menu-pull-up");
        $("#blocklist-exceptions-import-block").addClass("dropdown-menu-pull-up");
        $("#blocklist-websites-import-exceptions").addClass("dropdown-menu-pull-up");
        $("#blocklist-exceptions-import-exceptions").addClass("dropdown-menu-pull-up");
      } else if (otherBlocksCount == 0) {
        $(".import-divider").hide();
        $("#blocklist-websites-import-block").parent().hide();
        $("#blocklist-exceptions-import-block").parent().hide();
        $("#blocklist-websites-import-exceptions").parent().hide();
        $("#blocklist-exceptions-import-exceptions").parent().hide();
        $("#blocklist-apps-import-block").parent().hide();
        $("#blocklist-apps-import-block-divider").hide();
      }
      var $listDivs = $("#blocklist-websites-list div");
      var mappedItems = $listDivs.map(function (mapIndex, mapDiv) {
        return {
          t: $(mapDiv).text(),
          v: $(mapDiv).attr("data-value"),
          l: $(mapDiv).attr("data-locked")
        };
      }).get();
      mappedItems.sort(function (itemA, itemB) {
        if (itemA.t.toLowerCase() > itemB.t.toLowerCase()) {
          return 1;
        } else if (itemA.t.toLowerCase() < itemB.t.toLowerCase()) {
          return -1;
        } else {
          return 0;
        }
      });
      $listDivs.each(function (eachIndex, eachDiv) {
        $(eachDiv).attr("data-value", mappedItems[eachIndex].v);
        $(eachDiv).attr("data-locked", mappedItems[eachIndex].l);
        $(eachDiv).text(mappedItems[eachIndex].t);
      });
      var $listDivs = $("#blocklist-exceptions-list div");
      var mappedItems = $listDivs.map(function (mapIndex, mapDiv) {
        return {
          t: $(mapDiv).text(),
          v: $(mapDiv).attr("data-value"),
          l: $(mapDiv).attr("data-locked")
        };
      }).get();
      mappedItems.sort(function (itemA, itemB) {
        if (itemA.t.toLowerCase() > itemB.t.toLowerCase()) {
          return 1;
        } else if (itemA.t.toLowerCase() < itemB.t.toLowerCase()) {
          return -1;
        } else {
          return 0;
        }
      });
      $listDivs.each(function (eachIndex, eachDiv) {
        $(eachDiv).attr("data-value", mappedItems[eachIndex].v);
        $(eachDiv).attr("data-locked", mappedItems[eachIndex].l);
        $(eachDiv).text(mappedItems[eachIndex].t);
      });
      var $listDivs = $("#blocklist-apps-list div");
      var mappedItems = $listDivs.map(function (mapIndex, mapDiv) {
        return {
          t: $(mapDiv).text(),
          v: $(mapDiv).attr("data-value"),
          l: $(mapDiv).attr("data-locked")
        };
      }).get();
      mappedItems.sort(function (itemA, itemB) {
        if (itemA.t.toLowerCase() > itemB.t.toLowerCase()) {
          return 1;
        } else if (itemA.t.toLowerCase() < itemB.t.toLowerCase()) {
          return -1;
        } else {
          return 0;
        }
      });
      $listDivs.each(function (eachIndex, eachDiv) {
        $(eachDiv).attr("data-value", mappedItems[eachIndex].v);
        $(eachDiv).attr("data-locked", mappedItems[eachIndex].l);
        $(eachDiv).text(mappedItems[eachIndex].t);
      });
      if (!isNewBlock && isWhitelistBlock(blockName)) {
        initWhitelistAppsTab();
      }
      $("#blocklist-websites-add").keypress(function (keypressEvent) {
        if (keypressEvent.which == 13) {
          $("#blocklist-websites-add-button").click();
        }
      });
      $("#blocklist-exceptions-add").keypress(function (keypressEvent) {
        if (keypressEvent.which == 13) {
          $("#blocklist-exceptions-add-button").click();
        }
      });
      $("#blocklist-websites-list").keydown(function (keydownEvent) {
        if (keydownEvent.which == 8 || keydownEvent.which == 46) {
          $("#blocklist-websites-remove-button").click();
        } else if (keydownEvent.which == 38 && $("#blocklist-websites-list div.custom-option.selected").prev().length == 1) {
          $("#blocklist-websites-list div.custom-option.selected").toggleClass("selected").prev().toggleClass("selected");
          scrollUpIfNeeded($("#blocklist-websites-list div.custom-option.selected")[0]);
          keydownEvent.stopPropagation();
          return false;
        } else if (keydownEvent.which == 40 && $("#blocklist-websites-list div.custom-option.selected").next().length == 1) {
          $("#blocklist-websites-list div.custom-option.selected").toggleClass("selected").next().toggleClass("selected");
          scrollDownIfNeeded($("#blocklist-websites-list div.custom-option.selected")[0]);
          keydownEvent.stopPropagation();
          return false;
        } else if (keydownEvent.which == 65 && keydownEvent.ctrlKey) {
          selectList("websites");
        }
      });
      $("#blocklist-exceptions-list").keydown(function (keydownEvent) {
        if (keydownEvent.which == 8 || keydownEvent.which == 46) {
          $("#blocklist-exceptions-remove-button").click();
        } else if (keydownEvent.which == 38 && $("#blocklist-exceptions-list div.custom-option.selected").prev().length == 1) {
          $("#blocklist-exceptions-list div.custom-option.selected").toggleClass("selected").prev().toggleClass("selected");
          scrollUpIfNeeded($("#blocklist-exceptions-list div.custom-option.selected")[0]);
          keydownEvent.stopPropagation();
          return false;
        } else if (keydownEvent.which == 40 && $("#blocklist-exceptions-list div.custom-option.selected").next().length == 1) {
          $("#blocklist-exceptions-list div.custom-option.selected").toggleClass("selected").next().toggleClass("selected");
          scrollDownIfNeeded($("#blocklist-exceptions-list div.custom-option.selected")[0]);
          keydownEvent.stopPropagation();
          return false;
        } else if (keydownEvent.which == 65 && keydownEvent.ctrlKey) {
          selectList("exceptions");
        }
      });
      $("#blocklist-apps-list").keydown(function (keydownEvent) {
        if (keydownEvent.which == 8 || keydownEvent.which == 46) {
          $("#blocklist-apps-remove-button").click();
        } else if (keydownEvent.which == 38 && $("#blocklist-apps-list div.custom-option.selected").prev().length == 1) {
          $("#blocklist-apps-list div.custom-option.selected").toggleClass("selected").prev().toggleClass("selected");
          scrollUpIfNeededApp($("#blocklist-apps-list div.custom-option.selected")[0]);
          keydownEvent.stopPropagation();
          return false;
        } else if (keydownEvent.which == 40 && $("#blocklist-apps-list div.custom-option.selected").next().length == 1) {
          $("#blocklist-apps-list div.custom-option.selected").toggleClass("selected").next().toggleClass("selected");
          scrollDownIfNeededApp($("#blocklist-apps-list div.custom-option.selected")[0]);
          keydownEvent.stopPropagation();
          return false;
        } else if (keydownEvent.which == 65 && keydownEvent.ctrlKey) {
          selectList("apps");
        }
      });
      $("#blocklist-websites-add").focus();
    },
    close: function () {
      clearPendingQueueOps();
      resetDirty();
      if (!isNewBlock && isWhitelistBlock(blockName)) {
        cleanupWhitelistAppsTab();
      }
      $("#blocklist-websites-list").off("keydown");
      $("#blocklist-exceptions-list").off("keydown");
      $("#blocklist-apps-list").off("keydown");
      $("#blocklist-websites-add").off("keypress");
      $("#blocklist-exceptions-add").off("keypress");
      $dialogContent.hide();
      $dialogContent.dialog("destroy");
    },
    buttons: {
      "Close without saving": {
        class: "btn-grey-dialog",
        text: "Close without saving",
        click: function () {
          $dialogContent.dialog("close");
        }
      },
      saveButtonText: {
        class: "btn-green-dialog",
        text: saveButtonText,
        click: function () {
          flushPendingQueueOps();
          var savedWebsites = [];
          var savedApps = [];
          var savedExceptions = [];
          var $listElements = $("#blocklist-websites-list div");
          $listElements.each(function (elemIndex, elemDiv) {
            savedWebsites.push(fromHtml($(elemDiv).attr("data-value")));
          });
          var $listElements = $("#blocklist-exceptions-list div");
          $listElements.each(function (elemIndex, elemDiv) {
            savedExceptions.push(fromHtml($(elemDiv).attr("data-value")));
          });
          if (!isNewBlock && isWhitelistBlock(blockName)) {
            savedApps = settings.blocks[blockName].apps;
          } else {
            var $listElements = $("#blocklist-apps-list div");
            $listElements.each(function (elemIndex, elemDiv) {
              savedApps.push(fromHtml($(elemDiv).attr("data-value")));
            });
          }
          if (isNewBlock) {
            var $dialogSaveBlockAs = $("#dialog-edit-block-name");
            $dialogSaveBlockAs.dialog({
              modal: true,
              position: {
                my: "center",
                at: "center",
                of: $(".page-content-wrapper")
              },
              width: "400px",
              draggable: false,
              title: "Save New Block As...",
              open: function () {
                var maxZIndex = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == maxZIndex;
                }).off("click").on("click", function () {
                  $dialogSaveBlockAs.dialog("close");
                });
                $("#dialog-edit-block-name-text").val("").on("keypress", function (keypressEvent) {
                  if (keypressEvent.which == 13) {
                    keypressEvent.preventDefault();
                    $("#dialog-edit-block-name-save-button").click();
                  }
                });
                $("#dialog-edit-block-name-text").focus();
              },
              close: function () {
                $("#dialog-edit-block-name-text").off("keypress");
                $dialogSaveBlockAs.dialog("destroy");
                $dialogSaveBlockAs.hide();
              },
              buttons: {
                "Close without saving": {
                  class: "btn-grey-dialog",
                  text: "Close without saving",
                  click: function () {
                    $dialogSaveBlockAs.dialog("close");
                  }
                },
                Save: {
                  class: "btn-green-dialog",
                  id: "dialog-edit-block-name-save-button",
                  text: "Save",
                  click: function () {
                    var newBlockName = $("#dialog-edit-block-name-text").val().normalizeOnlyHiddenChars();
                    if (newBlockName == "" || newBlockName.indexOf("\\") >= 0 || newBlockName == "Frozen Turkey" || newBlockName.indexOf("Frozen Turkey,") == 0 || newBlockName.indexOf("Focused Turkey,") == 0) {
                      var $dialogNameInvalid = $("#dialog-edit-block-name-invalid");
                      $dialogNameInvalid.dialog({
                        modal: true,
                        position: {
                          my: "center",
                          at: "center",
                          of: $(".page-content-wrapper")
                        },
                        width: "350px",
                        draggable: false,
                        title: "Invalid Block Name",
                        open: function () {
                          var maxZIndex = getMaxZ($(".ui-widget-overlay"));
                          $(".ui-widget-overlay").filter(function () {
                            return $(this).css("z-index") == maxZIndex;
                          }).off("click").on("click", function () {
                            $dialogNameInvalid.dialog("close");
                          });
                          $dialogNameInvalid.parent().focus().off("keypress").on("keypress", function (keypressEvent) {
                            if (keypressEvent.which == 13) {
                              $(this).find(".btn-green-dialog").click();
                            }
                          });
                        },
                        close: function () {
                          $dialogNameInvalid.dialog("destroy");
                          $dialogNameInvalid.hide();
                        },
                        buttons: {
                          Close: {
                            class: "btn-green-dialog",
                            text: "Close",
                            click: function () {
                              $dialogNameInvalid.dialog("close");
                            }
                          }
                        }
                      }).show();
                    } else if (typeof settings.blocks["Frozen Turkey," + newBlockName] != "undefined" || typeof settings.blocks["Focused Turkey," + newBlockName] != "undefined" || typeof settings.blocks[newBlockName] != "undefined") {
                      var $dialogNameDuplicate = $("#dialog-edit-block-name-duplicate");
                      $dialogNameDuplicate.dialog({
                        modal: true,
                        position: {
                          my: "center",
                          at: "center",
                          of: $(".page-content-wrapper")
                        },
                        width: "350px",
                        draggable: false,
                        title: "Name Already in Use",
                        open: function () {
                          var maxZIndex = getMaxZ($(".ui-widget-overlay"));
                          $(".ui-widget-overlay").filter(function () {
                            return $(this).css("z-index") == maxZIndex;
                          }).off("click").on("click", function () {
                            $dialogNameDuplicate.dialog("close");
                          });
                          $dialogNameDuplicate.parent().focus().off("keypress").on("keypress", function (keypressEvent) {
                            if (keypressEvent.which == 13) {
                              $(this).find(".btn-green-dialog").click();
                            }
                          });
                        },
                        close: function () {
                          $dialogNameDuplicate.dialog("destroy");
                          $dialogNameDuplicate.hide();
                        },
                        buttons: {
                          Close: {
                            class: "btn-green-dialog",
                            text: "Close",
                            click: function () {
                              $dialogNameDuplicate.dialog("close");
                            }
                          }
                        }
                      }).show();
                    } else {
                      $dialogSaveBlockAs.dialog("close");
                      $dialogContent.dialog("close");
                      var newBlockObject = {
                        enabled: "false",
                        autostart: "none",
                        type: "continuous",
                        startTime: "",
                        pomodoroTime: "",
                        timer: ""
                      };
                      newBlockObject.lock = settings.settings.password != "" && AppState.passwordStrict.indexOf("lock") >= 0 ? "spassword" : "none";
                      newBlockObject.lockUnblock = "true";
                      newBlockObject.restartUnblock = "true";
                      newBlockObject.break = "none";
                      newBlockObject.password = "";
                      newBlockObject.randomTextLength = "";
                      newBlockObject.window = "";
                      newBlockObject.users = "all";
                      newBlockObject.web = savedWebsites;
                      newBlockObject.exceptions = savedExceptions;
                      newBlockObject.apps = savedApps;
                      newBlockObject.schedule = [];
                      newBlockObject.customUsers = [];
                      settings.blocks[newBlockName] = newBlockObject;
                      updateBlocks(false);
                      save();
                    }
                  }
                }
              }
            }).show();
          } else {
            var commitSave = function() {
              $dialogContent.dialog("close");
              settings.blocks[blockName].web = savedWebsites;
              settings.blocks[blockName].exceptions = savedExceptions;
              settings.blocks[blockName].apps = savedApps;
              updateBlocks(false);
              save();
            };
            if (!isNewBlock && isWhitelistBlock(blockName)) {
              flushWhitelistOps().always(commitSave);
            } else {
              commitSave();
            }
          }
        }
      }
    }
  }).show();
}
