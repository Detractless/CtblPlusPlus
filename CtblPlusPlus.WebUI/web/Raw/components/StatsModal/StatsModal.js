
import { getMaxZ } from '../Modal/Modal';
import { updateBlocks } from '../../pages/BlocksPage/BlocksPage';
import { updateSettings } from '../../pages/SettingsPage/SettingsPage';
import { makeTitleWithBlockName } from '../../utils/formatString';

export function deleteList(blockName, isEnabled) {
  var baseBlockName = blockName;
  if (blockName.indexOf("Frozen Turkey,") == 0) {
    baseBlockName = blockName.replace("Frozen Turkey,", "");
  } else if (blockName.indexOf("Focused Turkey,") == 0) {
    baseBlockName = blockName.replace("Focused Turkey,", "");
  }
  if (isEnabled == "false") {
    var $dialogDeleteBlock = $("#dialog-edit-block-delete");
    $dialogDeleteBlock.dialog({
      modal: true,
      position: {
        my: "center",
        at: "center",
        of: $(".page-content-wrapper")
      },
      width: "350px",
      draggable: false,
      title: makeTitleWithBlockName("Delete '", baseBlockName, "?'", 350),
      open: function () {
        var maxZ = getMaxZ($(".ui-widget-overlay"));
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
        "No, keep this block": {
          class: "btn-grey-dialog",
          text: "No, keep this block",
          click: function () {
            $dialogDeleteBlock.dialog("close");
          }
        },
        "Yes, delete": {
          class: "btn-red-dialog",
          text: "Yes, delete",
          click: function () {
            delete settings.blocks[blockName];
            $dialogDeleteBlock.dialog("close");
            updateBlocks(false);
            save();
          }
        }
      }
    }).show();
  } else {
    var $dialogDeleteBlockDenied = $("#dialog-edit-block-delete-denied");
    $dialogDeleteBlockDenied.dialog({
      modal: true,
      position: {
        my: "center",
        at: "center",
        of: $(".page-content-wrapper")
      },
      width: "300px",
      draggable: false,
      title: "This Isn't Allowed",
      open: function () {
        var maxZDenied = getMaxZ($(".ui-widget-overlay"));
        $(".ui-widget-overlay").filter(function () {
          return $(this).css("z-index") == maxZDenied;
        }).off("click").on("click", function () {
          $dialogDeleteBlockDenied.dialog("close");
        });
        $dialogDeleteBlockDenied.parent().focus().off("keypress").on("keypress", function (eventDenied) {
          if (eventDenied.which == 13) {
            $(this).find(".btn-green-dialog").click();
          }
        });
      },
      close: function () {
        $dialogDeleteBlockDenied.dialog("destroy");
        $dialogDeleteBlockDenied.hide();
      },
      buttons: {
        Close: {
          class: "btn-green-dialog",
          text: "Close",
          click: function () {
            $dialogDeleteBlockDenied.dialog("close");
          }
        }
      }
    }).show();
  }
}
export function toggleStatisticsFeature(settingKey) {
  var $dialogStatisticsFeatureWarning = $("#dialog-settings-toggle-locked-statistics-warning");
  $dialogStatisticsFeatureWarning.dialog({
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
      var maxZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZ;
      }).off("click").on("click", function () {
        $dialogStatisticsFeatureWarning.dialog("close");
      });
      $dialogStatisticsFeatureWarning.parent().focus();
    },
    close: function () {
      $dialogStatisticsFeatureWarning.dialog("destroy");
      $dialogStatisticsFeatureWarning.hide();
    },
    buttons: {
      "No, don't enable": {
        class: "btn-grey-dialog",
        text: "No, don't enable",
        click: function () {
          $dialogStatisticsFeatureWarning.dialog("close");
        }
      },
      "Yes, enable": {
        class: "btn-green-dialog",
        text: "Yes, enable",
        click: function () {
          $dialogStatisticsFeatureWarning.dialog("close");
          settings.settings[settingKey] = "true";
          updateSettings(true);
          save();
        }
      }
    }
  }).show();
}
