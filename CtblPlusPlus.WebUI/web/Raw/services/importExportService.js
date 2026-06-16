
import { importApplications, exportList } from '../components/BlockModal/BlockModalListActions';
import { exportBlocks } from '../pages/BlocksPage/BlocksPage';

export var ImportExportService = {
  importApplications: function() {
    try {
      return JSON.parse(window.external.ImportApplicationsFromFile());
    } catch (e) {
      console.error("Failed to parse imported applications", e);
      throw e;
    }
  },
  exportList: function(listName, saveTitle, dataStr) {
    if (window.external && typeof window.external.ExportList === 'function') {
      window.external.ExportList(listName, saveTitle, dataStr);
    }
  },
  exportBlocks: function(exportType) {
    var exportedBlocks = {};
    var currentBlocks = JSON.parse(JSON.stringify(settings.blocks));
    $.each(currentBlocks, function (blockName, blockData) {
      if (exportType == "block" && blockName != "Frozen Turkey" && blockName.indexOf("Frozen Turkey,") != 0 && blockName.indexOf("Focused Turkey,") != 0) {
        exportedBlocks[blockName] = blockData;
        if (exportedBlocks[blockName].lock == "password" || exportedBlocks[blockName].lock == "spassword" || exportedBlocks[blockName].lock == "networks") {
          exportedBlocks[blockName].lock = "none";
        }
        exportedBlocks[blockName].password = "";
      } else if (exportType == "frozen" && (blockName == "Frozen Turkey" || blockName.indexOf("Frozen Turkey,") == 0 && blockName.indexOf("Focused Turkey,") != 0)) {
        exportedBlocks[blockName] = blockData;
        if (exportedBlocks[blockName].lock == "password" || exportedBlocks[blockName].lock == "spassword" || exportedBlocks[blockName].lock == "networks") {
          exportedBlocks[blockName].lock = "none";
        }
        exportedBlocks[blockName].password = "";
      }
    });
    window.external.ExportBlocks(JSON.stringify(exportedBlocks));
  }
};
