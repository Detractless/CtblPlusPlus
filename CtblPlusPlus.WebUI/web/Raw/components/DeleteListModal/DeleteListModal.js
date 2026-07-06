/**
 * @file DeleteListModal.js
 * @layer Components
 * @description Renders the Delete List dialog and triggers the deletion service logic.
 */

import { getMaxZ } from '../Modal/Modal';
import { performDeleteLists } from '../../services/blockManager';

export function deleteLists(listType) {
  var blockCategory = listType == "frozen" ? "Device" : listType == "focused" ? "App Whitelist" : "Website & App";
  var $dialogDeleteBlock = $("#dialog-edit-blocks-delete");
  $dialogDeleteBlock.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Delete All Disabled " + blockCategory + " Blocks?",
    create: function () {
      if (listType == "frozen") {
        $(".dialog-edit-blocks-delete-block").hide();
      } else if (listType == "focused") {
      } else {
        $(".dialog-edit-blocks-delete-block").show();
      }
    },
    open: function () {
      var maxZ = typeof getMaxZ !== "undefined" ? getMaxZ($(".ui-widget-overlay")) : 1000;
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ;
      }).off("click").on("click", function () {
        $dialogDeleteBlock.dialog("close");
      });
      $dialogDeleteBlock.parent().focus();
    },
    close: function () {
      $dialogDeleteBlock.dialog("destroy");
      $dialogDeleteBlock.hide();
    },
    buttons: {
      "No, keep blocks": {
        class: "btn-grey-dialog",
        text: "No, keep blocks",
        click: function () {
          $dialogDeleteBlock.dialog("close");
        }
      },
      "Yes, delete them": {
        class: "btn-red-dialog",
        text: "Yes, delete them",
        click: function () {
          $dialogDeleteBlock.dialog("close");
          if (typeof performDeleteLists === 'function') {
            performDeleteLists(listType);
          }
        }
      }
    }
  }).show();
}
