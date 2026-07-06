
import { getMaxZ } from '../Modal/Modal';
import { AppState } from '../../store/AppState';

export function showExtensionHelp() {
  var $dialogExtensionHelp = $("#dialog-extension-help");
  $dialogExtensionHelp.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "500px",
    draggable: false,
    title: "Extension Help",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogExtensionHelp.dialog("close");
      });
      $dialogExtensionHelp.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogExtensionHelp.dialog("destroy");
      $dialogExtensionHelp.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogExtensionHelp.dialog("close");
        }
      }
    }
  }).show();
}
export function showUnblockTabHelp() {
  var $dialogUnblockTabHelp = $("#dialog-unblock-tab-help");
  $dialogUnblockTabHelp.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "475px",
    draggable: false,
    title: "Unblock Help",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogUnblockTabHelp.dialog("close");
      });
      $dialogUnblockTabHelp.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogUnblockTabHelp.dialog("destroy");
      $dialogUnblockTabHelp.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogUnblockTabHelp.dialog("close");
        }
      }
    }
  }).show();
}
export function showNotificationHelp() {
  var $dialogNotificationHelp = $("#dialog-notification-help");
  $dialogNotificationHelp.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "450px",
    draggable: false,
    title: "Notification Help",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogNotificationHelp.dialog("close");
      });
      $dialogNotificationHelp.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogNotificationHelp.dialog("destroy");
      $dialogNotificationHelp.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogNotificationHelp.dialog("close");
        }
      }
    }
  }).show();
}
export function showZoomHelp() {
  var $dialogZoomHelp = $("#dialog-zoom-help");
  $dialogZoomHelp.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "450px",
    draggable: false,
    title: "How To Change the Text Size",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogZoomHelp.dialog("close");
      });
      $dialogZoomHelp.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogZoomHelp.dialog("destroy");
      $dialogZoomHelp.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogZoomHelp.dialog("close");
        }
      }
    }
  }).show();
}
export function showPomodoroHelp() {
  var $dialogNotificationtHelp = $("#dialog-edit-break-pomodoro-help");
  $dialogNotificationtHelp.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Pomodoro Break Help",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogNotificationtHelp.dialog("close");
      });
      $dialogNotificationtHelp.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogNotificationtHelp.dialog("destroy");
      $dialogNotificationtHelp.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogNotificationtHelp.dialog("close");
        }
      }
    }
  }).show();
}
export function showAllowanceHelp() {
  var $dialogNotificationtHelp = $("#dialog-edit-break-allowance-help");
  $dialogNotificationtHelp.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Allowance Break Help",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogNotificationtHelp.dialog("close");
      });
      $dialogNotificationtHelp.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogNotificationtHelp.dialog("destroy");
      $dialogNotificationtHelp.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogNotificationtHelp.dialog("close");
        }
      }
    }
  }).show();
}
export function showRewardHelp() {
  var $dialogNotificationtHelp = $("#dialog-edit-break-reward-help");
  $dialogNotificationtHelp.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Reward Break Help",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogNotificationtHelp.dialog("close");
      });
      $dialogNotificationtHelp.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogNotificationtHelp.dialog("destroy");
      $dialogNotificationtHelp.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogNotificationtHelp.dialog("close");
        }
      }
    }
  }).show();
}
export function showSessionsHelp() {
  var $dialogNotificationtHelp = $("#dialog-edit-break-sessions-help");
  $dialogNotificationtHelp.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Sessions Break Help",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogNotificationtHelp.dialog("close");
      });
      $dialogNotificationtHelp.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogNotificationtHelp.dialog("destroy");
      $dialogNotificationtHelp.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogNotificationtHelp.dialog("close");
        }
      }
    }
  }).show();
}
export function showTimeRangeHelp() {
  var $dialogNotificationtHelp = $("#dialog-edit-lock-time-range-help");
  $dialogNotificationtHelp.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Looking to Schedule a Block Instead?",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogNotificationtHelp.dialog("close");
      });
      $dialogNotificationtHelp.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogNotificationtHelp.dialog("destroy");
      $dialogNotificationtHelp.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogNotificationtHelp.dialog("close");
        }
      }
    }
  }).show();
}
export function showScheduleHelp() {
  var $dialogScheduleLockHelp = $("#dialog-schedule-help");
  $dialogScheduleLockHelp.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Looking to Schedule a Block Instead?",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $dialogScheduleLockHelp.dialog("close");
      });
      $dialogScheduleLockHelp.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $dialogScheduleLockHelp.dialog("destroy");
      $dialogScheduleLockHelp.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $dialogScheduleLockHelp.dialog("close");
        }
      }
    }
  }).show();
}
export function showAutostartWindowHelp() {
  var $AutostartWindowHelp = $("#dialog-edit-autostart-window-help");
  $AutostartWindowHelp.dialog({
    modal: true,
    position: {
      my: "center",
      at: "center",
      of: $(".page-content-wrapper")
    },
    width: "400px",
    draggable: false,
    title: "Time of Day Autostart Help",
    open: function () {
      var maxZIndex = getMaxZ($(".ui-widget-overlay"));
      $(".ui-widget-overlay").filter(function () {
        return $(this).css("z-index") == maxZIndex;
      }).off("click").on("click", function () {
        $AutostartWindowHelp.dialog("close");
      });
      $AutostartWindowHelp.parent().focus().off("keypress").on("keypress", function (event) {
        if (event.which == 13) {
          $(this).find(".btn-green-dialog").click();
        }
      });
    },
    close: function () {
      $AutostartWindowHelp.parent().off("keypress");
      $AutostartWindowHelp.dialog("destroy");
      $AutostartWindowHelp.hide();
    },
    buttons: {
      Close: {
        class: "btn-green-dialog",
        text: "Close",
        click: function () {
          $AutostartWindowHelp.dialog("close");
        }
      }
    }
  }).show();
}

window.showExtensionHelp = showExtensionHelp;
window.showUnblockTabHelp = showUnblockTabHelp;
window.showNotificationHelp = showNotificationHelp;
window.showZoomHelp = showZoomHelp;
window.showPomodoroHelp = showPomodoroHelp;
window.showAllowanceHelp = showAllowanceHelp;
window.showRewardHelp = showRewardHelp;
window.showSessionsHelp = showSessionsHelp;
window.showTimeRangeHelp = showTimeRangeHelp;
window.showScheduleHelp = showScheduleHelp;
window.showAutostartWindowHelp = showAutostartWindowHelp;
