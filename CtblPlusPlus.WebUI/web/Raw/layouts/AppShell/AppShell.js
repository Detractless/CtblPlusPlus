/**
 * @file AppShell.js
 * @layer Layouts
 * @description Application shell DOM manipulations and jQuery extensions.
 */

/**
 * jQuery plugin: briefly hides then shows the element to force a CSS repaint.
 */
$.fn.redraw = function() {
    return this.hide(1, function() {
        $(this).show();
    });
};

/**
 * jQuery plugin: fires a callback after scrolling has stopped for `timeout` ms.
 * @param {Function} callback
 * @param {number} timeout
 */
$.fn.scrollEnd = function(callback, timeout) {
    $(this).scroll(function() {
        var $this = $(this);
        if ($this.data('scrollTimeout')) {
            clearTimeout($this.data('scrollTimeout'));
        }
        $this.data('scrollTimeout', setTimeout(callback, timeout));
    });
};

/**
 * Adjusts the top-left border radius of the page body based on the active tab position.
 * Prevents a visual gap when the first tab is not selected.
 */
export function addRemoveRoundedCornerOnBody() {
    if ($(".page-content .page-title:visible li").index($(".page-content .page-title:visible li.active")) !== 0) {
        $(".page-body").css({ "border-top-left-radius": "5px" });
    } else {
        $(".page-body").css({ "border-top-left-radius": "0px" });
    }
}
