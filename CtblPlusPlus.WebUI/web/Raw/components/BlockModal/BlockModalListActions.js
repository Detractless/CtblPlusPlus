
import { showListTooLargeError } from './BlockModalDialogs';
import { getMaxZ } from '../Modal/Modal';
import { toHtml, fromHtml, escapeRegExp } from '../../utils/formatString';
import { predefinedLists } from '../../constants/predefinedLists';
import { showImportURLsInvalid, showImportAppsInvalid } from '../../pages/ImportBlocks/ImportBlocks';
import { ImportExportService } from '../../services/importExportService';
import { AppState } from '../../store/AppState';
import { validateAndCleanUrl } from '../../utils/validateUrl';
import { cancelQueuedDelay, enqueueListAction, cancelListAction } from '../../services/CtblApiClient';
import { findLockType } from '../../lockTypes';

var pendingQueueOps = [];
var nextPendingId = 0;

export function clearPendingQueueOps() {
  pendingQueueOps = [];
  nextPendingId = 0;
}

function removePendingOp(pendingId) {
  pendingQueueOps = pendingQueueOps.filter(function (op) {
    return op.id !== pendingId;
  });
}

export function flushPendingQueueOps() {
  var ops = pendingQueueOps;
  pendingQueueOps = [];
  var promises = [];
  ops.forEach(function (op) {
    if (op.type === 'enqueue-list-action') {
      promises.push(enqueueListAction(op.blockName, op.url, op.actionType));
    } else if (op.type === 'cancel-queued-delay') {
      promises.push(cancelQueuedDelay(op.blockName).then(function () {
        var idx = AppState.queuedDelays ? AppState.queuedDelays.indexOf(op.blockName) : -1;
        if (idx > -1) AppState.queuedDelays.splice(idx, 1);
      }));
    } else if (op.type === 'cancel-list-action') {
      promises.push(cancelListAction(op.requestId));
    }
  });
  return $.when.apply($, promises);
}

var dialogDirty = false;

export function markDirty() {
  if (!dialogDirty) {
    dialogDirty = true;
    $("#dialog-edit-block").closest(".ui-dialog")
      .find(".ui-dialog-buttonpane .btn-green-dialog").addClass("save-pulse");
  }
}

export function resetDirty() {
  dialogDirty = false;
  $("#dialog-edit-block").closest(".ui-dialog")
    .find(".ui-dialog-buttonpane .btn-green-dialog").removeClass("save-pulse");
}

