/*!
 * jQuery Timespace Plugin
 * Author: Michael S. Howard
 * Email: codingadvent@gmail.com
 * License: MIT
 */

/*global jQuery*/
'use strict';
/**
 * jQuery Timespace Plugin
 * Important: This Plugin uses features that are not supported by any Internet Explorer version.
 * @author Michael S. Howard
 * @requires jQuery 1.7+
 * @param $ The jQuery object
 * @param global The global Window object
 * @return void
 */

function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

if (typeof Object.assign != 'function') {
  Object.assign = function(target) {
    'use strict';
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    target = Object(target);
    for (var index = 1; index < arguments.length; index++) {
      var source = arguments[index];
      if (source != null) {
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
    }
    return target;
  };
}

(function ($, global) {
  // When in debug mode, errHandler will throw the Error
  var debug = false;
  /**
   * The Time Event Object Type
   * @typedef {Object} TimeEvent
   * @property {number} start The start time for the event
   * @property {number?} end The optional end time for the event
   * @property {string} title The text for the event title
   * @property {string?|jQuery} description The optional text or jQuery Object for the event description
   * @property {number?} width The optional width for the event <p> element
   * @property {bool} noDetails If the time event should not have a display
  	(If noDetails and a description string exists, it will be used for the event's title attribute)
   * @property {string} class The optional CSS class to use for the event's <p> element
   * @property {Function?} callback The optional callback to run on event selection
  	The callback Cannot be an arrow function if calling any API methods within the callback
   */

  /**
   * The Time Heading Object Type
   * @typedef {Object} TimeHeading
   * @property {number} start The start time for the heading
   * @property {number} end The end time for the heading / Optional only for the last heading
   * @property {string} title The text for the heading
   */

  /**
   * The Data Object Type
   * @typedef {Object} Data
   * @property {TimeHeading[]} headings The array of heading objects
   * @property {TimeEvent[]]} events The array of event objects
   */

  /**
   * The ControlText Object Type
   * @typedef {Object} ControlText
   * @property {string} navLeft The title text for the left navigation arrow
   * @property {string} navRight The title text for the right navigation arrow
   * @property {string} drag The title text for the time table
   * @property {string} eventLeft The title text for the display box previous event arrow
   * @property {string} eventRight The title text for the display box next event arrow
   */

  /**
  * The Default Options Object Type
  * @typedef {Object} Defaults
  * @property {Data|string|null} data The data to use for the Timespace instance, or a URL for loading the data object with jQuery.get()
  * @property {number} startTime The starting time of the time table
  * @property {number} endTime The ending time of the time table
  * @property {number} markerAmount The amount of time markers to use (0 to calculate from startTime, endTime, and markerIncrement)
  * @property {number} markerIncrement The amount of time each marker spans
  * @property {number} markerWidth The width of each time marker td element (0 to calculate from maxWidth and markerAmount)
  * @property {number} maxWidth The maximum width for the time table container
  * @property {number} maxHeight The maximum height for the time table container
  * @property {number} navigateAmount The amount of pixels to move the time table on navigation (0 to disable)
  * @property {number} dragXMultiplier The multiplier to use with navigateAmount when dragging the time table horizontally
  * @property {number} dragYMultiplier The multiplier to use with navigateAmount when dragging the time table vertically
  * @property {number} selectedEvent The index number of the event to start on (0 for first event, -1 to disable)
  * @property {bool} shiftOnEventSelect If the time table should shift when an event is selected
  * @property {bool} scrollToDisplayBox If the window should scroll to the display box on event selection
  	(only applies if the time table height is greater than the window height, and if the event has a description)
  * @property {Object} customEventDisplay The jQuery Object of the element to use for the display box
  * @property {string} timeType Use 'hour' or 'date' for the type of time being used
  * @property {bool} use12HourTime If using 12-Hour time (e.g. '2:00 PM' instead of '14:00')
  * @property {bool} useTimeSuffix If a suffix should be added to the displayed time (e.g. '12 AM' or '300 AD')
  	No time suffix is used if timeType is hour and use12HourTime is false
  * @property {Function} timeSuffixFunction A function that receives the lowercase suffix string and returns a formatted string
  * @property {ControlText} controlText The object of title texts for the various control elements
  */

  var defaults = {
    data: null,
    startTime: 0,
    endTime: 24,
    markerAmount: 0,
    markerIncrement: 1,
    markerWidth: 120,
    maxWidth: 'none',
    maxHeight: 'none',
    navigateAmount: 360,
    dragXMultiplier: 1,
    dragYMultiplier: 1,
    selectedEvent: -1,
    shiftOnEventSelect: false,
    scrollToDisplayBox: false,
    customEventDisplay: null,
    timeType: 'hour',
    use12HourTime: true,
    useTimeSuffix: true,
    timeSuffixFunction: function timeSuffixFunction(s) {
      return ' ' + s[0] + s[1];
    },
    controlText: {
      navLeft: 'Move Left',
      navRight: 'Move Right',
      drag: 'Drag',
      eventLeft: 'Previous Event',
      eventRight: 'Next Event'
    }
  };
  /** The error constants for error handling */

  var errors = {
    NULL: {
      code: '',
      msg: ''
    },
    OPTS: {
      code: '001',
      msg: 'Invalid options argument supplied to the jQuery Timespace Plugin.'
    },
    CALLBACK: {
      code: '002',
      msg: 'Invalid callback function supplied to the jQuery Timespace Plugin.'
    },
    DATA_ERR: {
      code: '003',
      msg: 'Failure to load the Timespace data URL.'
    },
    INV_INSTANCE: {
      code: '002',
      msg: 'The Timespace Plugin instance is invalid.'
    },
    INV_EVENT_CB: {
      code: '010',
      msg: 'Invalid callback supplied for event in data argument.'
    },
    INV_HEADING_START: {
      code: '011',
      msg: 'A heading\'s start time is less than the Timespace start time.'
    },
    INV_HEADING_END: {
      code: '012',
      msg: 'A heading\'s end time is greater than the Timespace end time.'
    },
    EVENT_OOR: {
      code: '013',
      msg: 'An event\'s start time is outside of the Timespace start and end time range.'
    }
  };
  /**
   * The error handler for the Plugin
   * @param {Error} err The Error object (used for line number where error occurred)
   * @param {string} name The error name in the errors constant
   * @param {Object} target The jQuery object to display the error
   * @throws {Error} Only in debug mode
   * @return void
   */

  var errHandler = function errHandler(err, name, target) {
    target = !target ? $('body') : target;
    var e = errors.hasOwnProperty(name) ? errors[name] : errors.NULL,
        msg = 'An error has occurred. ' + e.code + ': ' + e.msg;
    var errElem = $("<p class=\"jqTimespaceError\">".concat(msg, "</p>")),
        errExists = target ? target.find('.jqTimespaceError').length > 0 : false;

    if (debug) {
      throw err;
    } else {
      if (errExists) {
        target.find('.jqTimespaceError').text(msg);
      } else {
        target.prepend(errElem);
      }
    }
  };

  var classes = {
    animated: 'jqTimespaceAnimated',
    column: 'jqTimespaceColumn',
    dummySpan: 'jqTimespaceDummySpan',
    event: 'jqTimespaceEvent',
    eventBorder: 'jqTimespaceEventBorder',
    eventRev: 'jqTimespaceEventRev',
    eventSelected: 'jqTimespaceEventSelected',
    heading: 'jqTimespaceHeading',
    noDisplay: 'jqTimespaceNoDisplay',
    shifting: 'jqTimespaceShifting',
    timeframe: 'jqTimespaceTimeframe'
  };
  var inst = [],
      Timespace = null,
      API = null,
      APILoader = null,
      utility = null;
  /**
   * jQuery Timespace Plugin Method
   * @param {Defaults} options The Plugin options
      * @param {Function} callback A callback function to execute on completion
  	If using URL for plugin data and it fails to load, the callback will receive the jqxhr object.
   * @return {Object} The jQuery object used to call this method
   */

  $.fn.timespace = function (options, callback) {
    if ($.isFunction(options)) {
      callback = options;
      options = {};
    }

    if (options && !$.isPlainObject(options)) {
      errHandler(new Error(errors.OPTS.msg), 'OPTS', $(this[0]));
      return this;
    }

    if (callback && !$.isFunction(callback)) {
      errHandler(new Error(errors.CALLBACK.msg), 'CALLBACK', $(this[0]));
      callback = $.noop;
    } // Create the instance


    $.data(this, 'Timespace', Object.create(Timespace));

    if (typeof options.data === 'string') {
      // Use Async loader for URL data
      inst.push($.data(this, 'Timespace').loadAsync(this, options, callback || $.noop));
    } else {
      // Store and load the instance, and run the callback
      inst.push($.data(this, 'Timespace').load(this, options));

      if (callback) {
        callback.call(inst[inst.length - 1]['API']);
      }
    }

    return this;
  };
  /***************************/

  /* Timespace Plugin Object */

  /***************************/

  /*
   * DO NOT INITIATE VALUES WITH OBJECTS OR ARRAYS,
   * OR THEY WILL BE SHARED BY INSTANCES
   */


  Timespace = {
    options: null,
    data: null,
    API: null,
    // Calculations
    totalTime: 0,
    markers: null,
    shiftXEnabled: true,
    shiftYEnabled: true,
    shiftPosX: null,
    shiftPosY: null,
    shiftDirX: '=',
    shiftDirY: '=',
    shiftDiffX: 0,
    shiftDiffY: 0,
    lastMousePosX: 0,
    lastMousePosY: 0,
    navInterval: null,
    transition: -1,
    transitionEase: null,
    viewData: null,
    // Elements
    container: '<div class="jqTimepsaceContainer"></div>',
    error: '<div class="jqTimespaceErrors"></div>',
    titleClamp: '<div class="jqTimespaceTitleClamp"></div>',
    timeTableLine: '<div class="jqTimespaceLine"></div>',
    /*navLeft: '<div class="jqTimespaceLeft">&lt;</div>',  -- removed for Cold Turkey
    navRight: '<div class="jqTimespaceRight">&gt;</div>',*/
    dataContainer: '<div class="jqTimespaceDataContainer"></div>',
    timeTable: '<aside></aside>',
    timeTableHead: '<header></header>',
    timeTableBody: '<section></section>',
    display: '<article class="jqTimespaceDisplay"></article>',
    displayWrapper: '<div></div>',
    displayTitle: '<h1></h1>',
    displayTimeDiv: '<div class="jqTimespaceDisplayTime"></div>',
    displayTime: '<time></time>',
    displayBody: '<section></section>',
    displayLeft: '<div class="jqTimespaceDisplayLeft">&lt;</div>',
    displayRight: '<div class="jqTimespaceDisplayRight">&gt;</div>',
    displayObserver: null,
    timeMarkers: null,
    timeEvents: null,
    wideHeadings: null,
    curWideHeading: null,
    curEvent: null,

    /**
     * The main method to load the Plugin with async data
     * @param {Object} target The jQuery Object that the plugin was called on
     * @param {Object} options The user-defined options
     * @param {Function} callback The callback to run when loaded
     * @return {Object} The Plugin instance
     */
    loadAsync: function loadAsync(target, options, callback) {
      var id = inst.length;
      $.get(options.data, function (data) {
        options.data = data;
        this.load(target, options, id);
        callback.call(this.API);
      }).fail(function (err) {
        errHandler(new Error(err.status + ': ' + err.statusText + '. ' + errors.DATA_ERR.msg), 'DATA_ERR');
        callback.call(this.API, err);
      });
      return this;
    },

    /**
     * The main method to load the Plugin
     * @param {Object} target The jQuery Object that the plugin was called on
     * @param {Object} options The user-defined options
     * @param {Number?} id The optional instance id
     * @return {Object} The Plugin instance
     */
    load: function load(target, options, id) {
      var opts = {};
	    var currentTimeOffset = moment().diff(moment().startOf('day'), 'minutes') * 2; /* CT Change : added for Cold Turkey*/
      this.API = new APILoader(!utility.isEmpty(id) ? id : inst.length);
      this.options = Object.assign(opts, defaults, options);
      this.data = opts.data || {};
      this.totalTime = opts.endTime - opts.startTime || 1;
      this.navInterval = {
        dir: 'left',
        timer: null,
        engaged: false
      }; // Setup Base Elements

      this.container = $(this.container).appendTo(target).on('resize.jqTimespace', this.updateDynamicData.bind(this));
      this.error = $(this.error).appendTo(this.container);
      this.dataContainer = $(this.dataContainer).css({
        maxWidth: opts.maxWidth,
        maxHeight: opts.maxHeight
      }).appendTo(this.container);
      /*this.navLeft = $(this.navLeft).attr('title', opts.controlText.navLeft).appendTo(this.dataContainer); -- removed for Cold Turkey
      this.navRight = $(this.navRight).attr('title', opts.controlText.navRight).appendTo(this.dataContainer);*/
      this.titleClamp = $(this.titleClamp).appendTo(this.dataContainer); // Values are updated once elements are built

      this.viewData = {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        heightOverhang: 0,
        halfX: 0,
        halfY: 0,
        offsetX: 0,
        offsetY: 0,
        tableWidth: 0,
        tableOffsetX: 0,
        tableOffsetY: 0,
        shiftOriginX: 0,
        shiftOriginY: 0
      };
      this.calculateMarkers().buildTimeTable().buildTimeEvents().buildTimeDisplay().updateStaticData().updateDynamicData().setDOMEvents();
      this.display.hide();
      this.navigate([-currentTimeOffset + 120, top - (this.viewData.offsetY - this.viewData.halfY)], -1, null, true);
      return this;
    },

    /**
     * Calculate the amount and width needed for time markers
     * @return {Object} The Plugin instance
     */
    calculateMarkers: function calculateMarkers() {
      var opts = this.options;

      if (opts.markerAmount === 0) {
        opts.markerAmount = Math.floor(this.totalTime / opts.markerIncrement) || 0;
      }

      if (opts.markerWidth === 0) {
        opts.markerWidth = Math.floor(opts.maxWidth / opts.markerAmount) || 100;
      }

      return this;
    },

    /**
     * Build the time table
     * @return {Object} The Plugin instance
     */
    buildTimeTable: function buildTimeTable() {
      var opts = this.options; // Time table width is used to force marker widths

      this.viewData.tableWidth = opts.markerAmount * opts.markerWidth || 'auto';
      this.timeTable = $(this.timeTable).width(this.viewData.tableWidth).appendTo(this.dataContainer);
      this.timeTableHead = $(this.timeTableHead).attr('title', opts.controlText.drag).appendTo(this.timeTable);
      this.timeTableBody = $(this.timeTableBody).attr('title', opts.controlText.drag).appendTo(this.timeTable);
      this.timeTableLine = $(this.timeTableLine).attr('title', opts.controlText.drag).appendTo(this.timeTableBody);
      this.buildTimeHeadings().buildTimeMarkers();
      this.viewData.width = Math.ceil(this.dataContainer.innerWidth() || 0);
      var containerOffset = this.dataContainer.offset();
      this.viewData.left = Math.ceil(containerOffset ? containerOffset.left : 0);
      return this;
    },

    /**
     * Build the heading titles for the time markers
     * @return {Object} The Plugin instance
     */
    buildTimeHeadings: function buildTimeHeadings() {
      var opts = this.options;
      var h1 = "<h1><span class=\"".concat(classes.heading, "\"></span></h1>"),
          dummy = "<div class=\"".concat(classes.dummySpan, "\"></div>"),
          headings = $('<div></div>'),
          curSpan = 0;
      this.wideHeadings = $();

      if (this.data.headings) {
        this.data.headings.forEach(function (v, i, a) {
          var start = parseFloat(v.start),
              title = utility.sanitize(v.title);
          var end = utility.isEmpty(v.end) ? null : parseFloat(v.end); // Check for timeline start and heading start error

          if (opts.startTime > start) {
            errHandler(new Error(errors.INV_HEADING_START.msg), 'INV_HEADING_START', this.error);
          } // Create dummy span before first heading if needed


          if (i === 0 && utility.compareTime(start, opts.startTime, opts.markerIncrement) === 1) {
            curSpan = utility.getTimeSpan(start, opts.startTime, opts.markerIncrement, opts.markerWidth);
            headings.append($(dummy).width(curSpan));
          } // Create dummy span to cover time in between headings if needed


          if (i > 0 && utility.compareTime(start, a[i - 1]['end'], opts.markerIncrement) === 1) {
            curSpan = utility.getTimeSpan(start, a[i - 1]['end'], opts.markerIncrement, opts.markerWidth);
            headings.append($(dummy).width(curSpan));
          } // Check heading end time


          if (utility.isEmpty(end)) {
            end = opts.endTime;
          } else if (end > opts.endTime) {
            errHandler(new Error(errors.INV_HEADING_END.msg), 'INV_HEADING_END', this.error);
            end = opts.endTime;
          } // Add current heading


          curSpan = utility.getTimeSpan(start, end, opts.markerIncrement, opts.markerWidth) || 0;
          headings.append($(h1).children('span').text(title).end().width(curSpan)); // Check if heading needs a title clamp
          
          if (curSpan > opts.maxWidth * 1.75) {
            this.wideHeadings = this.wideHeadings.add(headings.children().last().data({
              span: curSpan,
              textSpan: 0 // Updated after headings are appended to table

            }));
          } // Create dummy span to cover ending if needed


          if (i === a.length - 1 && utility.compareTime(end, opts.endTime, opts.markerIncrement) === -1) {
            // Create ending dummy span
            curSpan = utility.getTimeSpan(end, opts.endTime, opts.markerIncrement, opts.markerWidth);
            headings.append($(dummy).width(curSpan));
          }
        });
      }

      if (headings.length > 0) {
        headings.appendTo(this.timeTableHead);
        this.titleClamp.css('top', headings.innerHeight() / 2);
      } // Update heading text widths for any wide headings


      this.wideHeadings.each(function (i, elem) {
        $(elem).data('textSpan', $(elem).children('span').outerWidth());
      });
      return this;
    },

    /**
     * Build the time markers
     * @return {Object} The Plugin instance
     */
    buildTimeMarkers: function buildTimeMarkers() {
      var opts = this.options;
      var curTime = opts.startTime,
          markers = $('<div></div>');
      this.markers = []; // The header time markers

      this.timeMarkers = $(); // The section divs that hold the event boxes
      // Iterate and build time markers using increment

      for (var i = 0; i < opts.markerAmount; i += 1) {
        curTime = i === 0 ? opts.startTime : curTime + opts.markerIncrement;
        this.markers.push(curTime);
        this.timeMarkers = this.timeMarkers.add($("<div class=\"".concat(classes.column, "\"></div>")).width(opts.markerWidth));
        markers.append($("<time>".concat(this.getDisplayTime(curTime), "</time>")).width(opts.markerWidth));
      }

      markers.appendTo(this.timeTableHead);
      this.timeMarkers.appendTo(this.timeTableBody);
      return this;
    },

    /**
     * Build the time table events
     * @return {Object} The Plugin instance
     */
    buildTimeEvents: function buildTimeEvents() {
      var _this = this;

      var opts = this.options,
          markers = this.markers,
          events = $(),
          rowData = {
        rows: [],
        curRow: 0,
        marginOrigin: 0,
        marginTop: 0,
        event: null,
        eventElem: null
      };

      if (this.data.events) {
        this.data.events.forEach(function (v, i) {
          var start = parseFloat(v.start) || null,
              end = parseFloat(v.end) || null,
              /*title = utility.sanitize(v.title), removed for Cold Turkey */
              title = v.title, /* added for Cold Turkey */
              description = v.description, /*_instanceof(v.description, $) ? v.description : !utility.isEmpty(v.description) ? $("<p>".concat(utility.sanitize(v.description), "</p>")) : $(),*/
              width = parseInt(v.width),
              noDetails = !!v.noDetails,
              evtClass = !utility.isEmpty(v.class) ? " class=\"".concat(utility.sanitize(v.class), "\"") : '',
              eventCallback = utility.isEmpty(v.callback) ? $.noop : v.callback.bind(_this.API);
          rowData.event = $("<div class=\"".concat(classes.event, "\"></div>"));
          rowData.eventElem = $("<p".concat(evtClass, "><span>").concat(title, "</span></p>")).prependTo(rowData.event);
          var rounded = utility.roundToIncrement('floor', opts.markerIncrement, start),
              index = markers.indexOf(rounded),
              eventElemSpan = rowData.eventElem.children('span');

          if (!$.isFunction(eventCallback)) {
            errHandler(new Error(errors.INV_EVENT_CB.msg), 'INV_EVENT_CB', _this.error);
            rowData.eventElem.data('eventCallback', $.noop);
          }

          if (start < opts.startTime || start > opts.endTime) {
            errHandler(new Error(errors.EVENT_OOR.msg), 'EVENT_OOR', _this.error);
          }

          var pos = 0,
              eventOffset = 0,
              eventOverhang = false,
              eventWidth = 0,
              eventElemWidth = 0,
              eventElemSpanWidth = 0;

          if (index >= 0) {
            // Find the position based on percentage of starting point to the increment amount
            pos = (start - markers[index]) / opts.markerIncrement * opts.markerWidth;
            rowData.event.css('left', pos).appendTo(_this.timeMarkers[index]);
            eventOffset = Math.floor(rowData.event.offset().left); // Immediately invoke arrow function to return best width

            eventElemWidth = function () {
              var endWidth = end ? (end - start) / opts.markerIncrement * opts.markerWidth : 0;

              var styles = [parseFloat(rowData.eventElem.css('borderLeftWidth')) || 0, parseFloat(rowData.eventElem.css('borderRightWidth')) || 0, parseFloat(rowData.eventElem.css('paddingLeft')) || 0, parseFloat(rowData.eventElem.css('paddingRight')) || 0],
                  extra = styles.reduce(function (t, v) {
                return t + v;
              }),
                  // Add all style values
              tableLength = _this.viewData.tableWidth + _this.getTablePosition(true),
                  result = opts.markerWidth - extra;

              eventElemSpanWidth = eventElemSpan.width();
              eventOverhang = tableLength < eventOffset + eventElemSpanWidth + extra;

              /*if (eventOverhang) {
                result = eventElemSpanWidth; // Text width
              } else if (width) {
                result = width - extra; // User-defined width
              } else if (eventElemSpanWidth > endWidth - extra && eventElemSpanWidth > result) {
                result = eventElemSpanWidth; // Text width
              } else if (endWidth - extra > result) {*/
                result = endWidth - extra; // Timespan width
              /*}*/

              return result;
            }();

            rowData.eventElem.width(eventElemWidth).data({
              time: _this.getFullDate(start, end),
              title: title,
              description: description,
              noDetails: noDetails,
              eventCallback: eventCallback
            }).attr('title', rowData.eventElem.data('description'));
            events = events.add(rowData.eventElem);
            eventWidth = rowData.eventElem.outerWidth();
            rowData.event.width(eventWidth); // Prevent display for noDetails, and use description on event title

            if (noDetails) {
              rowData.event.addClass(classes.noDisplay);
              rowData.eventElem.attr('title', function (i, t) {
                return !utility.isEmpty(description.text()) ? "".concat(t, " - ").concat(description.text()) : t;
              });
            } else {
              $("<div class=\"".concat(classes.eventBorder, "\"\n\t\t\t\t\t\t\t\tstyle=\"left:").concat(eventOffset - _this.viewData.left - 1, "px;\"></div>")).appendTo(_this.timeMarkers[index]);
            } // Reverse event if it extends past the time table width


            /*if (eventOverhang) {
              rowData.event.css('left', pos - eventWidth).addClass(classes.eventRev);
              eventOffset = Math.floor(rowData.event.offset().left);
              rowData.event.next('.' + classes.eventBorder).css('left', eventOffset - _this.viewData.left + eventWidth - 1);
            }*/

            _this.updateEventOverlap(i, rowData, eventOffset); // Change offset to start at table offset in case of window resize


            eventOffset -= _this.viewData.left + 25; // Update event's span position if the event width extends the container viewport

            if (eventElemWidth > _this.viewData.width) {
              _this.container.on('shiftX.jqTimespace', function () {
                _this.updateWideEvent(eventOffset, eventElemWidth, eventElemSpan, eventElemSpanWidth);
              });
            }
          }
        });
      }

      /*if (events.length <= 1) {
        this.displayLeft.add(this.displayRight).hide();
      }*/

      this.timeEvents = events;
      return this;
    },

    /**
     * Build the time display
     * @return {Object} The Plugin instance
     */
    buildTimeDisplay: function buildTimeDisplay() {
      var opts = this.options;
      this.display = opts.customEventDisplay ? $(this.display).appendTo($(opts.customEventDisplay)) : $(this.display).appendTo(this.container).css('maxWidth', opts.maxWidth);
      this.displayWrapper = $(this.displayWrapper).appendTo(this.display);
      this.displayTitle = $(this.displayTitle).appendTo(this.displayWrapper);
      this.displayTimeDiv = $(this.displayTimeDiv).appendTo(this.displayWrapper);
      this.displayLeft = $(this.displayLeft).attr('title', opts.controlText.eventLeft).appendTo(this.displayTimeDiv);
      this.displayTime = $(this.displayTime).appendTo(this.displayTimeDiv);
      this.displayRight = $(this.displayRight).attr('title', opts.controlText.eventRight).appendTo(this.displayTimeDiv);
      this.displayBody = $(this.displayBody).appendTo(this.displayWrapper);
      this.displayObserver = new MutationObserver(this.updateDisplayHeight.bind(this)).observe(this.displayWrapper[0], {
        childList: true,
        subtree: true
      });
      this.updateDisplayHeight();
      return this;
    },

    /**
     * Set up the element DOM events
     * @return {Object} The Plugin instance
     */
    setDOMEvents: function setDOMEvents() {
      var _this2 = this;

      var ts = this; // Window Events

      $(global).on('mouseup touchend', function () {
        $(global).off('mousemove.jqTimespace touchmove.jqTimespace'); // Clear nav button interval if needed

        _this2.clearNavInterval(); // Run timeShift once more on completion and animate movement


        if (_this2.timeTable.hasClass(classes.shifting)) {
          _this2.setTimeShiftState(false);

          _this2.timeShift(null, null, true, true);
        }
      }).on('resize', function () {
        _this2.container.trigger('resize.jqTimespace');
      }); // Navigation Events

      /*this.navLeft.on('mousedown', function () { -- removed for Cold Turkey
        if (_this2.options.navigateAmount > 0) {
          _this2.updateDynamicData().setNavInterval('left');
        }
      });
      this.navRight.on('mousedown', function () {
        if (_this2.options.navigateAmount > 0) {
          _this2.updateDynamicData().setNavInterval('right');
        }
      });*/ // Time Table Events

      this.timeTable.add(this.timeTableLine).add(this.titleClamp).on('mousedown touchstart', function (e) {
        e.preventDefault();
        var touch = utility.getTouchCoords(e);

        if (_this2.shiftXEnabled || _this2.shiftYEnabled) {
          _this2.lastMousePosX = touch ? touch.x : e.pageX;
          _this2.lastMousePosY = touch ? touch.y : e.pageY;

          _this2.updateDynamicData().setTimeShiftState(true);

          $(global).on('mousemove.jqTimespace touchmove.jqTimespace', function (e) {
            e.preventDefault();

            _this2.timeShift(e);
          });
        }
      });
      return this;
    },

    /**
     * Set up navigation interval for holding down left or right nav buttons
     * @param {string} dir 'left' or 'right'
     * @return {Object} The Plugin instance
     */
    setNavInterval: function setNavInterval(dir) {
      var _this3 = this;

      this.navInterval.dir = dir;
      this.navigate(dir, -1);
      this.navInterval.timer = setInterval(function () {
        _this3.navInterval.engaged = true;

        _this3.navigate(dir, -1, 'linear');
      }, 200);
      return this;
    },

    /**
     * Clear navigation interval
     * @return {Object} The Plugin instance
     */
    clearNavInterval: function clearNavInterval() {
      if (this.navInterval.timer) {
        clearInterval(this.navInterval.timer);
        this.navInterval.timer = null;

        if (this.navInterval.engaged) {
          this.navInterval.engaged = false;
          this.navigate(this.navInterval.dir === 'left' ? -this.options.markerWidth : this.options.markerWidth, -1);
        }
      }

      return this;
    },

    /**
     * Navigate the time table in a direction or by a specified amount
     * @param {string|number|Array} direction 'left', 'right', a positive or negative amount, or [x, y]
     * @param {number} duration The duration in seconds, or -1
     * @param {string?} ease The transition ease type
     * @param {bool?} isTableShift If the direction amount is the actual time table shiftPos
     * @return {Object} The Plugin instance
     */
    navigate: function navigate(dir, duration, ease, isTableShift) {
      var x = dir,
          y = 0,
          shift = null;
      this.transition = duration;
      this.transitionEase = ease;
      this.setTimeShiftState(false);

      if (Array.isArray(dir)) {
        x = dir[0];
        y = dir[1];
      }

      if (typeof x === 'number') {
        if (isTableShift) {
          // Shifting time table
          this.shiftDirX = x > 0 ? '>' : '<';
          this.shiftPosX = x;
        } else {
          // Navigating by an amount
          this.shiftDirX = x > 0 ? '<' : '>';
          this.shiftPosX = this.getTablePosition() - x;
        }
      } else {
        // If direction is left, the time table is shifted to a greater amount
        if (shift === null) {
          shift = [0, 0];
        }

        shift[0] = x === 'left' ? '>' : '<';
      }

      if (y) {
        if (typeof y === 'number') {
          this.shiftDirY = y > 0 ? '<' : '>';
          this.shiftPosY = this.getTableBodyPosition() - y;
        } else {
          // If direction is up, the time table is shifted to a greater amount
          if (shift === null) {
            shift = [0, 0];
          }

          shift[1] = y === 'up' ? '>' : '<';
        }
      }

      this.timeShift(null, shift, true);
      return this;
    },

    /**
     * Set the time table and container states for shifting
     * @return {Object} The Plugin instance
     */
    setTimeShiftState: function setTimeShiftState(on) {
      var elems = this.dataContainer.add(this.timeTable).add(this.timeTableBody).add(this.timeEvents.map(function () {
        return $(this).find('span')[0];
      })); // Reset Transitions

      elems.removeClass(classes.animated).css({
        transitionDuration: '',
        transitionTimingFunction: ''
      });

      if (on) {
        this.timeTable.addClass(classes.shifting);
        this.transition = -1; // Reset the custom transition duration
      } else {
        elems.addClass(classes.animated);
        this.timeTable.removeClass(classes.shifting); // Check if custom transition time is used

        if (this.transition >= 0) {
          elems.css('transitionDuration', this.transition + 's');
        } // Check if custom transition ease is used


        if (!utility.isEmpty(this.transitionEase)) {
          elems.css('transitionTimingFunction', this.transitionEase);
        }
      }

      return this;
    },

    /**
     * Shift the time table
     * @param {Object?} e The jQuery Event object if available
     * @param {Array?} nav The x and y directions to shift '<' or '>', '^' or 'v'
     * @param {bool?} finished If the shift is finished
     * @param {bool?} toss If the time table should be tossed on quick movement
     * @return {Object} The Plugin instance
     */
    timeShift: function timeShift(e, nav, finished, toss) {
      if (e === null) {
        e = {
          pageX: 0,
          pageY: 0
        };
      }

      var opts = this.options,
          canShiftX = this.shiftXEnabled,
          canShiftY = this.shiftYEnabled;

      if (!canShiftX && !canShiftY) {
        return this;
      }

      var touch = !finished ? utility.getTouchCoords(e) : null,
          x = touch ? touch.x : e.pageX,
          y = touch ? touch.y : e.pageY;

      if (Array.isArray(nav)) {
        if (nav[0]) {
          this.shiftDirX = nav[0];
          this.shiftPosX = nav[0] === '<' ? this.getTablePosition() - opts.navigateAmount : this.getTablePosition() + opts.navigateAmount;
        }

        if (nav[1]) {
          this.shiftDirY = nav[1];
          this.shiftPosY = nav[1] === '<' ? this.getTableBodyPosition() - opts.navigateAmount : this.getTableBodyPosition() + opts.navigateAmount;
        }
      }

      if (canShiftX) {
        this.timeShiftPos('X', toss).updateCurWideHeading(this.shiftPosX !== null ? parseInt(this.timeTable.css('left')) - this.shiftPosX : 0).timeShiftCache('X', x, finished);
      }

      if (canShiftY) {
        this.timeShiftPos('Y', toss).timeShiftCache('Y', y, finished);
      }

      return this;
    },

    /**
     * Apply the new position to the time table
     * @param {string} plane 'X' or 'Y'
     * @param {bool} toss If the time table should be tossed on quick movement
     * @return {Object} The Plugin instance
     */
    timeShiftPos: function timeShiftPos(plane, toss) {
      if (this['shiftPos' + plane] === null) {
        return this;
      }

      var isX = plane === 'X',
          target = isX ? 'timeTable' : 'timeTableBody',
          shiftPos = 'shiftPos' + plane,
          shiftDir = 'shiftDir' + plane,
          shiftDiff = 'shiftDiff' + plane,
          tableOffset = 'tableOffset' + plane,
          css = isX ? 'left' : 'top'; // Add to the final shift position if tossing

      if (toss) {
        this[shiftPos] += this[shiftDiff] * 10;
      } // Time table must be moved within bounds


      if (this[shiftDir] === '<' && this[shiftPos] >= -this.viewData[tableOffset] || this[shiftDir] === '>' && this[shiftPos] <= 0) {
        this[target].css(css, this[shiftPos] + 'px');
      } else if (this[shiftDir] === '<' && this[shiftPos] < -this.viewData[tableOffset]) {
        this[shiftPos] = -this.viewData[tableOffset];
        this[target].css(css, -this.viewData[tableOffset] + 'px');
      } else if (this[shiftDir] === '>' && this[shiftPos] > 0) {
        this[shiftPos] = 0;
        this[target].css(css, 0);
      }

      if (isX) {
        this.container.trigger('shiftX.jqTimespace');
      }

      return this;
    },

    /**
     * Cache new position for next mousemove event
     * @param {string} plane 'X' or 'Y'
     * @param {number} val The x or y value
     * @param {bool} finished If the time shift is finished
     * @return {Object} The Plugin instance
     */
    timeShiftCache: function timeShiftCache(plane, val, finished) {
      var isX = plane === 'X',
          lastMousePos = 'lastMousePos' + plane,
          shiftPos = 'shiftPos' + plane,
          shiftDir = 'shiftDir' + plane,
          shiftDiff = 'shiftDiff' + plane,
          dragMultiplier = "drag".concat(plane, "Multiplier"),
          posMethod = isX ? 'getTablePosition' : 'getTableBodyPosition';
      var dir = 0;

      if (val !== this[lastMousePos] && !finished) {
        dir = val - this[lastMousePos];
        this[shiftDiff] = dir;
        this[shiftPos] = this[posMethod]() + dir * this.options[dragMultiplier];
        this[shiftDir] = dir < 0 ? '<' : '>';
        this[lastMousePos] = val;
      } else {
        this[shiftPos] = null;
      }

      return this;
    },

    /**
     * Get the time table's left position
     * @param {bool} offset If the offset is needed
     * @return {number}
     */
    getTablePosition: function getTablePosition(offset) {
      return parseFloat(offset ? this.timeTable.offset().left : this.timeTable.css('left'));
    },

    /**
     * Get the time table body's top position
     * @return {number}
     */
    getTableBodyPosition: function getTableBodyPosition() {
      return parseFloat(this.timeTableBody.css('top'));
    },

    /**
     * Get a time string appropriate for displaying
     * @param {number} time The time integer
     * @return {string|null}
     */
    getDisplayTime: function getDisplayTime(time) {
      if (!utility.isEmpty(time)) {
        if (this.options.use12HourTime) {
          return this.getTime(time) + this.getTimeSuffix(time);
        } else {
          return this.getTime(time) + this.getMinutes(time);
        }
      }

      return time;
    },

    /**
     * Get the hours of a time, or the date
     * @param {number} time
     * @return {string|any}
     */
    getTime: function getTime(time) {
      if (this.options.timeType === 'hour') {
        return utility.getHours(time, !this.options.use12HourTime);
      } else if (this.options.timeType === 'date') {
        // Correct if time is 0 AD
        return time === 0 ? 1 : Math.abs(time);
      }

      return time;
    },

    /**
     * Get the minutes of a time, or an empty string if not using hour type
     * @param {number} time
     * @return {string}
     */
    getMinutes: function getMinutes(time) {
      if (this.options.timeType === 'hour') {
        return ':' + utility.getMinutes(time);
      }

      return '';
    },

    /**
     * Get the time suffix for the time
     * @param {number} time
     * @return {string}
     */
    getTimeSuffix: function getTimeSuffix(time) {
      var opts = this.options;

      if (opts.useTimeSuffix) {
        if (opts.timeType === 'hour') {
          if (opts.use12HourTime) {
            return time < 12 ? opts.timeSuffixFunction('am') : opts.timeSuffixFunction('pm');
          }
        } else if (opts.timeType === 'date') {
          return time < 0 ? opts.timeSuffixFunction('bc') : opts.timeSuffixFunction('ad');
        }
      }

      return '';
    },

    /**
     * Get the full start and end date string
     * @param {number} start The start date with the suffix
     * @param {number} end The end date with the suffix
     * @return {string}
     */
    getFullDate: function getFullDate(start, end) {
      var time = !utility.isEmpty(start) ? this.getDisplayTime(start) : '';
      time += !utility.isEmpty(end) && end !== start ? " \u2013 ".concat(this.getDisplayTime(end)) : '';
      return time;
    },

    /**
     * Update the static container data
     * @return {Object} The Plugin instance
     */
    updateStaticData: function updateStaticData() {
      this.viewData.height = Math.ceil(this.dataContainer.innerHeight());
      this.viewData.halfY = Math.ceil(this.viewData.height / 2);
      this.viewData.tableOffsetY = this.timeTable.outerHeight() - this.dataContainer.outerHeight();
      return this;
    },

    /**
     * Update the dynamic container and time table data
     * @return {Object} The Plugin instance
     */
    updateDynamicData: function updateDynamicData() {
      this.viewData.left = Math.ceil(this.dataContainer.offset().left);
      this.viewData.offsetY = this.viewData.top + this.viewData.height;
      this.viewData.top = Math.ceil(this.dataContainer.offset().top);
      this.viewData.width = Math.ceil(this.dataContainer.innerWidth());
      this.viewData.halfX = Math.ceil(this.viewData.width / 2);
      this.viewData.heightOverhang = this.dataContainer.outerHeight() > $(global).height() * 0.8;
      this.viewData.offsetX = this.viewData.left + this.viewData.width;
      this.viewData.shiftOriginX = this.getTablePosition();
      this.viewData.shiftOriginY = this.getTableBodyPosition();
      this.viewData.tableOffsetX = this.timeTable.outerWidth() - this.dataContainer.outerWidth(); // Check if time table is too small to shift

      if (this.viewData.tableOffsetX < 0) {
        this.shiftXEnabled = false;
        this.timeTable.css('margin', '0 auto');
        this.timeTableLine.hide();
        /*this.navLeft.hide(); -- removed for Cold Turkey
        this.navRight.hide();*/
      } else {
        this.shiftXEnabled = true;
        this.timeTable.css('margin', 0);
        this.timeTableLine.show();

        /*if (this.options.navigateAmount > 0) { -- removed for Cold Turkey
          this.navLeft.show();
          this.navRight.show();
        }*/
      }

      if (this.viewData.tableOffsetY < 0) {
        this.shiftYEnabled = false;
      }

      this.updateCurWideHeading();
      return this;
    },

    /**
     * Update the currently visible wide heading
     * @param {number} xDiff The shift x difference if time table is shifting
     * @return {Object} The Plugin instance
     */
    updateCurWideHeading: function updateCurWideHeading(xDiff) {
      var _this4 = this;

      if (!this.checkCurWideHeading(null, xDiff) && this.wideHeadings.length > 0) {
        this.wideHeadings.each(function (i, elem) {
          _this4.setCurWideHeading($(elem), xDiff);
        });
      }

      return this;
    },

    /**
     * Check if the current wide heading is still in visible bounds
     * @param {Object?} elem The optional jQuery heading element
     * @param {number} xDiff The shift x difference if time table is shifting
     * @return {bool}
     */
    checkCurWideHeading: function checkCurWideHeading(elem, xDiff) {
      var e = elem || this.curWideHeading;

      if (!e || e.length < 1) {
        return false;
      }

      var left = e.offset().left - (xDiff || 0),
          textSpan = e.data('textSpan');
      return left + e.data('span') - textSpan - this.viewData.halfX > this.viewData.left && left + textSpan + this.viewData.halfX < this.viewData.offsetX;
    },

    /**
     * Set the currently visible wide heading
     * @param {Object} elem The jQuery heading element
     * @param {number} xDiff The shift x difference if time table is shifting
     * @return {Object} The Plugin instance
     */
    setCurWideHeading: function setCurWideHeading(elem, xDiff) {
      var span = elem.children('span');

      if (this.checkCurWideHeading(elem, xDiff)) {
        // Remove current title clamp if exists
        if (this.curWideHeading) {
          this.curWideHeading.children('span').css('opacity', 1);
        } // Set up new clone title for heading clamp


        this.curWideHeading = elem;
        span.css('opacity', 0);
        this.titleClamp.text(span.text()).stop().animate({
          opacity: 1
        }, 250);
      } else if (this.curWideHeading && this.curWideHeading[0] === elem[0]) {
        // Current wide heading is no longer within view range
        this.curWideHeading.children('span').css('opacity', 1);
        this.curWideHeading = null;
        this.titleClamp.stop().animate({
          'opacity': 0
        }, 250);
      }

      return this;
    },

    /**
     * Update the position of a wide event's title
     * @param {number} eventOffset The event container's left offset from time table
     * @param {number} elemWidth The event element's width
     * @param {Object} span The span element to position
     * @param {number} spanWidth The event element's span width
     * @return {Object} The Plugin instance
     */
    updateWideEvent: function updateWideEvent(eventOffset, elemWidth, span, spanWidth) {
      var leftPos = eventOffset + this.viewData.left + this.shiftPosX,
          newPos = this.viewData.left - leftPos;

      if (leftPos < this.viewData.left && spanWidth <= this.viewData.width) {
        if (newPos > elemWidth - spanWidth) {
          span.css('left', elemWidth - spanWidth);
        } else {
          span.css('left', newPos);
        }
      } else {
        span.css('left', 0);
      }

      return this;
    },

    /**
     * Update an event's position if overlapping other events
     * @param {number} i The index of the current event
     * @param {Object} rowData {rows, curRow, marginOrigin, marginTop, event, eventElem}
     * @param {number} eventOffset The event's left offset
     * @return {Object} The Plugin instance
     */
    updateEventOverlap: function updateEventOverlap(i, rowData, eventOffset) {
      // Check if a jqTimespaceEvent div already exists in the time marker
      var sharingWith = rowData.event.siblings(".".concat(classes.event)).length > 0 ? rowData.event.siblings(".".concat(classes.event)) : null,
          span = eventOffset + Math.floor(rowData.event.outerWidth());
      var sharedSpace = 0;

      if (i === 0) {
        rowData.rows.push(span);
        rowData.marginOrigin = parseInt(rowData.event.css('marginTop'));
        rowData.marginTop = Math.floor(rowData.marginOrigin + rowData.eventElem.outerHeight());
      } else {
        if (sharingWith) {
          // Event is sharing the same td with another event
          // Start on the next row of the shared element
          // And start with the basic padding
          sharedSpace = rowData.marginOrigin;
          rowData.curRow += 1; // Check if rows array needs expanding

          if (rowData.rows.length === rowData.curRow) {
            rowData.rows[rowData.curRow] = 0;
          }
        }

        for (var row = sharingWith ? rowData.curRow : 0; row < rowData.rows.length; row += 1) {
          if (rowData.rows[row] <= eventOffset) {
            // Row is clear / Cache the new span width and switch to this row space
            rowData.rows[row] = span;
            rowData.curRow = row; // If first row, the normal marginTop will be used
            // Otherwise, calculate the padding for the current row

            if (row > 0) {
              if (sharingWith) {
                rowData.event.css('marginTop', sharedSpace);
              } else {
                rowData.event.css('marginTop', row * rowData.marginTop + rowData.marginOrigin);
              }
            }

            break;
          } else {
            // Push the event down to the next row space
            if (sharingWith) {
              // Cache the amount of padding for next row check
              sharedSpace += rowData.marginTop;
              rowData.event.css('marginTop', sharedSpace);
            } else {
              rowData.event.css('marginTop', (row + 1) * rowData.marginTop + rowData.marginOrigin);
            } // If on last cached row, settle with the next row space


            if (row === rowData.rows.length - 1) {
              rowData.rows[row + 1] = span;
              rowData.curRow = row + 1;
              break;
            }
          }
        }
      }

      return this;
    },

    /**
     * Update the Display element height for MutationObserver
     * @return {Object} The Plugin instance
     */
    updateDisplayHeight: function updateDisplayHeight() {
      this.display.css('height', this.displayWrapper.outerHeight(true));
    }
  };
  /*******/

  /* API */

  /*******/

  API = {
    // The ID used for the isnt array to target the correct instance
    id: 0,

    // Element Getters
    get container() {
      var me = inst[this.id];

      if (!utility.checkInstance(me)) {
        return this;
      }

      return me.container;
    },

    get event() {
      var me = inst[this.id];

      if (!utility.checkInstance(me)) {
        return this;
      }

      return me.curEvent ? me.curEvent.parent('div') : null;
    },

    // Option Setters
    set shiftOnEventSelect(v) {
      var me = inst[this.id];

      if (!utility.checkInstance(me)) {
        return this;
      }

      me.options.shiftOnEventSelect = v;
    },

    set navigateAmount(v) {
      var me = inst[this.id];

      if (!utility.checkInstance(me)) {
        return this;
      }

      me.options.navigateAmount = v;
    },

    /**
     * Navigate the time table in a direction or by a specified amount
     * @param {Array} direction An [x, y] Array with x = 'left' or 'right', y = 'up' or 'down', or positive or negative numbers
     * @param {number} duration The amount of seconds to complete the navigation animation
     * @return {Object} The API
     */
    navigateTime: function navigateTime(direction, duration) {
      var me = inst[this.id];

      if (!utility.checkInstance(me)) {
        return this;
      }

      duration = parseFloat(duration) || -1;
      me.navigate(direction, duration);
      return this;
    }
  };

  APILoader = function APILoader(id) {
    this.id = id;
  };

  APILoader.prototype = API;
  APILoader.prototype.constructor = APILoader;
  /***********/

  /* Utility */

  /***********/

  utility = {
    /**
     * Round time up or down to the increment
     * @param {string} fn The Math function to use
     * @param {number} increment The time marker increment
     * @param {number} number The number to round
     * @return {Array} The rounded number
     */
    roundToIncrement: function roundToIncrement(fn, increment, number) {
      return Math[fn](number / increment) * increment;
    },

    /**
     * Get the amount of span width for a start and end time
     * @param {number} start The start time
     * @param {number} end The end time
     * @param {number} increment The time marker increment
     * @param {number} width The time marker width
     * @return {number|NaN}
     */
    getTimeSpan: function getTimeSpan(start, end, increment, width) {
      start = this.roundToIncrement('round', increment, start);
      end = this.roundToIncrement('round', increment, end);
      return Math.abs(Math.floor((end - start) / increment)) * width;
    },

    /**
     * Compare two time numbers for less than, equal to, or greater than
     * @param {number} time1 The first time to compare
     * @param {number} time2 The second time to compare
     * @param {number} increment The time marker increment
     * @return {number|NaN} -1 if time1 is less than time2, 0 if equal, and 1 if greater than
     */
    compareTime: function compareTime(time1, time2, increment) {
      time1 = this.roundToIncrement('round', increment, time1);
      time2 = this.roundToIncrement('round', increment, time2);

      if (time1 < time2) {
        return -1;
      }

      if (time1 > time2) {
        return 1;
      }

      return 0;
    },

    /**
     * Get the hours string from a time value
     * @param {number} time
     * @return {string}
     */
    getHours: function getHours(time, military) {
      time = parseInt(time);

      if (isNaN(time)) {
        time = '';
      } else {
        if (military && time < 10) {
          // Pad 0 for military time
          time = '0' + time;
        } else if (!military && time < 1) {
          // Use 12 for 12AM
          time = 12;
        } else if (!military && time >= 13) {
          // Convert to 12 Hour Time
          time -= 12;
        }
      }

      return time;
    },

    /**
     * Get the minutes string from a time value
     * @param {number} time
     * @return {string}
     */
    getMinutes: function getMinutes(time) {
      time = parseFloat(time) || 0;
      var minutes = Math.round(time % 1 * 60);

      if (minutes < 10) {
        minutes = '0' + minutes;
      }

      return minutes + '';
    },

    /**
     * Check if a variable is empty
     * @param {any} v The variable to check
     * @return {bool}
     */
    isEmpty: function isEmpty(v) {
      return v === null || v === undefined || v === '';
    },

    /**
     * Sanitize a string for DOM insertion
     * @param {string} text The text to sanitize
     * @return {string}
     */
    sanitize: function sanitize(text) {
      return $('<div />').text(text).html();
    },

    /**
     * Get the touch events coordinates if supported
     * @return {Object} x and y values
     */
    getTouchCoords: function getTouchCoords(e) {
      var origin = e.originalEvent,
          evt = origin.touches && origin.touches.length === 1 ? origin.touches[0] : null,
          touch = {
        x: evt ? evt.pageX : 0,
        y: evt ? evt.pageY : 0
      };
      return evt ? touch : null;
    },

    /**
     * Check if the plugin instance is valid
     * @return {bool}
     */
    checkInstance: function checkInstance(instance) {
      if (!instance || !instance.API) {
        errHandler(new Error(errors.INV_INSTANCE.msg), 'INV_INSTANCE');
        return false;
      }

      return true;
    }
  };
})(jQuery, window);