
import { customSelect, selectUsersList, lastCustomSelectedIndex } from '../StatsToggle/StatsToggle';
import { getMaxZ } from '../Modal/Modal';
import { toHtml, fromHtml, makeTitleWithBlockName } from '../../utils/formatString';
import { updateBlocks } from '../../pages/BlocksPage/BlocksPage';
import { scrollDownIfNeeded } from '../../pages/ListEditorPage/ListEditorPage';

﻿export function editUsers(blockName, isLocked) {
  var cleanBlockName = blockName;
  if (blockName.indexOf("Frozen Turkey,") == 0) {
    cleanBlockName = blockName.replace("Frozen Turkey,", "");
  } else if (blockName.indexOf("Focused Turkey,") == 0) {
    cleanBlockName = blockName.replace("Focused Turkey,", "");
  }
  lastCustomSelectedIndex = null;
  var $dialogEditUsers = $("#dialog-edit-users");
  $dialogEditUsers.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "367px",
    draggable: false,
    title: makeTitleWithBlockName("Apply '", cleanBlockName, "' To...", 365),
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogEditUsers.dialog("close");
      });
      if (settings.blocks[blockName].users == "all") {
        $("#edit-users-all").prop("checked", true);
        $("#dialog-edit-users-custom").addClass("users-disable");
        $("#dialog-edit-users-custom button").prop("disabled", true);
        $("#dialog-edit-users-custom a").prop("disabled", true);
      } else if (settings.blocks[blockName].users == "allcustom") {
        $("#edit-users-allcustom").prop("checked", true);
        $("#dialog-edit-users-custom").removeClass("users-disable");
        $("#dialog-edit-users-custom button").prop("disabled", false);
        $("#dialog-edit-users-custom a").prop("disabled", false);
      } else {
        $("#edit-users-custom").prop("checked", true);
        $("#dialog-edit-users-custom").removeClass("users-disable");
        $("#dialog-edit-users-custom button").prop("disabled", false);
        $("#dialog-edit-users-custom a").prop("disabled", false);
      }
      $("input[type=radio][name=users]").change(function () {
        if ($(this).hasClass("pro-cursor")) {
          $("#edit-users-all").prop("checked", true);
          return false;
        }
        if (this.value == "all") {
          $("#dialog-edit-users-custom").addClass("users-disable");
          $("#dialog-edit-users-custom button").prop("disabled", true);
          $("#dialog-edit-users-custom a").prop("disabled", true);
        } else if (this.value == "allcustom") {
          $("#dialog-edit-users-custom").removeClass("users-disable");
          $("#dialog-edit-users-custom button").prop("disabled", false);
          $("#dialog-edit-users-custom a").prop("disabled", false);
        } else {
          $("#dialog-edit-users-custom").removeClass("users-disable");
          $("#dialog-edit-users-custom button").prop("disabled", false);
          $("#dialog-edit-users-custom a").prop("disabled", false);
        }
      });
      var usersHtml = "";
      $.each(settings.blocks[blockName].customUsers, function (userIndex, userName) {
        var isUserLocked = "false";
        if (isLocked != "false" && settings.blocks[blockName].users == "custom") {
          isUserLocked = "true";
        }
        usersHtml = usersHtml + "<div class=\"custom-option\" onmousedown=\"customSelect(this, event);\" data-locked=\"" + isUserLocked + "\" data-value=\"" + toHtml(userName) + "\">" + toHtml(userName) + "</div>";
      });
      $("#dialog-edit-users-list").html(usersHtml);
      $("#dialog-edit-users-list").keydown(function (event) {
        if (event.which == 8 || event.which == 46) {
          $("#dialog-edit-users-remove-button").click();
        } else if (event.which == 38 && $("#dialog-edit-users-list div.custom-option.selected").prev().length == 1) {
          $("#dialog-edit-users-list div.custom-option.selected").toggleClass("selected").prev().toggleClass("selected");
          scrollUpIfNeeded($("#dialog-edit-users-list div.custom-option.selected")[0]);
          event.stopPropagation();
          return false;
        } else if (event.which == 40 && $("#dialog-edit-users-list div.custom-option.selected").next().length == 1) {
          $("#dialog-edit-users-list div.custom-option.selected").toggleClass("selected").next().toggleClass("selected");
          scrollDownIfNeeded($("#dialog-edit-users-list div.custom-option.selected")[0]);
          event.stopPropagation();
          return false;
        } else if (event.which == 65 && event.ctrlKey) {
          selectUsersList();
        }
      });
      var $customOptions = $("#dialog-edit-users-list div");
      var userOptions = $customOptions.map(function (optionIndex, optionElement) {
        return {
          t: $(optionElement).text(),
          v: $(optionElement).attr("data-value"),
          l: $(optionElement).attr("data-locked")
        };
      }).get();
      userOptions.sort(function (userOptionA, userOptionB) {
        if (userOptionA.t.toLowerCase() > userOptionB.t.toLowerCase()) {
          return 1;
        } else if (userOptionA.t.toLowerCase() < userOptionB.t.toLowerCase()) {
          return -1;
        } else {
          return 0;
        }
      });
      $customOptions.each(function (sortedOptionIndex, sortedOptionElement) {
        $(sortedOptionElement).attr("data-value", userOptions[sortedOptionIndex].v);
        $(sortedOptionElement).attr("data-locked", userOptions[sortedOptionIndex].l);
        $(sortedOptionElement).text(userOptions[sortedOptionIndex].t);
      });
      if (isLocked != "false") {
        $("input[type=radio][name=users]").prop("disabled", true);
        if (settings.blocks[blockName].users == "allcustom") {
          $("#dialog-edit-users-add-button").prop("disabled", true);
        }
      } else {
        $("input[type=radio][name=users]").prop("disabled", false);
      }
      $("#dialog-edit-users-list").focus();
    },
    close: function () {
      $("#dialog-edit-users-list").off("keydown");
      $dialogEditUsers.hide();
      $dialogEditUsers.dialog("destroy");
    },
    buttons: {
      "Close without saving": {
        class: "btn-grey-dialog",
        text: "Close without saving",
        click: function () {
          $dialogEditUsers.dialog("close");
        }
      },
      Save: {
        class: "btn-green-dialog",
        text: "Save",
        click: function () {
          var selectedUsers = [];
          var $userDivs = $("#dialog-edit-users-list div");
          $userDivs.each(function (userDivIndex, userDivElement) {
            selectedUsers.push(fromHtml($(userDivElement).attr("data-value")));
          });
          if ($("#edit-users-custom").is(":checked") && selectedUsers.length == 0) {
            var $dialogCustomUsersBlank = $("#dialog-edit-users-custom-empty");
            $dialogCustomUsersBlank.dialog({
              modal: true,
              position: {
                my: "center",
                at: "center",
                of: $(".page-content-wrapper")
              },
              width: "300px",
              draggable: false,
              title: "No Users Selected",
              open: function () {
                var blankMaxZIndex = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == blankMaxZIndex;
                }).off("click").on("click", function () {
                  $dialogCustomUsersBlank.dialog("close");
                });
                $dialogCustomUsersBlank.parent().focus().off("keypress").on("keypress", function (keypressEvent) {
                  if (keypressEvent.which == 13) {
                    $(this).find(".btn-green-dialog").click();
                  }
                });
              },
              close: function () {
                $dialogCustomUsersBlank.dialog("destroy");
                $dialogCustomUsersBlank.hide();
                $("#dialog-edit-users-list").focus();
              },
              buttons: {
                Close: {
                  class: "btn-green-dialog",
                  text: "Close",
                  click: function () {
                    $dialogCustomUsersBlank.dialog("close");
                  }
                }
              }
            });
          } else {
            settings.blocks[blockName].users = $("#edit-users-all").is(":checked") || $("#edit-users-allcustom").is(":checked") && selectedUsers.length == 0 ? "all" : $("#edit-users-allcustom").is(":checked") ? "allcustom" : "custom";
            settings.blocks[blockName].customUsers = selectedUsers;
            $dialogEditUsers.dialog("close");
            updateBlocks(false);
            save();
          }
        }
      }
    }
  }).show();
}
export function showAddUsers() {
  var $dialogAddUsers = $("#dialog-add-users");
  $dialogAddUsers.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "300px",
    draggable: false,
    title: "Add Users",
    open: function () {
      var addUsersMaxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == addUsersMaxZIndex;
      }).off("click").on("click", function () {
        $dialogAddUsers.dialog("close");
      });
      $dialogAddUsers.parent().focus().off("keypress").on("keypress", function (addUsersKeypressEvent) {
        if (addUsersKeypressEvent.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
      var addUsersHtml = "";
      var existingUsers = $("#dialog-edit-users-list div").map(function () {
        return $(this).attr("data-value");
      }).get();
      $.each(settings.additional.users, function (additionalUserIndex, additionalUserName) {
          var disabledAttr = existingUsers.indexOf(additionalUserName.toLowerCase()) >= 0 ? " disabled=\"disabled\"" : "";
          addUsersHtml = addUsersHtml + "<p class=\"dialog-add-users-static-width\"><button class=\"btn-green btn-users-add action-add-user\" type=\"button\" data-username=\"" + toHtml(additionalUserName).replace(/"/g, "&quot;") + "\"" + disabledAttr + "> Add </button> " + toHtml(additionalUserName) + "</p>";
        });
        $("#dialog-add-users-list").html(addUsersHtml);
        $("#dialog-add-users-list").off("click", ".action-add-user").on("click", ".action-add-user", function(e) {
          e.preventDefault();
          addUser($(this).attr("data-username"));
          $(this).attr("disabled", "disabled");
        });
    },
    close: function () {
      $dialogAddUsers.dialog("destroy");
      $dialogAddUsers.hide();
      $("#dialog-edit-users-list").focus();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogAddUsers.dialog("close");
        }
      }
    }
  });
}
export function addUser(newUserName) {
  lastCustomSelectedIndex = null;
  $("#dialog-edit-users-list div").removeClass("selected");
  $("#dialog-edit-users-list").append("<div class=\"custom-option\" onmousedown=\"customSelect(this, event);\" data-locked=\"false\" data-value=\"" + toHtml(newUserName) + "\">" + toHtml(newUserName) + "</div>");
  var $addUserOptions = $("#dialog-edit-users-list div");
  var addUserArray = $addUserOptions.map(function (addUserIndex, addUserElement) {
    return {
      t: $(addUserElement).text(),
      v: $(addUserElement).attr("data-value"),
      l: $(addUserElement).attr("data-locked"),
      c: $(addUserElement).attr("class")
    };
  }).get();
  addUserArray.sort(function (addUserA, addUserB) {
    if (addUserA.t.toLowerCase() > addUserB.t.toLowerCase()) {
      return 1;
    } else if (addUserA.t.toLowerCase() < addUserB.t.toLowerCase()) {
      return -1;
    } else {
      return 0;
    }
  });
  $addUserOptions.each(function (sortedAddUserIndex, sortedAddUserElement) {
    $(sortedAddUserElement).attr("data-value", addUserArray[sortedAddUserIndex].v);
    $(sortedAddUserElement).attr("data-locked", addUserArray[sortedAddUserIndex].l);
    $(sortedAddUserElement).text(addUserArray[sortedAddUserIndex].t);
    $(sortedAddUserElement).attr("class", addUserArray[sortedAddUserIndex].c);
  });
  $("#dialog-edit-users-list div[data-value=\"" + toHtml(newUserName) + "\"]").addClass("selected");
}
export function removeUsers() {
  lastCustomSelectedIndex = null;
  if ($("#dialog-edit-users-list div.custom-option.selected").length > 0) {
    var lockedUsersArr = $("#dialog-edit-users-list div.custom-option.selected").map(function () {
      if (typeof $(this).attr("data-locked") != "undefined" && $(this).attr("data-locked") == "true") {
        return true;
      } else {
        return false;
      }
    }).get();
    if (lockedUsersArr.indexOf(true) != -1) {
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
          var conflictMaxZIndex = getMaxZ($(".ui-widget-overlay"));
          $(".ui-widget-overlay").filter(function () {
            return $(this).css("z-index") == conflictMaxZIndex;
          }).off("click").on("click", function () {
            $dialogBlockErrorExceptionConflict.dialog("close");
          });
          $dialogBlockErrorExceptionConflict.parent().focus().off("keypress").on("keypress", function (conflictKeypressEvent) {
            if (conflictKeypressEvent.which == 13) {
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
    var selectedUserIndex = $("#dialog-edit-users-list div.custom-option.selected").index();
    $("#dialog-edit-users-list").find("div.selected").remove();
    $("#dialog-edit-users-list div").removeClass("selected");
    if (typeof selectedUserIndex != "undefined" && selectedUserIndex < $("#dialog-edit-users-list div.custom-option").length - 1) {
      $("#dialog-edit-users-list div").eq(selectedUserIndex).addClass("selected");
      $("#dialog-edit-users-list div").eq(selectedUserIndex).focus();
    } else {
      $("#dialog-edit-users-list div").last().addClass("selected");
      $("#dialog-edit-users-list div").last().focus();
    }
  }
}



window.editUsers = editUsers;
window.showAddUsers = showAddUsers;
window.addUser = addUser;
window.removeUsers = removeUsers;