export function addUrl(listType, url, isBatch) {
  var cleanedUrl = validateAndCleanUrl(url);
  lastCustomSelectedIndex = null;
  if (cleanedUrl != "" && cleanedUrl != "null") {
    if ($("#blocklist-" + listType + "-list div[data-value=\"" + cleanedUrl.replace(/'/g, "\\'").replace(/"/g, "\\\"") + "\"]").length < 1) {
      if (listType == "exceptions") {
        var hasConflict = false;
        AppState.lockedBlockList.forEach(function (lockedUrl) {
          var lockedDomainPart = "";
          var normalizedLockedUrl = lockedUrl.replace(/\/$/, "").toLowerCase();
          var lockedDomain = normalizedLockedUrl.split("/")[0];
          var lockedDomainParts = lockedDomain.split(".");
          if ((lockedDomain.indexOf("localhost") != 0 || lockedDomain.indexOf("file") != 0 || lockedDomain.indexOf("chrome-extension") != 0 || lockedDomain.indexOf("moz-extension") != 0 || lockedDomain.indexOf("extension") != 0) && lockedDomainParts.length > 1) {
            lockedDomainPart = lockedDomainParts[lockedDomainParts.length - 2] + "." + lockedDomainParts[lockedDomainParts.length - 1];
          } else {
            lockedDomainPart = lockedDomain;
          }
          var newDomainPart = "";
          var normalizedNewUrl = cleanedUrl.replace(/\/$/, "").toLowerCase();
          var newDomain = normalizedNewUrl.split("/")[0];
          var newDomainParts = newDomain.split(".");
          if ((newDomain.indexOf("localhost") != 0 || newDomain.indexOf("file") != 0 || newDomain.indexOf("chrome-extension") != 0 || newDomain.indexOf("moz-extension") != 0 || newDomain.indexOf("extension") != 0) && newDomainParts.length > 1) {
            newDomainPart = newDomainParts[newDomainParts.length - 2] + "." + newDomainParts[newDomainParts.length - 1];
          } else {
            newDomainPart = newDomain;
          }
          var lockedHasPath = normalizedLockedUrl.indexOf("/") > 0 ? true : false;
          var newHasPath = normalizedNewUrl.indexOf("/") > 0 ? true : false;
          if (cleanedUrl.indexOf("*") >= 0 || lockedUrl.indexOf(".") < 0 && lockedUrl.indexOf("*") >= 0) {
            hasConflict = true;
          }
          if (newDomain == lockedDomain) {
            if (lockedHasPath && newHasPath) {
              if (normalizedNewUrl.match(new RegExp("^" + escapeRegExp(normalizedLockedUrl) + "$"))) {
                hasConflict = true;
              } else if (normalizedLockedUrl == "youtube.com/watch" && normalizedNewUrl.match(new RegExp(/^youtube\.com\/(?!accounts(?:\/|$)|shorts(?:\/|$)|premium(?:\/|$)|live(?:\/|$)|channel(?:\/|$)|user(?:\/|$)|playlist(?:\/|$)|feed(?:\/|$)|results(?:\/|$)|embed(?:\/|$))[^\/?]+$/gm))) {
                hasConflict = true;
              }
            } else if (newDomainPart.match(new RegExp("^" + escapeRegExp(lockedDomainPart) + "$"))) {
              hasConflict = true;
            }
          } else if (lockedDomain.match(new RegExp("^(.*\\.)?" + escapeRegExp(newDomain) + "$"))) {
            if (!newHasPath) {
              hasConflict = true;
            }
          } else if (newDomain.match(new RegExp("^(.*\\.)?" + escapeRegExp(lockedDomain) + "$"))) {
            if (!lockedHasPath) {
              hasConflict = true;
            }
          }
        });
        if (hasConflict) {
          if (!isBatch) {
            var $dialogBlockErrorExceptionConflict = $("#dialog-edit-block-error-exception-conflict");
            $dialogBlockErrorExceptionConflict.dialog({
              modal: true,
              position: {
                my: "center",
                at: "center",
                of: $(".page-content-wrapper")
              },
              width: "350px",
              draggable: false,
              title: "This Isn't Allowed",
              open: function () {
                var maxZ = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == maxZ;
                }).off("click").on("click", function () {
                  $dialogBlockErrorExceptionConflict.dialog("close");
                });
                $dialogBlockErrorExceptionConflict.parent().focus().off("keypress").on("keypress", function (event) {
                  if (event.which == 13) {
                    $(this).find(".btn-green-dialog").click();
                  }
                });
              },
              close: function () {
                $dialogBlockErrorExceptionConflict.dialog("destroy");
                $dialogBlockErrorExceptionConflict.hide();
                $("#blocklist-" + listType + "-add").focus().select();
              },
              buttons: {
                Close: {
                  class: "btn-green-dialog",
                  text: "Close",
                  click: function () {
                    $dialogBlockErrorExceptionConflict.dialog("close");
                  }
                }
              }
            }).show();
          }
          return false;
        }
      }
      if (listType === "exceptions") {
        var blockName = $("#dialog-edit-block").attr("data-saveTitle");
        if (blockName && settings.blocks[blockName]) {
          var matchedLock = findLockType(blockName, settings.blocks[blockName]);
          if (matchedLock && matchedLock.id === "queuedDelay") {
            var pendingId = nextPendingId++;
            pendingQueueOps.push({ id: pendingId, type: 'enqueue-list-action', blockName: blockName, url: cleanedUrl, actionType: 'add-exception' });
            markDirty();
            $("#blocklist-queue-list > div:not(.custom-option)").remove();
            $("#blocklist-queue-list").append(
              '<div class="custom-option" onmousedown="customSelect(this, event)" '
              + 'data-value="' + toHtml(cleanedUrl).replace(/"/g, "&quot;") + '" '
              + 'data-entry-type="list-action" '
              + 'data-pending="true" '
              + 'data-pending-id="' + pendingId + '">'
              + toHtml(cleanedUrl) + ' - Adding Exception - pending</div>'
            );
            $("#blocklist-" + listType + "-add").val("").select().focus();
            return true;
          }
        }
      }
      $("#blocklist-" + listType + "-list").append("<div class=\"custom-option\" ondblclick=\"customSelectEdit(this, '" + listType + "');\" onmousedown=\"customSelect(this, event);\" data-locked=\"false\" data-value=\"" + toHtml(cleanedUrl) + "\">" + toHtml(cleanedUrl) + "</div>");
      markDirty();
      if (!isBatch) {
        var $listDivs = $("#blocklist-" + listType + "-list div");
        var mappedDivs = $listDivs.map(function (divIndex, divElement) {
          return {
            t: $(divElement).text(),
            v: $(divElement).attr("data-value"),
            l: $(divElement).attr("data-locked")
          };
        }).get();
        mappedDivs.sort(function (divA, divB) {
          if (divA.t > divB.t) {
            return 1;
          } else if (divA.t < divB.t) {
            return -1;
          } else {
            return 0;
          }
        });
        $listDivs.each(function (eachIndex, eachElement) {
          $(eachElement).attr("data-value", mappedDivs[eachIndex].v);
          $(eachElement).attr("data-locked", mappedDivs[eachIndex].l);
          $(eachElement).text(mappedDivs[eachIndex].t);
        });
      }
    }
    $("#blocklist-" + listType + "-list div").removeClass("selected");
    $("#blocklist-" + listType + "-list div[data-value=\"" + cleanedUrl.replace(/'/g, "\\'").replace(/"/g, "\\\"") + "\"]").addClass("selected");
    $("#blocklist-" + listType + "-list div[data-value=\"" + cleanedUrl.replace(/'/g, "\\'").replace(/"/g, "\\\"") + "\"]").focus();
    $("#blocklist-" + listType + "-add").val("");
    if (!isBatch) {
      var offsetTop = $("#blocklist-" + listType + "-list div[data-value=\"" + cleanedUrl.replace(/'/g, "\\'").replace(/"/g, "\\\"") + "\"]").get(0).offsetTop - 295;
      $("#blocklist-" + listType + "-list").scrollTop(offsetTop);
    }
  }
  $("#blocklist-" + listType + "-add").select().focus();
  return true;
}
export var lastCustomSelectedIndex = null;
export function customSelect(element, event) {
  var parentElement = element.parentElement;
  var parentId = parentElement.id;
  var $childrenDivs = $("#" + parentId + " > div");
  var elementIndex = $childrenDivs.index(element);
  if (event.shiftKey && lastCustomSelectedIndex !== null) {
    var minIndex = Math.min(lastCustomSelectedIndex, elementIndex);
    var maxIndex = Math.max(lastCustomSelectedIndex, elementIndex);
    $childrenDivs.slice(minIndex, maxIndex + 1).addClass("selected");
    lastCustomSelectedIndex = elementIndex;
  } else if (event.ctrlKey) {
    $(element).toggleClass("selected");
    lastCustomSelectedIndex = elementIndex;
  } else {
    $childrenDivs.removeClass("selected");
    $(element).addClass("selected");
    lastCustomSelectedIndex = elementIndex;
  }
  $("#" + parentId).focus();
}
export function customSelectEdit(element, listType) {
  $("#blocklist-" + listType + "-list div.custom-option").removeClass("selected");
  $(element).addClass("selected");
  $("#blocklist-" + listType + "-add").val($(element).attr("data-value"));
  if ($(element).attr("data-locked") == "false") {
    removeEntry(listType);
  }
  $("#blocklist-" + listType + "-add").focus();
}
export function removeEntry(listType) {
  lastCustomSelectedIndex = null;
  if ($("#blocklist-" + listType + "-list div.custom-option.selected").length > 0) {
    if (listType === "queue") {
      var blockName = $("#dialog-edit-block").attr("data-saveTitle");
      var $selected = $("#blocklist-queue-list div.custom-option.selected");
      var pendingEntries = $selected.filter('[data-pending="true"]');
      var serverEntries = $selected.not('[data-pending="true"]');
      pendingEntries.each(function () {
        var pendingId = parseInt($(this).attr("data-pending-id"), 10);
        removePendingOp(pendingId);
        $(this).remove();
      });
      var unlockEntries = serverEntries.filter('[data-entry-type="block-unlock"]');
      var listActionEntries = serverEntries.filter('[data-entry-type="list-action"]');
      if (unlockEntries.length > 0) {
        pendingQueueOps.push({ id: nextPendingId++, type: 'cancel-queued-delay', blockName: blockName });
        unlockEntries.remove();
      }
      listActionEntries.each(function () {
        var requestId = $(this).attr("data-request-id");
        pendingQueueOps.push({ id: nextPendingId++, type: 'cancel-list-action', requestId: requestId });
        $(this).remove();
      });
      if ($("#blocklist-queue-list div.custom-option").length === 0) {
        $("#blocklist-queue-list").html("<div style='padding: 15px; text-align: center; opacity: 0.7;'>No pending actions for this block.</div>");
      }
      markDirty();
      return;
    }
    var lockedStatuses = $("#blocklist-" + listType + "-list div.custom-option.selected").map(function () {
      if (typeof $(this).attr("data-locked") != "undefined" && $(this).attr("data-locked") == "true") {
        return true;
      } else {
        return false;
      }
    }).get();
    if (listType != "exceptions" && lockedStatuses.indexOf(true) != -1) {
      var blockName = $("#dialog-edit-block").attr("data-saveTitle");
      var matchedLock = blockName && settings.blocks[blockName] ? findLockType(blockName, settings.blocks[blockName]) : null;
      if (matchedLock && matchedLock.id === "queuedDelay") {
        var actionType = listType === "websites" ? "remove-website" : "remove-app";
        var $selectedLocked = $("#blocklist-" + listType + "-list div.custom-option.selected").filter(function () {
          return $(this).attr("data-locked") === "true";
        });
        $selectedLocked.each(function () {
          var url = $(this).attr("data-value");
          var pendingId = nextPendingId++;
          pendingQueueOps.push({ id: pendingId, type: 'enqueue-list-action', blockName: blockName, url: url, actionType: actionType });
          var actionLabel = actionType === "remove-app" ? "Removing App" : "Removing";
          $("#blocklist-queue-list > div:not(.custom-option)").remove();
          $("#blocklist-queue-list").append(
            '<div class="custom-option" onmousedown="customSelect(this, event)" '
            + 'data-value="' + toHtml(url).replace(/"/g, "&quot;") + '" '
            + 'data-entry-type="list-action" '
            + 'data-pending="true" '
            + 'data-pending-id="' + pendingId + '">'
            + toHtml(url) + ' - ' + actionLabel + ' - pending</div>'
          );
        });
        $selectedLocked.addClass("queued-pending");
        markDirty();
        return;
      }
      var $dialogBlockErrorExceptionConflict = $("#dialog-edit-block-error-delete-conflict");
      $dialogBlockErrorExceptionConflict.dialog({
        modal: true,
        position: {
          my: "center",
          at: "center",
          of: $(".page-content-wrapper")
        },
        width: "350px",
        draggable: false,
        title: "This Isn't Allowed",
        open: function () {
          var maxZ = getMaxZ($(".ui-widget-overlay"));
          $(".ui-widget-overlay").filter(function () {
            return $(this).css("z-index") == maxZ;
          }).off("click").on("click", function () {
            $dialogBlockErrorExceptionConflict.dialog("close");
          });
          $dialogBlockErrorExceptionConflict.parent().focus().off("keypress").on("keypress", function (event) {
            if (event.which == 13) {
              $(this).find(".btn-green-dialog").click();
            }
          });
        },
        close: function () {
          $dialogBlockErrorExceptionConflict.dialog("destroy");
          $dialogBlockErrorExceptionConflict.hide();
        },
        buttons: {
          Close: {
            class: "btn-green-dialog",
            text: "Close",
            click: function () {
              $dialogBlockErrorExceptionConflict.dialog("close");
            }
          }
        }
      }).show();
      return;
    }
    var selectedIndex = $("#blocklist-" + listType + "-list div.custom-option.selected").index();
    $("#blocklist-" + listType + "-list").find("div.selected").remove();
    markDirty();
    $("#blocklist-" + listType + "-list div").removeClass("selected");
    if (typeof selectedIndex != "undefined" && selectedIndex < $("#blocklist-" + listType + "-list div.custom-option").length - 1) {
      $("#blocklist-" + listType + "-list div").eq(selectedIndex).addClass("selected");
      $("#blocklist-" + listType + "-list div").eq(selectedIndex).focus();
    } else {
      $("#blocklist-" + listType + "-list div").last().addClass("selected");
      $("#blocklist-" + listType + "-list div").last().focus();
    }
  }
}
export function selectList(listType) {
  $("#blocklist-" + listType + "-list div").addClass("selected");
  $("#blocklist-" + listType + "-list").focus();
}
export function deselectList(listType) {
  $("#blocklist-" + listType + "-list div").removeClass("selected");
  $("#blocklist-" + listType + "-list").focus();
}
export function selectUsersList() {
  $("#dialog-edit-users-list div").addClass("selected");
  $("#dialog-edit-users-list").focus();
}
export function deselectUsersList() {
  $("#dialog-edit-users-list div").removeClass("selected");
  $("#dialog-edit-users-list").focus();
}
export function selectNetworksList() {
  $("#dialog-edit-networks-list div").addClass("selected");
  $("#dialog-edit-networks-list").focus();
}
export function deselectNetworksList() {
  $("#dialog-edit-networks-list div").removeClass("selected");
  $("#dialog-edit-networks-list").focus();
}
export function addList(listName, listArray) {
  if (typeof listArray[0] != "undefined" && listArray[0] == "error:list-too-large") {
    showListTooLargeError();
  } else if (typeof listArray[0] != "undefined" && listArray[0] == "error:list-invalid") {
    showImportURLsInvalid();
  } else {
    $.each(listArray, function (index, urlItem) {
      addUrl(listName, urlItem, true);
    });
    var $listItems = $("#blocklist-" + listName + "-list div");
    var itemsData = $listItems.map(function (indexData, itemDiv) {
      return {
        t: $(itemDiv).text(),
        c: $(itemDiv).attr("class"),
        l: $(itemDiv).attr("data-locked"),
        v: $(itemDiv).attr("data-value")
      };
    }).get();
    itemsData.sort(function (a, b) {
      if (a.t > b.t) {
        return 1;
      } else if (a.t < b.t) {
        return -1;
      } else {
        return 0;
      }
    });
    $listItems.each(function (indexUpdate, itemDivUpdate) {
      $(itemDivUpdate).attr("data-value", itemsData[indexUpdate].v);
      $(itemDivUpdate).attr("data-locked", itemsData[indexUpdate].l);
      $(itemDivUpdate).text(itemsData[indexUpdate].t);
      $(itemDivUpdate).attr("class", itemsData[indexUpdate].c);
    });
  }
}
export function importApplications(appsArray) {
  var htmlString = "";
  lastCustomSelectedIndex = null;
  try {
    if (appsArray == undefined) {
      appsArray = ImportExportService.importApplications();
    }
  } catch (error) {
    showImportAppsInvalid();
    return;
  }
  if (typeof appsArray[0] != "undefined" && appsArray[0] == "error:list-too-large") {
    showListTooLargeError();
  } else if (typeof appsArray[0] != "undefined" && appsArray[0] == "error:list-invalid") {
    showImportAppsInvalid();
  } else {
    $.each(appsArray, function (appIndex, appItem) {
      if ($("#blocklist-apps-list div[data-value=\"" + toHtml(appItem) + "\"]").length < 1) {
        if (appItem.indexOf("folder:") == 0) {
          htmlString = htmlString + "<div class=\"custom-option\" onmousedown=\"customSelect(this, event);\" data-locked=\"false\" data-value=\"" + toHtml(appItem) + "\">" + toHtml(appItem.replace(/[\/]/g, "\\").slice(appItem.indexOf(":") + 1)) + "</div>";
        } else if (appItem.indexOf("file:") == 0) {
          htmlString = htmlString + "<div class=\"custom-option\" onmousedown=\"customSelect(this, event);\" data-locked=\"false\" data-value=\"" + toHtml(appItem) + "\">" + toHtml(appItem.replace(/[\/]/g, "\\").slice(appItem.indexOf(":") + 1)) + "</div>";
        } else if (appItem.indexOf("title:") == 0) {
          htmlString = htmlString + "<div class=\"custom-option\" onmousedown=\"customSelect(this, event);\" data-locked=\"false\" data-value=\"" + toHtml(appItem) + "\">\"" + toHtml(appItem.slice(appItem.indexOf(":") + 1)) + "\"</div>";
        } else if (appItem.indexOf("win10:") == 0) {
          htmlString = htmlString + "<div class=\"custom-option\" onmousedown=\"customSelect(this, event);\" data-locked=\"false\" data-value=\"" + toHtml(appItem) + "\">" + toHtml(appItem.slice(appItem.indexOf(":") + 1)) + "</div>";
        }
      }
    });
    $("#blocklist-apps-list").append(htmlString);
    markDirty();
    var $appItems = $("#blocklist-apps-list div");
    var appsData = $appItems.map(function (indexData, appDiv) {
      return {
        t: $(appDiv).text(),
        c: $(appDiv).attr("class"),
        l: $(appDiv).attr("data-locked"),
        v: $(appDiv).attr("data-value")
      };
    }).get();
    appsData.sort(function (a, b) {
      if (a.t > b.t) {
        return 1;
      } else if (a.t < b.t) {
        return -1;
      } else {
        return 0;
      }
    });
    $appItems.each(function (indexUpdate, appDivUpdate) {
      $(appDivUpdate).attr("data-value", appsData[indexUpdate].v);
      $(appDivUpdate).attr("data-locked", appsData[indexUpdate].l);
      $(appDivUpdate).text(appsData[indexUpdate].t);
      $(appDivUpdate).attr("class", appsData[indexUpdate].c);
    });
  }
}
export function exportList(listName) {
  var exportedItems = [];
  var $listItems = $("#blocklist-" + listName + "-list div");
  $listItems.each(function (itemIndex, itemDiv) {
    exportedItems.push(fromHtml($(itemDiv).attr("data-value")));
  });
  ImportExportService.exportList(listName, $("#dialog-edit-block").attr("data-saveTitle"), exportedItems.join("\r\n"));
}
export function importSearches(listName) {
  var $dialogAddSearches = $("#dialog-edit-block-import-searches");
  $dialogAddSearches.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Add Searches Containing...",
    open: function () {
      var maxZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ;
      }).off("click").on("click", function () {
        $dialogAddSearches.dialog("close");
      });
      $("#dialog-edit-block-import-searches-text").val("").keypress(function (event) {
        if (event.which == 13) {
          $("#dialog-edit-block-import-searches-add").click();
        }
      });
      $("#dialog-edit-block-import-searches-text").focus();
    },
    close: function () {
      $("#dialog-edit-block-import-searches-text").off("keypress");
      $dialogAddSearches.dialog("destroy");
      $dialogAddSearches.hide();
      $("#blocklist-" + listName + "-list").focus();
    },
    buttons: {
      "Close without adding": {
        class: "btn-grey-dialog",
        text: "Close without adding",
        click: function () {
          $dialogAddSearches.dialog("close");
        }
      },
      Add: {
        class: "btn-green-dialog",
        id: "dialog-edit-block-import-searches-add",
        text: "Add",
        click: function () {
          var searchText = $("#dialog-edit-block-import-searches-text").val().normalizeOnlyHiddenChars().replace(/\s+/g, "*");
          if (searchText == "" || searchText.indexOf("\\") >= 0) {
            var $dialogSearchInvalid = $("#dialog-edit-block-phrase-invalid");
            $dialogSearchInvalid.dialog({
              modal: true,
              position: {
                my: "center",
                at: "center",
                of: $(".page-content-wrapper")
              },
              width: "350px",
              draggable: false,
              title: "Invalid Search Phrase",
              open: function () {
                var maxZInvalid = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == maxZInvalid;
                }).off("click").on("click", function () {
                  $dialogSearchInvalid.dialog("close");
                });
                $dialogSearchInvalid.parent().focus().off("keypress").on("keypress", function (eventInvalid) {
                  if (eventInvalid.which == 13) {
                    $(this).find(".btn-green-dialog").click();
                  }
                });
              },
              close: function () {
                $dialogSearchInvalid.dialog("destroy");
                $dialogSearchInvalid.hide();
              },
              buttons: {
                Close: {
                  class: "btn-green-dialog",
                  text: "Close",
                  click: function () {
                    $dialogSearchInvalid.dialog("close");
                  }
                }
              }
            }).show();
          } else {
            $dialogAddSearches.dialog("close");
            addUrl(listName, "*.*/*q=*" + searchText + "*", true);
            addUrl(listName, "*.*/*p=*" + searchText + "*", false);
            addUrl(listName, "youtube.*/*search_query=*" + searchText + "*", false);
          }
        }
      }
    }
  });
}
export function importUrlContaining(listName) {
  var $dialogAddUrlContaining = $("#dialog-edit-block-import-urls-containing");
  $dialogAddUrlContaining.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Add All URLs Containing...",
    open: function () {
      var maxZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ;
      }).off("click").on("click", function () {
        $dialogAddUrlContaining.dialog("close");
      });
      $("#dialog-edit-block-import-urls-containing-text").val("").keypress(function (event) {
        if (event.which == 13) {
          $("#dialog-edit-block-import-urls-containing-add").click();
        }
      });
      $("#dialog-edit-block-import-urls-containing-text").focus();
    },
    close: function () {
      $("#dialog-edit-block-import-urls-containing-text").off("keypress");
      $dialogAddUrlContaining.dialog("destroy");
      $dialogAddUrlContaining.hide();
      $("#blocklist-" + listName + "-list").focus();
    },
    buttons: {
      "Close without adding": {
        class: "btn-grey-dialog",
        text: "Close without adding",
        click: function () {
          $dialogAddUrlContaining.dialog("close");
        }
      },
      Add: {
        class: "btn-green-dialog",
        id: "dialog-edit-block-import-urls-containing-add",
        text: "Add",
        click: function () {
          var urlText = $("#dialog-edit-block-import-urls-containing-text").val().normalizeOnlyHiddenChars().replace(/\s+/g, "*");
          if (urlText == "" || urlText.indexOf("\\") >= 0) {
            var $dialogUrlContainingInvalid = $("#dialog-edit-block-phrase-invalid");
            $dialogUrlContainingInvalid.dialog({
              modal: true,
              position: {
                my: "center",
                at: "center",
                of: $(".page-content-wrapper")
              },
              width: "350px",
              draggable: false,
              title: "Invalid Phrase",
              open: function () {
                var maxZInvalid = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == maxZInvalid;
                }).off("click").on("click", function () {
                  $dialogUrlContainingInvalid.dialog("close");
                });
                $dialogUrlContainingInvalid.parent().focus().off("keypress").on("keypress", function (eventInvalid) {
                  if (eventInvalid.which == 13) {
                    $(this).find(".btn-green-dialog").click();
                  }
                });
              },
              close: function () {
                $dialogUrlContainingInvalid.dialog("destroy");
                $dialogUrlContainingInvalid.hide();
              },
              buttons: {
                Close: {
                  class: "btn-green-dialog",
                  text: "Close",
                  click: function () {
                    $dialogUrlContainingInvalid.dialog("close");
                  }
                }
              }
            }).show();
          } else {
            $dialogAddUrlContaining.dialog("close");
            addUrl(listName, "*" + urlText + "*", false);
          }
        }
      }
    }
  });
}
export function importAdult() {
  var $dialogAddAdult = $("#dialog-edit-block-import-adult");
  $dialogAddAdult.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Add All Adult Websites...",
    open: function () {
      var maxZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ;
      }).off("click").on("click", function () {
        $dialogAddAdult.dialog("close");
      });
    },
    close: function () {
      $dialogAddAdult.dialog("destroy");
      $dialogAddAdult.hide();
      $("#blocklist-websites-list").focus();
    },
    buttons: {
      "Close without adding": {
        class: "btn-grey-dialog",
        text: "Close without adding",
        click: function () {
          $dialogAddAdult.dialog("close");
        }
      },
      "Add *.xxx": {
        class: "btn-green-dialog",
        id: "dialog-edit-block-import-urls-containing-add",
        text: "Add *.xxx",
        click: function () {
          $dialogAddAdult.dialog("close");
          addUrl("websites", "*.xxx", false);
        }
      }
    }
  });
}
export function importList(listName, categoryName) {
  addList(listName, predefinedLists[categoryName]);
}

window.addUrl = addUrl;
window.customSelect = customSelect;
window.customSelectEdit = customSelectEdit;
window.removeEntry = removeEntry;
window.selectList = selectList;
window.deselectList = deselectList;
window.selectUsersList = selectUsersList;
window.deselectUsersList = deselectUsersList;
window.selectNetworksList = selectNetworksList;
window.deselectNetworksList = deselectNetworksList;
window.addList = addList;
window.importApplications = importApplications;
window.exportList = exportList;
window.importSearches = importSearches;
window.importUrlContaining = importUrlContaining;
window.importAdult = importAdult;
window.importList = importList;
window.clearPendingQueueOps = clearPendingQueueOps;
window.flushPendingQueueOps = flushPendingQueueOps;
window.markDirty = markDirty;
window.resetDirty = resetDirty;
