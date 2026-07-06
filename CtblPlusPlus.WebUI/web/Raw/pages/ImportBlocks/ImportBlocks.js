
import { getMaxZ } from '../../components/Modal/Modal';
import { updateBlocks } from '../BlocksPage/BlocksPage';
import { AppState } from '../../store/AppState';

export function importBlocks(importType) {
  var $dialogBlocksImportWarn = $("#dialog-blocks-import");
  $dialogBlocksImportWarn.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "550px",
    draggable: false,
    title: "A Few Things You Should Know...",
    open: function () {
      var maxOverlayZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxOverlayZ;
      }).off("click").on("click", function () {
        $dialogBlocksImportWarn.dialog("close");
      });
      $dialogBlocksImportWarn.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogBlocksImportWarn.dialog("destroy");
      $dialogBlocksImportWarn.hide();
    },
    buttons: {
      "Cancel import": {
        class: "btn-grey-dialog",
        text: "Cancel import",
        click: function () {
          $dialogBlocksImportWarn.dialog("close");
        }
      },
      "Import...": {
        class: "btn-green-dialog",
        text: "Import...",
        click: function () {
          var importResult = "";
          var importedBlocks = {};
          try {
            importResult = window.external.ImportBlocks();
            if (typeof importResult != "string" || importResult.indexOf("error:") == 0) {
              showImportBlocksInvalid();
              return;
            } else {
              importedBlocks = JSON.parse(importResult);
            }
          } catch (err) {
            showImportBlocksInvalid();
            return;
          }
          $.each(importedBlocks, function (blockName, blockData) {
            if (typeof blockName == "string" && blockName != "") {
              if (importType == "block" && blockName != "Frozen Turkey" && blockName.indexOf("Frozen Turkey,") != 0 && blockName.indexOf("Focused Turkey,") != 0) {
                var newBlockName = "";
                var blockIndex = 2;
                var blockNameFound = false;
                if (typeof settings.blocks[blockName] == "undefined") {
                  newBlockName = blockName;
                } else {
                  while (!blockNameFound) {
                    if (typeof settings.blocks[blockName + " (" + blockIndex.toString() + ")"] == "undefined") {
                      newBlockName = blockName + " (" + blockIndex.toString() + ")";
                      blockNameFound = true;
                    } else {
                      blockIndex++;
                    }
                  }
                }
                var newBlock = {
                  enabled: "false",
                  autostart: "none",
                  type: blockData.type,
                  startTime: "",
                  pomodoroTime: "",
                  timer: ""
                };
                newBlock.lock = settings.settings.password != "" && AppState.passwordStrict.indexOf("lock") >= 0 ? "spassword" : blockData.lock;
                newBlock.lockUnblock = blockData.lockUnblock;
                newBlock.restartUnblock = blockData.restartUnblock;
                newBlock.break = blockData.break;
                newBlock.password = blockData.password;
                newBlock.randomTextLength = blockData.randomTextLength;
                newBlock.window = blockData.window;
                newBlock.users = "all";
                newBlock.web = blockData.web.slice();
                newBlock.exceptions = blockData.exceptions.slice();
                newBlock.apps = [];
                $.each(blockData.apps, function (appIndex, appPath) {
                  if (appPath.indexOf("file:") == 0 && appPath.indexOf("/") > 0) {
                    newBlock.apps.push(appPath);
                  } else if (appPath.indexOf("folder:") == 0 && appPath.indexOf("folder:/") != 0) {
                    newBlock.apps.push(appPath);
                  } else if (appPath.indexOf("win10:") == 0) {
                    newBlock.apps.push(appPath);
                  } else if (appPath.indexOf("title:") == 0) {
                    newBlock.apps.push(appPath);
                  }
                });
                newBlock.schedule = blockData.schedule.slice();
                newBlock.customUsers = [];
                settings.blocks[newBlockName] = newBlock;
              } else if (importType == "frozen" && (blockName == "Frozen Turkey" || blockName.indexOf("Frozen Turkey,") == 0)) {
                var newBlockName = "";
                var blockIndex = 2;
                var blockNameFound = false;
                if (typeof settings.blocks[blockName] == "undefined") {
                  newBlockName = blockName;
                } else if (blockName == "Frozen Turkey") {
                  while (!blockNameFound) {
                    if (typeof settings.blocks["Frozen Turkey," + blockName + " (" + blockIndex.toString() + ")"] == "undefined") {
                      newBlockName = "Frozen Turkey," + blockName + " (" + blockIndex.toString() + ")";
                      blockNameFound = true;
                    } else {
                      blockIndex++;
                    }
                  }
                } else {
                  while (!blockNameFound) {
                    if (typeof settings.blocks[blockName + " (" + blockIndex.toString() + ")"] == "undefined") {
                      newBlockName = blockName + " (" + blockIndex.toString() + ")";
                      blockNameFound = true;
                    } else {
                      blockIndex++;
                    }
                  }
                }
                var newBlock = {
                  enabled: "false",
                  autostart: "none",
                  type: blockData.type,
                  startTime: "",
                  pomodoroTime: "",
                  timer: ""
                };
                newBlock.lock = settings.settings.password != "" && AppState.passwordStrict.indexOf("lock") >= 0 ? "spassword" : blockData.lock;
                newBlock.lockUnblock = blockData.lockUnblock;
                newBlock.restartUnblock = blockData.restartUnblock;
                newBlock.break = blockData.break;
                newBlock.password = blockData.password;
                newBlock.randomTextLength = blockData.randomTextLength;
                newBlock.window = blockData.window;
                newBlock.users = "all";
                newBlock.web = [];
                newBlock.exceptions = [];
                newBlock.apps = blockData.apps.slice();
                if (newBlock.apps.length == 0) {
                  newBlock.apps.push("frozen:lock");
                }
                newBlock.schedule = blockData.schedule.slice();
                newBlock.customUsers = [];
                settings.blocks[newBlockName] = newBlock;
              }
            }
          });
          $dialogBlocksImportWarn.dialog("close");
          updateBlocks(false);
          save();
        }
      }
    }
  }).show();
}
export function showImportBlocksInvalid() {
  var $dialogImportBlocksInvalid = $("#dialog-blocks-import-invalid");
  $dialogImportBlocksInvalid.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "350px",
    draggable: false,
    title: "Invalid File",
    open: function () {
      var maxOverlayZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxOverlayZ;
      }).off("click").on("click", function () {
        $dialogImportBlocksInvalid.dialog("close");
      });
      $dialogImportBlocksInvalid.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogImportBlocksInvalid.dialog("destroy");
      $dialogImportBlocksInvalid.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogImportBlocksInvalid.dialog("close");
        }
      }
    }
  }).show();
}
export function showImportURLsInvalid() {
  var $dialogImportURLsInvalid = $("#dialog-edit-blocks-import-url-invalid");
  $dialogImportURLsInvalid.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "350px",
    draggable: false,
    title: "Invalid File",
    open: function () {
      var maxOverlayZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxOverlayZ;
      }).off("click").on("click", function () {
        $dialogImportURLsInvalid.dialog("close");
      });
      $dialogImportURLsInvalid.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogImportURLsInvalid.dialog("destroy");
      $dialogImportURLsInvalid.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogImportURLsInvalid.dialog("close");
        }
      }
    }
  }).show();
}
export function showImportAppsInvalid() {
  var $dialogImportAppsInvalid = $("#dialog-edit-blocks-import-apps-invalid");
  $dialogImportAppsInvalid.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "350px",
    draggable: false,
    title: "Invalid File",
    open: function () {
      var maxOverlayZ = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxOverlayZ;
      }).off("click").on("click", function () {
        $dialogImportAppsInvalid.dialog("close");
      });
      $dialogImportAppsInvalid.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogImportAppsInvalid.dialog("destroy");
      $dialogImportAppsInvalid.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogImportAppsInvalid.dialog("close");
        }
      }
    }
  }).show();
}
