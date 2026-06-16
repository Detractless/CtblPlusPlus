
import { getMaxZ } from '../../components/Modal/Modal';
import { updateBlocks } from '../BlocksPage/BlocksPage';
import { AppState } from '../../store/AppState';
import { makeTitleWithBlockName } from '../../utils/formatString';

export function editListName(blockName) {
  var blockPrefix = "";
  var baseBlockName = blockName;
  if (blockName.indexOf("Frozen Turkey") == 0) {
    blockPrefix = "Frozen Turkey,";
    if (blockName.indexOf("Frozen Turkey,") == 0) {
      baseBlockName = blockName.replace("Frozen Turkey,", "");
    }
  } else if (blockName.indexOf("Focused Turkey,") == 0) {
    blockPrefix = "Focused Turkey,";
    baseBlockName = blockName.replace("Focused Turkey,", "");
  }
  var $dialogRenameBlock = $("#dialog-edit-block-name");
  $dialogRenameBlock.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: makeTitleWithBlockName("Rename '", baseBlockName, "' To...", 400),
    open: function () {
      var maxZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ;
      }).off("click").on("click", function () {
        $dialogRenameBlock.dialog("close");
      });
      $("#dialog-edit-block-name-text").val("").on("keypress", function (event) {
        if (event.which == 13) {
          event.preventDefault();
          $("#dialog-edit-block-name-rename-button").click();
        }
      });
      $("#dialog-edit-block-name-text").val(baseBlockName).focus().select();
    },
    close: function () {
      $("#dialog-edit-block-name-text").off("keypress");
      $dialogRenameBlock.dialog("destroy");
      $dialogRenameBlock.hide();
    },
    buttons: {
      "Close without renaming": {
        class: "btn-grey-dialog",
        text: "Close without renaming",
        click: function () {
          $dialogRenameBlock.dialog("close");
        }
      },
      Rename: {
        class: "btn-green-dialog",
        id: "dialog-edit-block-name-rename-button",
        text: "Rename",
        click: function () {
          var newBlockName = $("#dialog-edit-block-name-text").val().normalizeOnlyHiddenChars();
          if (newBlockName == "" || newBlockName.indexOf("\\") >= 0 || (newBlockName == "Frozen Turkey" || newBlockName.indexOf("Frozen Turkey,") == 0 || newBlockName.indexOf("Focused Turkey,") == 0) && blockPrefix == "") {
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
                var maxZInvalid = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == maxZInvalid;
                }).off("click").on("click", function () {
                  $dialogNameInvalid.dialog("close");
                });
                $dialogNameInvalid.parent().focus().off("keypress").on("keypress", function (eventInvalid) {
                  if (eventInvalid.which == 13) {
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
                var maxZDuplicate = getMaxZ($(".ui-widget-overlay"));
                $(".ui-widget-overlay").filter(function () {
                  return $(this).css("z-index") == maxZDuplicate;
                }).off("click").on("click", function () {
                  $dialogNameDuplicate.dialog("close");
                });
                $dialogNameDuplicate.parent().focus().off("keypress").on("keypress", function (eventDuplicate) {
                  if (eventDuplicate.which == 13) {
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
            $dialogRenameBlock.dialog("close");
            var newBlockData = {
              enabled: settings.blocks[blockName].enabled,
              autostart: settings.blocks[blockName].autostart,
              type: settings.blocks[blockName].type,
              startTime: settings.blocks[blockName].startTime,
              pomodoroTime: settings.blocks[blockName].pomodoroTime,
              timer: settings.blocks[blockName].timer,
              lock: settings.blocks[blockName].lock,
              lockUnblock: settings.blocks[blockName].lockUnblock,
              restartUnblock: settings.blocks[blockName].restartUnblock,
              break: settings.blocks[blockName].break,
              password: settings.blocks[blockName].password,
              randomTextLength: settings.blocks[blockName].randomTextLength,
              window: settings.blocks[blockName].window,
              users: settings.blocks[blockName].users
            };
            newBlockData.web = settings.blocks[blockName].web.slice();
            newBlockData.exceptions = settings.blocks[blockName].exceptions.slice();
            newBlockData.apps = settings.blocks[blockName].apps.slice();
            newBlockData.schedule = settings.blocks[blockName].schedule.slice();
            newBlockData.customUsers = settings.blocks[blockName].customUsers.slice();
            settings.blocks[blockPrefix + newBlockName] = newBlockData;
            delete settings.blocks[blockName];
            updateBlocks(false);
            save();
          }
        }
      }
    }
  }).show();
}
