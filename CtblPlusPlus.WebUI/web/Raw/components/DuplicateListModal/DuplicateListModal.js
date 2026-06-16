/**
 * @file DuplicateListModal.js
 * @layer Components
 * @description Renders the Duplicate List dialog and triggers the duplication service logic.
 */

import { getMaxZ } from '../Modal/Modal';
import { performDuplicateList } from '../../services/blockManager';
import { makeTitleWithBlockName } from '../../utils/formatString';

export function duplicateList(blockName) {
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
  
  var $dialogDuplicateName = $("#dialog-edit-block-name");
  $dialogDuplicateName.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: typeof makeTitleWithBlockName !== "undefined" ? makeTitleWithBlockName("Duplicate '", baseBlockName, "' As...", 400) : "Duplicate List",
    open: function () {
      var maxZ = typeof getMaxZ !== "undefined" ? getMaxZ($(".ui-widget-overlay")) : 1000;
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ;
      }).off("click").on("click", function () {
        $dialogDuplicateName.dialog("close");
      });
      $("#dialog-edit-block-name-text").val("").on("keypress", function (event) {
        if (event.which == 13) {
          event.preventDefault();
          $("#dialog-edit-block-name-duplicate-button").click();
        }
      });
      $("#dialog-edit-block-name-text").val(baseBlockName).focus().select();
    },
    close: function () {
      $("#dialog-edit-block-name-text").off("keypress");
      $dialogDuplicateName.dialog("destroy");
      $dialogDuplicateName.hide();
    },
    buttons: {
      "Close without duplicating": {
        class: "btn-grey-dialog",
        text: "Close without duplicating",
        click: function () {
          $dialogDuplicateName.dialog("close");
        }
      },
      Duplicate: {
        class: "btn-green-dialog",
        id: "dialog-edit-block-name-duplicate-button",
        text: "Duplicate",
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
                var maxZInvalid = typeof getMaxZ !== "undefined" ? getMaxZ($(".ui-widget-overlay")) : 1000;
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
                var maxZDuplicate = typeof getMaxZ !== "undefined" ? getMaxZ($(".ui-widget-overlay")) : 1000;
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
            $dialogDuplicateName.dialog("close");
            if (typeof performDuplicateList === 'function') {
              performDuplicateList(blockName, newBlockName, blockPrefix);
            }
          }
        }
      }
    }
  }).show();
}
