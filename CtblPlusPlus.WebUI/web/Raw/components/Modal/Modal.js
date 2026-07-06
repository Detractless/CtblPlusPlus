export function getMaxZ(selector) {
  return Math.max.apply(null, $(selector).map(function () {
    var zIndex;
    if (isNaN(zIndex = parseInt($(this).css("z-index"), 10))) {
      return 0;
    } else {
      return zIndex;
    }
  }));
}

export function showErrorDialog(selector, title, onOpenCallback, onCreateCallback) {
  var $dialog = $(selector);
  var config = {
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "300px",
    draggable: false,
    title: title,
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialog.dialog("close");
      });
      $dialog.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
      if (onOpenCallback) onOpenCallback();
    },
    close: function () {
      $dialog.hide();
      $dialog.dialog("destroy");
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialog.dialog("close");
        }
      }
    }
  };
  if (onCreateCallback) {
    config.create = onCreateCallback;
  }
  $dialog.dialog(config).show();
}

