/**
 * @file BlocksPage.js
 * @layer Pages
 * @description Renders the blocks list. Now relies on utils/blockStateCalculator.js for logic.
 */

import { BlockCard } from '../../components/BlockCard/BlockCard';
import { duplicateList } from '../../components/DuplicateListModal/DuplicateListModal';
import { updateReminders } from '../../components/Reminders/Reminders';
import { requestUnlock } from '../../components/SecurityModal/SecurityModal';
import { editListName } from '../ListNameEditor/ListNameEditor';
import { updateOverview } from '../OverviewPage/OverviewPage';
import { ImportExportService } from '../../services/importExportService';
import { editList } from '../ListEditorPage/ListEditorPage';
import { editFrozenList } from '../../components/FrozenListEditor/FrozenListEditor';
import { importBlocks } from '../ImportBlocks/ImportBlocks';
import { deleteLists } from '../../components/DeleteListModal/DeleteListModal';
import { AppState } from '../../store/AppState';
import { calculateBlockState } from '../../utils/blockStateCalculator';


export function toggleBlocksOrder(event) {
  if (typeof settings.additional.blocksOrder == "undefined" || settings.additional.blocksOrder == "az") {
    settings.additional.blocksOrder = "onoffaz";
  } else {
    settings.additional.blocksOrder = "az";
  }
  updateBlocks(false);
  save();
}

export function updateBlocks(closeDialogs) {
  var currentDate = new Date();
  var normalBlocksHtml = [];
  var frozenBlocksHtml = [];
  
  if (typeof moment !== "undefined") {
    AppState.lastRefreshedMinute = moment().minutes();
  }
  
  if (closeDialogs) {
    if ($("#dialog-edit-block").hasClass("ui-dialog-content")) {
      $("#dialog-edit-block").dialog("close");
    }
    if ($("#dialog-delay").hasClass("ui-dialog-content")) {
      $("#dialog-delay").dialog("close");
    }
  }
  
  $("#blocks-list").empty();
  $("#frozen-block").empty();
  
  if (typeof settings.additional.blocksOrder == "undefined" || settings.additional.blocksOrder == "az") {
    $(".blocks-order-button-az").hide();
    $(".blocks-order-button-onoffaz").show();
  } else if (settings.additional.blocksOrder == "onoffaz") {
    $(".blocks-order-button-onoffaz").hide();
    $(".blocks-order-button-az").show();
  }
  
  $.each(settings.blocks, function (blockName, blockData) {
    var vm = calculateBlockState(blockName, blockData, currentDate, typeof AppState.unlockedBlocks !== 'undefined' ? AppState.unlockedBlocks : []);
    var blockCardHtml = typeof BlockCard === 'function' ? BlockCard(vm) : "";
    
    if (vm.isFrozen) {
      frozenBlocksHtml.push(blockCardHtml);
    } else {
      normalBlocksHtml.push(blockCardHtml);
    }
  });
  
  normalBlocksHtml.sort();
  $.each(normalBlocksHtml, function (arrayIndexNormal, arrayValueNormal) {
    $("#blocks-list").append(arrayValueNormal);
  });
  
  frozenBlocksHtml.sort();
  $.each(frozenBlocksHtml, function (arrayIndexFrozen, arrayValueFrozen) {
    $("#frozen-block").append(arrayValueFrozen);
  });
  
  if (typeof updateReminders === 'function') updateReminders();
  if (typeof updateOverview === 'function') updateOverview();
}

export function blockTabClick(event) {
  event.preventDefault();
  event.stopPropagation();
}

export function exportBlocks(exportType) {
  if (typeof ImportExportService !== "undefined" && typeof ImportExportService.exportBlocks === "function") {
    ImportExportService.exportBlocks(exportType);
  }
}

export function initBlocksPageEvents() {
  var $container = $("#page-blocks-content");
  
  $container.off("click", ".action-request-unlock");
  $container.on("click", ".action-request-unlock", function(e) {
    e.preventDefault();
    var action = $(this).attr("data-unlock-action");
    var blockName = $(this).attr("data-blockname");
    var lockType = $(this).attr("data-locktype");
    var unlockParam = $(this).attr("data-unlock-param") === "true";
    if (typeof requestUnlock === 'function') {
      requestUnlock(action, blockName, lockType, unlockParam);
    }
  });

  $container.off("click", ".action-request-unlock-checkbox");
  $container.on("click", ".action-request-unlock-checkbox", function(e) {
    e.preventDefault();
    var action = $(this).attr("data-unlock-action");
    var blockName = $(this).attr("data-blockname");
    var lockType = $(this).attr("data-locktype");
    var unlockParam = $(this).attr("data-unlock-param") === "true";
    if (typeof requestUnlock === 'function') {
      requestUnlock(action, blockName, lockType, unlockParam);
    }
  });

  $container.off("click", ".action-edit-list-name");
  $container.on("click", ".action-edit-list-name", function(e) {
    e.preventDefault();
    var blockName = $(this).attr("data-blockname");
    if (typeof editListName === 'function') {
      editListName(blockName);
    }
  });

  $container.off("click", ".action-duplicate-list");
  $container.on("click", ".action-duplicate-list", function(e) {
    e.preventDefault();
    var blockName = $(this).attr("data-blockname");
    if (typeof duplicateList === 'function') {
      duplicateList(blockName);
    }
  });

  $container.off("click", ".action-edit-list").on("click", ".action-edit-list", function(e) {
    e.preventDefault();
    if (typeof editList === 'function') {
      editList();
    }
  });

  $container.off("click", ".action-edit-frozen-list").on("click", ".action-edit-frozen-list", function(e) {
    e.preventDefault();
    if (typeof editFrozenList === 'function') {
      editFrozenList();
    }
  });

  $container.off("click", ".action-toggle-blocks-order").on("click", ".action-toggle-blocks-order", function(e) {
    e.preventDefault();
    toggleBlocksOrder($(this).attr("data-order"));
  });

  $container.off("click", ".action-import-blocks").on("click", ".action-import-blocks", function(e) {
    e.preventDefault();
    if (typeof importBlocks === 'function') {
      importBlocks($(this).attr("data-type"));
    }
  });

  $container.off("click", ".action-export-blocks").on("click", ".action-export-blocks", function(e) {
    e.preventDefault();
    if (typeof exportBlocks === 'function') {
      exportBlocks($(this).attr("data-type"));
    }
  });

  $container.off("click", ".action-delete-lists").on("click", ".action-delete-lists", function(e) {
    e.preventDefault();
    if (typeof deleteLists === 'function') {
      deleteLists($(this).attr("data-type"));
    }
  });

}

$(document).ready(function() {
  initBlocksPageEvents();
});
