
import { customSelect, lastCustomSelectedIndex } from '../StatsToggle/StatsToggle';
import { getMaxZ } from '../Modal/Modal';
import { toHtml } from '../../utils/formatString';

﻿export function showAddNetworks() {
  var $dialogAddNetworks = $("#dialog-add-networks");
  $dialogAddNetworks.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "300px",
    draggable: false,
    title: "Add Networks",
    open: function () {
      var addNetworksMaxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == addNetworksMaxZIndex;
      }).off("click").on("click", function () {
        $dialogAddNetworks.dialog("close");
      });
      $dialogAddNetworks.parent().focus().off("keypress").on("keypress", function (addNetworksKeypressEvent) {
        if (addNetworksKeypressEvent.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
      var addNetworksHtml = "";
      var allNetworksStr = window.external.GetNetworks();
      var existingNetworks = $("#dialog-edit-networks-list div").map(function () {
        return $(this).attr("data-value");
      }).get();
      $.each(allNetworksStr.split(/\r?\n/), function (networkIndex, networkName) {
        var networkDisabledAttr = existingNetworks.indexOf(networkName) >= 0 ? " disabled=\"disabled\"" : "";
        addNetworksHtml = addNetworksHtml + "<p class=\"dialog-add-networks-static-width\"><button class=\"btn-green btn-networks-add action-add-network\" type=\"button\" data-networkname=\"" + toHtml(networkName).replace(/"/g, "&quot;") + "\"" + networkDisabledAttr + "> Add </button> " + toHtml(networkName) + "</p>";
      });
      $("#dialog-add-networks-list").html(addNetworksHtml);
      $("#dialog-add-networks-list").off("click", ".action-add-network").on("click", ".action-add-network", function(e) {
        e.preventDefault();
        addNetwork($(this).attr("data-networkname"));
        $(this).attr("disabled", "disabled");
      });
    },
    close: function () {
      $dialogAddNetworks.dialog("destroy");
      $dialogAddNetworks.hide();
      $("#edit-networks-list").focus();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogAddNetworks.dialog("close");
        }
      }
    }
  });
}
export function addNetwork(newNetworkName) {
  lastCustomSelectedIndex = null;
  $("#dialog-edit-networks-list div").removeClass("selected");
  $("#dialog-edit-networks-list").append("<div class=\"custom-option\" onmousedown=\"customSelect(this, event);\" data-locked=\"false\" data-value=\"" + toHtml(newNetworkName) + "\">" + toHtml(newNetworkName) + "</div>");
  var $addNetworkOptions = $("#dialog-edit-networks-list div");
  var addNetworkArray = $addNetworkOptions.map(function (addNetworkIndex, addNetworkElement) {
    return {
      t: $(addNetworkElement).text(),
      v: $(addNetworkElement).attr("data-value"),
      l: $(addNetworkElement).attr("data-locked"),
      c: $(addNetworkElement).attr("class")
    };
  }).get();
  addNetworkArray.sort(function (addNetworkA, addNetworkB) {
    if (addNetworkA.t.toLowerCase() > addNetworkB.t.toLowerCase()) {
      return 1;
    } else if (addNetworkA.t.toLowerCase() < addNetworkB.t.toLowerCase()) {
      return -1;
    } else {
      return 0;
    }
  });
  $addNetworkOptions.each(function (sortedAddNetworkIndex, sortedAddNetworkElement) {
    $(sortedAddNetworkElement).attr("data-value", addNetworkArray[sortedAddNetworkIndex].v);
    $(sortedAddNetworkElement).attr("data-locked", addNetworkArray[sortedAddNetworkIndex].l);
    $(sortedAddNetworkElement).text(addNetworkArray[sortedAddNetworkIndex].t);
    $(sortedAddNetworkElement).attr("class", addNetworkArray[sortedAddNetworkIndex].c);
  });
  $("#dialog-edit-networks-list div[data-value=\"" + toHtml(newNetworkName) + "\"]").addClass("selected");
}
export function removeNetworks() {
  lastCustomSelectedIndex = null;
  if ($("#dialog-edit-networks-list div.custom-option.selected").length > 0) {
    var lockedNetworksArr = $("#dialog-edit-networks-list div.custom-option.selected").map(function () {
      if (typeof $(this).attr("data-locked") != "undefined" && $(this).attr("data-locked") == "true") {
        return true;
      } else {
        return false;
      }
    }).get();
    if (lockedNetworksArr.indexOf(true) != -1) {
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
          var networkConflictMaxZIndex = getMaxZ($(".ui-widget-overlay"));
          $(".ui-widget-overlay").filter(function () {
            return $(this).css("z-index") == networkConflictMaxZIndex;
          }).off("click").on("click", function () {
            $dialogBlockErrorExceptionConflict.dialog("close");
          });
          $dialogBlockErrorExceptionConflict.parent().focus().off("keypress").on("keypress", function (networkConflictKeypressEvent) {
            if (networkConflictKeypressEvent.which == 13) {
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
    var selectedNetworkIndex = $("#dialog-edit-networks-list div.custom-option.selected").index();
    $("#dialog-edit-networks-list").find("div.selected").remove();
    $("#dialog-edit-networks-list div").removeClass("selected");
    if (typeof selectedNetworkIndex != "undefined" && selectedNetworkIndex < $("#dialog-edit-networks-list div.custom-option").length - 1) {
      $("#dialog-edit-networks-list div").eq(selectedNetworkIndex).addClass("selected");
      $("#dialog-edit-networks-list div").eq(selectedNetworkIndex).focus();
    } else {
      $("#dialog-edit-networks-list div").last().addClass("selected");
      $("#dialog-edit-networks-list div").last().focus();
    }
  }
}

window.addNetwork = addNetwork;
window.removeNetworks = removeNetworks;
