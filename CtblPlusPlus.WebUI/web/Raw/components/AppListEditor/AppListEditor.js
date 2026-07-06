
import { customSelect, lastCustomSelectedIndex } from '../StatsToggle/StatsToggle';
import { getMaxZ } from '../Modal/Modal';
import { toHtml } from '../../utils/formatString';

﻿function addApplicationExe(rawExePath) {
  if (RegExp("^file:.:/", "g").test(rawExePath)) {
    var exePathParts = rawExePath.split("::");
    var isInvalidExe = false;
    lastCustomSelectedIndex = null;
    $("#blocklist-apps-list div").removeClass("selected");
    $.each(exePathParts, function (pathIndex, currentPath) {
      if ($("#blocklist-apps-list div[data-value=\"" + currentPath.replace(/'/g, "\\'").replace(/"/g, "\\\"") + "\"]").length < 1) {
        var exeName = currentPath.replace(/[\/]/g, "\\").slice(currentPath.indexOf(":") + 1);
        if ((exeName.toLowerCase().match(".exe$") == ".exe" || exeName.toLowerCase().match(".bin$") == ".bin" || exeName.toLowerCase().match(".com$") == ".com") && exeName.toLowerCase().match("servicehub.power.exe$") != "servicehub.power.exe" && exeName.toLowerCase().match("servicehub.helper.exe$") != "servicehub.helper.exe" && exeName.toLowerCase().match("cold turkey blocker.exe$") != "cold turkey blocker.exe" && exeName.toLowerCase().match("ctmsghostfirefox.exe$") != "ctmsghostfirefox.exe" && exeName.toLowerCase().match("ctmsghostedge.exe$") != "ctmsghostedge.exe" && exeName.toLowerCase().match("ctmsghostchrome.exe$") != "ctmsghostchrome.exe" && exeName.toLowerCase().match("cold turkey micromanager.exe$") != "cold turkey micromanager.exe" && exeName.toLowerCase().match("cold_turkey_writer_free.exe$") != "cold_turkey_writer_free.exe" && exeName.toLowerCase().match("cold_turkey_writer_pro.exe$") != "cold_turkey_writer_pro.exe") {
          $("#blocklist-apps-list").append("<div class=\"custom-option\" onmousedown=\"customSelect(this, event);\" data-locked=\"false\" data-value=\"" + toHtml(currentPath) + "\">" + toHtml(exeName) + "</div>");
        } else {
          isInvalidExe = true;
        }
      }
      $("#blocklist-apps-list div[data-value=\"" + currentPath.replace(/'/g, "\\'").replace(/"/g, "\\\"") + "\"]").addClass("selected");
    });
    var $appListDivs = $("#blocklist-apps-list div");
    var appItems = $appListDivs.map(function (divIndex, divElement) {
      return {
        t: $(divElement).text(),
        v: $(divElement).attr("data-value"),
        l: $(divElement).attr("data-locked"),
        c: $(divElement).attr("class")
      };
    }).get();
    appItems.sort(function (appItemA, appItemB) {
      if (appItemA.t.toLowerCase() > appItemB.t.toLowerCase()) {
        return 1;
      } else if (appItemA.t.toLowerCase() < appItemB.t.toLowerCase()) {
        return -1;
      } else {
        return 0;
      }
    });
    $appListDivs.each(function (updateIndex, updateElement) {
      $(updateElement).attr("data-value", appItems[updateIndex].v);
      $(updateElement).attr("data-locked", appItems[updateIndex].l);
      $(updateElement).text(appItems[updateIndex].t);
      $(updateElement).attr("class", appItems[updateIndex].c);
    });
    if (typeof window.markDirty === "function") window.markDirty();
    if (isInvalidExe) {
      var $dialogInvalidExe = $("#dialog-edit-block-exe-invalid");
      $dialogInvalidExe.dialog({
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
          var maxZIndex = getMaxZ($(".ui-widget-overlay"));
          $(".ui-widget-overlay").filter(function () {
            return $(this).css("z-index") == maxZIndex;
          }).off("click").on("click", function () {
            $dialogInvalidExe.dialog("close");
          });
          $dialogInvalidExe.parent().focus().off("keypress").on("keypress", function (keypressEvent) {
            if (keypressEvent.which == 13) {
              $(this).find(".btn-green-dialog").click();
            }
          });
        },
        close: function () {
          $dialogInvalidExe.dialog("destroy");
          $dialogInvalidExe.hide();
        },
        buttons: {
          Close: {
            class: "btn-green-dialog",
            text: "Close",
            click: function () {
              $dialogInvalidExe.dialog("close");
            }
          }
        }
      }).show();
    }
    $("#blocklist-apps-list").focus();
  }
}
export function addApplicationFolder(rawFolderPath) {
  if (RegExp("^folder:.:", "g").test(rawFolderPath)) {
    var folderPathParts = rawFolderPath.split("::");
    var isInvalidFolder = false;
    var driveLetter = "c";
    try {
      driveLetter = window.location.href.replace("file:///", "")[0].toLocaleLowerCase();
    } catch (error) {}
    lastCustomSelectedIndex = null;
    $("#blocklist-apps-list div").removeClass("selected");
    $.each(folderPathParts, function (pathIndex, currentPath) {
      if ($("#blocklist-apps-list div[data-value=\"" + currentPath.replace(/'/g, "\\'").replace(/"/g, "\\\"") + "\"]").length < 1) {
        if (RegExp("^folder:" + driveLetter + ":$", "g").test(currentPath.toLowerCase()) == false && RegExp("^folder:" + driveLetter + ":/program files$", "g").test(currentPath.toLowerCase()) == false && RegExp("^folder:" + driveLetter + ":/program files \\(x86\\)$", "g").test(currentPath.toLowerCase()) == false && RegExp("^folder:" + driveLetter + ":.*/cold turkey$", "g").test(currentPath.toLowerCase()) == false && currentPath.toLowerCase().indexOf(":/windows") == -1) {
          $("#blocklist-apps-list").append("<div class=\"custom-option\" onmousedown=\"customSelect(this, event);\" data-locked=\"false\" data-value=\"" + toHtml(currentPath) + "\">" + toHtml(currentPath.slice(currentPath.indexOf(":") + 1).replace(/[\/]/g, "\\")) + "</div>");
        } else {
          isInvalidFolder = true;
        }
      }
      $("#blocklist-apps-list div[data-value=\"" + currentPath.replace(/'/g, "\\'").replace(/"/g, "\\\"") + "\"]").addClass("selected");
    });
    var $folderListDivs = $("#blocklist-apps-list div");
    var folderItems = $folderListDivs.map(function (divIndex, divElement) {
      return {
        t: $(divElement).text(),
        v: $(divElement).attr("data-value"),
        l: $(divElement).attr("data-locked"),
        c: $(divElement).attr("class")
      };
    }).get();
    folderItems.sort(function (folderItemA, folderItemB) {
      if (folderItemA.t.toLowerCase() > folderItemB.t.toLowerCase()) {
        return 1;
      } else if (folderItemA.t.toLowerCase() < folderItemB.t.toLowerCase()) {
        return -1;
      } else {
        return 0;
      }
    });
    $folderListDivs.each(function (updateIndex, updateElement) {
      $(updateElement).attr("data-value", folderItems[updateIndex].v);
      $(updateElement).attr("data-locked", folderItems[updateIndex].l);
      $(updateElement).text(folderItems[updateIndex].t);
      $(updateElement).attr("class", folderItems[updateIndex].c);
    });
    if (typeof window.markDirty === "function") window.markDirty();
    if (isInvalidFolder) {
      var $dialogInvalidFolder = $("#dialog-edit-block-folder-invalid");
      $dialogInvalidFolder.dialog({
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
          var maxZIndex = getMaxZ($(".ui-widget-overlay"));
          $(".ui-widget-overlay").filter(function () {
            return $(this).css("z-index") == maxZIndex;
          }).off("click").on("click", function () {
            $dialogInvalidFolder.dialog("close");
          });
          $dialogInvalidFolder.parent().focus().off("keypress").on("keypress", function (keypressEvent) {
            if (keypressEvent.which == 13) {
              $(this).find(".btn-green-dialog").click();
            }
          });
        },
        close: function () {
          $dialogInvalidFolder.dialog("destroy");
          $dialogInvalidFolder.hide();
        },
        buttons: {
          Close: {
            class: "btn-green-dialog",
            text: "Close",
            click: function () {
              $dialogInvalidFolder.dialog("close");
            }
          }
        }
      }).show();
    }
    $("#blocklist-apps-list").focus();
  }
}
export function showApplicationWin10Dialog() {
  settings.additional.win10 = JSON.parse(window.external.GetUpdatedWin10List());
  var $dialogAddAppWin10 = $("#dialog-edit-block-app-win10");
  $dialogAddAppWin10.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Add Microsoft Store Apps to Block",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogAddAppWin10.dialog("close");
      });
      $dialogAddAppWin10.parent().focus().off("keypress").on("keypress", function (keypressEvent) {
        if (keypressEvent.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
      var dialogHtml = "";
      var existingWin10Apps = $("#blocklist-apps-list div").map(function () {
        if ($(this).attr("data-value").indexOf("win10:" == 0)) {
          return $(this).attr("data-value");
        }
      }).get();
      $.each(settings.additional.win10.sort(function (win10AppA, win10AppB) {
        return win10AppA.toLowerCase().localeCompare(win10AppB.toLowerCase());
      }), function (win10AppIndex, win10AppName) {
        var disabledAttr = existingWin10Apps.indexOf("win10:" + win10AppName) >= 0 ? " disabled=\"disabled\"" : "";
        dialogHtml = dialogHtml + "<p class=\"dialog-edit-block-app-win10-static-width\"><button class=\"btn-green btn-win10 action-add-application-win10\" type=\"button\" data-appname=\"win10:" + toHtml(win10AppName).replace(/"/g, "&quot;") + "\"" + disabledAttr + "> Add </button> " + win10AppName + "</p>";
      });
      $("#dialog-edit-block-app-win10-list").html(dialogHtml);
      $("#dialog-edit-block-app-win10-list").off("click", ".action-add-application-win10").on("click", ".action-add-application-win10", function(e) {
        e.preventDefault();
        addApplicationWin10($(this).attr("data-appname"));
        $(this).attr("disabled", "disabled");
      });
    },
    close: function () {
      $dialogAddAppWin10.dialog("destroy");
      $dialogAddAppWin10.hide();
      $("#blocklist-apps-list").focus();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogAddAppWin10.dialog("close");
        }
      }
    }
  });
}
export function addApplicationWin10(win10AppPath) {
  lastCustomSelectedIndex = null;
  $("#blocklist-apps-list div").removeClass("selected");
  $("#blocklist-apps-list").append("<div class=\"custom-option\" onmousedown=\"customSelect(this, event);\" data-locked=\"false\" data-value=\"" + toHtml(win10AppPath) + "\">" + toHtml(win10AppPath.slice(win10AppPath.indexOf(":") + 1)) + "</div>");
  var $win10ListDivs = $("#blocklist-apps-list div");
  var win10Items = $win10ListDivs.map(function (divIndex, divElement) {
    return {
      t: $(divElement).text(),
      v: $(divElement).attr("data-value"),
      l: $(divElement).attr("data-locked"),
      c: $(divElement).attr("class")
    };
  }).get();
  win10Items.sort(function (win10ItemA, win10ItemB) {
    if (win10ItemA.t.toLowerCase() > win10ItemB.t.toLowerCase()) {
      return 1;
    } else if (win10ItemA.t.toLowerCase() < win10ItemB.t.toLowerCase()) {
      return -1;
    } else {
      return 0;
    }
  });
  $win10ListDivs.each(function (updateIndex, updateElement) {
    $(updateElement).attr("data-value", win10Items[updateIndex].v);
    $(updateElement).attr("data-locked", win10Items[updateIndex].l);
    $(updateElement).text(win10Items[updateIndex].t);
    $(updateElement).attr("class", win10Items[updateIndex].c);
  });
  $("#blocklist-apps-list div[data-value=\"" + win10AppPath.replace(/'/g, "\\'").replace(/"/g, "\\\"") + "\"]").addClass("selected");
  if (typeof window.markDirty === "function") window.markDirty();
}
export function showApplicationTitleDialog() {
  var $dialogAddAppTitle = $("#dialog-edit-block-app-title");
  $dialogAddAppTitle.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Add Window Title to Block",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogAddAppTitle.dialog("close");
      });
      $("#dialog-edit-block-app-title-text").val("").keypress(function (keypressEvent) {
        if (keypressEvent.which == 13) {
          $("#dialog-edit-block-app-title-add").click();
        }
      });
      $("#dialog-edit-block-app-title-text").focus();
    },
    close: function () {
      $("#dialog-edit-block-app-title-text").off("keypress");
      $dialogAddAppTitle.dialog("destroy");
      $dialogAddAppTitle.hide();
      $("#blocklist-apps-list").focus();
    },
    buttons: {
      "Close without adding": {
        class: "btn-grey-dialog",
        text: "Close without adding",
        click: function () {
          $dialogAddAppTitle.dialog("close");
        }
      },
      Add: {
        class: "btn-green-dialog",
        id: "dialog-edit-block-app-title-add",
        text: "Add",
        click: function () {
          var appTitle = $("#dialog-edit-block-app-title-text").val().normalizeOnlyHiddenChars();
          if (appTitle == "" || appTitle.indexOf("\\") >= 0) {
            var $dialogTitleInvalid = $("#dialog-edit-block-title-invalid");
            $dialogTitleInvalid.dialog({
              modal: true,
              position: {
                my: "center",
                at: "center",
                of: $(".page-content-wrapper")
              },
              width: "350px",
              draggable: false,
              title: "Invalid Window Title",
              open: function () {
                var invalidTitleZIndex = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == invalidTitleZIndex;
                }).off("click").on("click", function () {
                  $dialogTitleInvalid.dialog("close");
                });
                $dialogTitleInvalid.parent().focus().off("keypress").on("keypress", function (invalidTitleKeypress) {
                  if (invalidTitleKeypress.which == 13) {
                    $(this).find(".btn-green-dialog").click();
                  }
                });
              },
              close: function () {
                $dialogTitleInvalid.dialog("destroy");
                $dialogTitleInvalid.hide();
              },
              buttons: {
                Close: {
                  class: "btn-green-dialog",
                  text: "Close",
                  click: function () {
                    $dialogTitleInvalid.dialog("close");
                  }
                }
              }
            }).show();
          } else {
            addApplicationTitle("title:" + appTitle);
            $dialogAddAppTitle.dialog("close");
          }
        }
      }
    }
  });
}
export function addApplicationTitle(titlePath) {
  lastCustomSelectedIndex = null;
  $("#blocklist-apps-list div").removeClass("selected");
  if ($("#blocklist-apps-list div[data-value=\"" + titlePath.replace(/'/g, "\\'").replace(/"/g, "\\\"") + "\"]").length < 1) {
    $("#blocklist-apps-list").append("<div class=\"custom-option\" onmousedown=\"customSelect(this, event);\" data-locked=\"false\" data-value=\"" + toHtml(titlePath) + "\">\"" + toHtml(titlePath.slice(titlePath.indexOf(":") + 1)) + "\"</div>");
    var $titleListDivs = $("#blocklist-apps-list div");
    var titleItems = $titleListDivs.map(function (divIndex, divElement) {
      return {
        t: $(divElement).text(),
        v: $(divElement).attr("data-value"),
        l: $(divElement).attr("data-locked"),
        c: $(divElement).attr("class")
      };
    }).get();
    titleItems.sort(function (titleItemA, titleItemB) {
      if (titleItemA.t.toLowerCase() > titleItemB.t.toLowerCase()) {
        return 1;
      } else if (titleItemA.t.toLowerCase() < titleItemB.t.toLowerCase()) {
        return -1;
      } else {
        return 0;
      }
    });
    $titleListDivs.each(function (updateIndex, updateElement) {
      $(updateElement).attr("data-value", titleItems[updateIndex].v);
      $(updateElement).attr("data-locked", titleItems[updateIndex].l);
      $(updateElement).text(titleItems[updateIndex].t);
      $(updateElement).attr("class", titleItems[updateIndex].c);
    });
  }
  $("#blocklist-apps-list div[data-value=\"" + titlePath.replace(/'/g, "\\'").replace(/"/g, "\\\"") + "\"]").addClass("selected");
  if (typeof window.markDirty === "function") window.markDirty();
}

window.addApplicationExe = addApplicationExe;
window.addApplicationFolder = addApplicationFolder;
window.showApplicationWin10Dialog = showApplicationWin10Dialog;
window.addApplicationWin10 = addApplicationWin10;
window.showApplicationTitleDialog = showApplicationTitleDialog;
window.addApplicationTitle = addApplicationTitle;
