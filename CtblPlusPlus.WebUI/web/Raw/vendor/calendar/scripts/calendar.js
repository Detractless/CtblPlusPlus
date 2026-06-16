function drawSchedule(blockId, finalBlockLocked) {
	
	var initialSchedule = [];
	var lastValidStart;
	var lastValidEnd;
	var settingsShow24Hour = false;
	var weekStartMonday = 0;
	var actualDate = new Date();
	var currentFakeDate, fakeStartWeekDate, fakeDayOffset;

	var blockIdDisplay = blockId;
	if (blockId == "Frozen Turkey" || blockId.indexOf("Frozen Turkey,") == 0) {
		blockIdDisplay = (blockId.indexOf(",") > 0) ? blockId.substring(blockId.indexOf(',') + 1) : blockId;
	}

	if (settings.settings.show24hour == "true") {
		settingsShow24Hour = true;
	}
	
	if (settings.settings.weekStart == "monday") {
		weekStartMonday = 1;
	} else if (settings.settings.weekStart == "saturday") {
		weekStartMonday = 6;
	}
	
	if (weekStartMonday == 1) {
		fakeDayOffset = (actualDate.getDay() == 0) ? 6 : actualDate.getDay() - 1;
		fakeStartWeekDate = new Date(2020,6,13,actualDate.getHours(),actualDate.getMinutes(),actualDate.getSeconds());
	} else if (weekStartMonday == 6) {
		fakeDayOffset = (actualDate.getDay() == 6) ? 0 : actualDate.getDay() + 1;
		fakeStartWeekDate = new Date(2020,6,11,actualDate.getHours(),actualDate.getMinutes(),actualDate.getSeconds());
	} else {
		fakeDayOffset = actualDate.getDay();
		fakeStartWeekDate = new Date(2020,6,12,actualDate.getHours(),actualDate.getMinutes(),actualDate.getSeconds());
	}
	currentFakeDate = new Date(fakeStartWeekDate.getTime()).addDays(fakeDayOffset);

	var calendar = $('#calendar');
		
	calendar.weekCalendar({
		date: currentFakeDate,
		useShortDayNames: true,
		displayOddEven: false,
		showHeader: false,
		timeslotsPerHour: 4,
        defaultEventLength: 4,
		timeslotHeight: Math.round((window.screen.availHeight-375)/96),
		allowCalEventOverlap: true,
		overlapEventsSeparate: true,
        totalEventsWidthPercentInOneColumn: 91,
		firstDayOfWeek: weekStartMonday,
        timeSeparator: ' - ',
		businessHours: {start: 9, end: 17, limitDisplay: false },
		use24Hour: settingsShow24Hour,
		daysToShow: 7,
        hourLine: true,
        scrollToHourMillis: 1200,
		height : function(calendar) {
			return $(window).height()-343;
		},
		draggable : function(calEvent, $event) {
			if (!calEvent.locked) {
				return true;
			} else {
				return false;
			}
		},
		resizable : function(calEvent, $event) {
			if (!calEvent.locked) {
				return true;
			} else {
				return false;
			}
		},
		eventNew : function(calEvent, $event) {
			
			$dialogContentNew = $("#dialog-edit-scheduled-block");
			resetForm($dialogContentNew);
			var startField = $dialogContentNew.find("select[name='start']").val(calEvent.start);
			var endField = $dialogContentNew.find("select[name='end']").val(calEvent.end);
			
			$dialogContentNew.dialog({
				modal: true,
				position: { my: "center", at: "center", of: $(".page-content-wrapper") },
				width: "580px",
				draggable: false,
				title: makeTitleWithBlockName("New '", blockIdDisplay, "' Block", 580),
				open: function(event, ui) {
					
					var maxIndex = getMaxZ($('.ui-widget-overlay'));
					$('.ui-widget-overlay').filter(function() { return $(this).css('z-index') == maxIndex; }).bind('click', function() { 
						$("#dialog-edit-schedule").focus(); /* IE needs focus to not scroll calendar back to top */
						$dialogContentNew.dialog("close"); 
					});
					$dialogContentNew.focus();
					
					$('#edit-scheduled-block-copy-label').text('Copy to');
					if (weekStartMonday == 1) {
						$('.saturday-first').hide();
						$('.sunday-first').hide();
						$('.monday-first').show();
					} else if (weekStartMonday == 6) {
						$('.sunday-first').hide();
						$('.monday-first').hide();
						$('.saturday-first').show();
					} else {
						$('.saturday-first').hide();
						$('.monday-first').hide();
						$('.sunday-first').show();
					}
					
					$('#edit-schedule-break').data('break', 'none');
					$('#edit-schedule-break').data('blockId', blockId);
					$('#edit-schedule-break').attr('onclick', "editBreak(this, 'false');");
					$('#edit-schedule-break').html('No breaks');
					
					$('.edit-schedule-checkbox input').prop('disabled', false);
					$('.edit-schedule-checkbox input').prop('checked', false);
					$('#' + weekStartMonday.toString() + '-day-' + calEvent.start.getDay().toString()).prop('checked', true);
					$('#' + weekStartMonday.toString() + '-day-' + calEvent.start.getDay().toString()).prop('disabled', true);
					
				},
				close: function() {
					$dialogContentNew.hide();
					$dialogContentNew.dialog("destroy");
					$('#calendar').weekCalendar("removeUnsavedEvents");
				},
				buttons: {
					"Close without adding" : {
						text: "Close without adding",
						class: "btn-grey-dialog",
						click: function() {
							$("#dialog-edit-schedule").focus(); /* IE needs focus to not scroll calendar back to top */
							$dialogContentNew.dialog("close");
						}
					},
					"Add" : {
						text: "Add",
						class: "btn-green-dialog",
						click: function() {
							
							$(".edit-schedule-checkbox input:checked").each(function() {
								
								var newCalEventStart = new Date(startField.val());
								var newCalEventEnd = new Date(endField.val());
								
								var dayId = parseInt(this.id.slice(-1));
								if (weekStartMonday == 1) {
									dayId = (dayId == 0) ? 6 : dayId - 1;
								} else if (weekStartMonday == 6) {
									dayId = (dayId == 6) ? 0 : dayId + 1;
								}
								
								var newCalEvent = {};
								newCalEvent.id = schedule.length;
								newCalEvent.start = new Date(fakeStartWeekDate.getTime()).addDays(dayId);
								newCalEvent.start.setHours(newCalEventStart.getHours());
								newCalEvent.start.setMinutes(newCalEventStart.getMinutes());
								newCalEvent.start.setSeconds(0);
								newCalEvent.start.setMilliseconds(0);
								newCalEvent.end = new Date(fakeStartWeekDate.getTime()).addDays((newCalEventEnd.getHours() == 0 && newCalEventEnd.getMinutes() == 0) ? dayId+1 : dayId);
								newCalEvent.end.setHours(newCalEventEnd.getHours());
								newCalEvent.end.setMinutes(newCalEventEnd.getMinutes());
								newCalEvent.end.setSeconds(0);
								newCalEvent.end.setMilliseconds(0);
								newCalEvent.blockId = blockId;
								newCalEvent.break = $('#edit-schedule-break').data('break');
								newCalEvent.locked = false;
								
								calendar.weekCalendar("updateEvent", newCalEvent);
								
								var formattedStart = newCalEvent.start.getDay().toString() + "," + newCalEvent.start.getHours().toString() + "," + newCalEvent.start.getMinutes().toString();
								var formattedEnd;
								if (newCalEvent.end.getDay() == 0 && newCalEvent.end.getHours() == 0 && newCalEvent.end.getMinutes() == 0) {  // anti-loop back for blocks ending midnight Sat
									formattedEnd = "7,0,0";
								} else {
									formattedEnd = newCalEvent.end.getDay().toString() + "," +  newCalEvent.end.getHours().toString() + "," + newCalEvent.end.getMinutes().toString();
								}
								
								var newBlock = {};
								newBlock.id = schedule.length.toString();
								newBlock.startTime = formattedStart;
								newBlock.endTime = formattedEnd;
								newBlock.break = newCalEvent.break;
								schedule.push(newBlock);
								
							});
							
							$("#dialog-edit-schedule").focus(); /* IE needs focus to not scroll calendar back to top */
							$dialogContentNew.dialog("close");	
							
						}
					}
				}
		   }).show();
		   setupStartAndEndTimeFields(startField, endField, calEvent, calendar.weekCalendar("getTimeslotTimes", calEvent.start));
		},
		eventResize: function(calEvent, $event) {
			
			var formattedStart = calEvent.start.getDay().toString() + "," + calEvent.start.getHours().toString() + "," + calEvent.start.getMinutes().toString();
			var formattedEnd;
			if (calEvent.end.getDay() == 0 && calEvent.end.getHours() == 0 && calEvent.end.getMinutes() == 0) { // anti-loop back for blocks ending midnight Sat
				formattedEnd = "7,0,0";
			} else {
				formattedEnd = calEvent.end.getDay().toString() + "," +  calEvent.end.getHours().toString() + "," + calEvent.end.getMinutes().toString();
			}
			var replaceIndex = 0;
			$.each(schedule, function(i, val) {
				if (val.id == calEvent.id.toString()) {
					replaceIndex = i;
				}
			});
			var newBlock = {};
			newBlock.id = calEvent.id.toString();
			newBlock.startTime = formattedStart;
			newBlock.endTime = formattedEnd;
			newBlock.break = calEvent.break;
			schedule.splice(replaceIndex, 1, newBlock);
			
			$("#dialog-edit-schedule").focus(); /* IE needs focus to not scroll calendar back to top */
			
		},
		eventDrag: function(calEvent, $event) {
			
			$(calEvent).focus();
			lastValidStart = calEvent.start;
			lastValidEnd = calEvent.end;
			
			$("#dialog-edit-schedule").focus(); /* IE needs focus to not scroll calendar back to top */
			
        },
		eventDrop : function(calEvent, $event) {
			
			if (!(calEvent.end.getHours() == 0 && calEvent.end.getMinutes() == 0)) {
				if (calEvent.start.getHours() >= calEvent.end.getHours()) {
					/* Event end has crossed over to another day. Ignore the drag. */
					calEvent.start = lastValidStart;
					calEvent.end = lastValidEnd;
					$('#calendar').weekCalendar("removeUnsavedEvents");
					$("#dialog-edit-schedule").focus(); /* IE needs focus to not scroll calendar back to top */
					return;
				}
			}
			
			var formattedStart = calEvent.start.getDay().toString() + "," + calEvent.start.getHours().toString() + "," + calEvent.start.getMinutes().toString();
			var formattedEnd;
			if (calEvent.end.getDay() == 0 && calEvent.end.getHours() == 0 && calEvent.end.getMinutes() == 0) { // anti-loop back for blocks ending midnight Sat
				formattedEnd = "7,0,0";
			} else {
				formattedEnd = calEvent.end.getDay().toString() + "," +  calEvent.end.getHours().toString() + "," + calEvent.end.getMinutes().toString();
			}
			var replaceIndex = 0;
			$.each(schedule, function(i, val) {
				if (val.id == calEvent.id.toString()) {
					replaceIndex = i;
				}
			});
			var newBlock = {};
			newBlock.id = calEvent.id.toString();
			newBlock.startTime = formattedStart;
			newBlock.endTime = formattedEnd;
			newBlock.break = calEvent.break;
			schedule.splice(replaceIndex, 1, newBlock);
			
			$("#dialog-edit-schedule").focus();
			
		},
		eventClick : function(calEvent, $event) {
			
			if (typeof calEvent.id == "string") {
				return;
			}
			
			$dialogContentClick = $("#dialog-edit-scheduled-block");
			resetForm($dialogContentClick);
			var startField = $dialogContentClick.find("select[name='start']").val(calEvent.start);
			var endField = $dialogContentClick.find("select[name='end']").val(calEvent.end);

			$dialogContentClick.dialog({
				modal: true,
				position: { my: "center", at: "center", of: $(".page-content-wrapper") },
				width: "580px",
				draggable: false,
				title: makeTitleWithBlockName("'", blockIdDisplay, "' Block", 580),
				open: function(event, ui) { 
				
					var maxIndex = getMaxZ($('.ui-widget-overlay'));
					$('.ui-widget-overlay').filter(function() { return $(this).css('z-index') == maxIndex; }).bind('click', function() {
						$("#dialog-edit-schedule").focus(); /* IE needs focus to not scroll calendar back to top */
						$dialogContentClick.dialog("close");
					});
					$dialogContentClick.focus();
					
					$('#edit-scheduled-block-copy-label').text('Apply changes to');
					if (weekStartMonday == 1) {
						$('.saturday-first').hide();
						$('.sunday-first').hide();
						$('.monday-first').show();
					} else if (weekStartMonday == 6) {
						$('.sunday-first').hide();
						$('.monday-first').hide();
						$('.saturday-first').show();
					} else {
						$('.saturday-first').hide();
						$('.monday-first').hide();
						$('.sunday-first').show();
					}
					
					$("#edit-scheduled-block-event-delete").show();
					if (typeof calEvent.locked != 'undefined' && calEvent.locked == true) {
						$("#edit-scheduled-block-event-delete").hide();
					}
					
                    var breakData, breakDataCompare = 'none';
					var textBreak = 'No breaks';
					$.each(schedule, function(blockIndex, schedBlock) {
						if (schedBlock.id == calEvent.id) {
							breakData = schedBlock.break;
                            breakDataCompare = schedBlock.break;
                            if (breakDataCompare.indexOf("randomText,") == 0 || breakDataCompare.indexOf("delay,") == 0) {
                                breakDataCompare = removeDate(breakDataCompare);
                            }
							textBreak = getBreakText(breakData, blockId);
						}
					});
					$('#edit-schedule-break').html(textBreak);
					$('#edit-schedule-break').data('break', breakData);
					$('#edit-schedule-break').data('blockId', blockId);
					$('#edit-schedule-break').attr('onclick', 'editBreak(this, "' + (typeof calEvent.locked != 'undefined' && calEvent.locked == true).toString() + '");');
					
					$('.edit-schedule-checkbox input').prop('disabled', false);
					$('.edit-schedule-checkbox input').prop('checked', false);
					$('.edit-schedule-checkbox input').removeAttr('data-schedId');
					$.each(schedule, function (index, schedBlock) {
						var startTimes = schedBlock.startTime.split(",");
						var endTimes = schedBlock.endTime.split(",");
                        var thisBreakDataCompare = schedBlock.break;
                        if (thisBreakDataCompare.indexOf("randomText,") == 0 || thisBreakDataCompare.indexOf("delay,") == 0) {
                            thisBreakDataCompare = removeDate(thisBreakDataCompare);
                        }
                        
						if (startTimes[1] == calEvent.start.getHours().toString() && startTimes[2] == calEvent.start.getMinutes().toString() &&
							endTimes[1] == calEvent.end.getHours().toString() && endTimes[2] == calEvent.end.getMinutes().toString() &&
                            thisBreakDataCompare == breakDataCompare &&
							!calEvent.illegalOverlap
							) {
								
							var initialScheduleIndex = -1;
							var isLocked = false;
							$.each(initialSchedule, function(i, val) {
								if (val.id == parseInt(schedBlock.id)) {
									initialScheduleIndex = i;
								}
							});
							if (initialScheduleIndex >= 0) {
								isLocked = initialSchedule[initialScheduleIndex].locked;
							}
							
							if (isLocked == calEvent.locked) {
								$('#' + weekStartMonday.toString() + '-day-' + startTimes[0]).prop('checked', true);
								$('#' + weekStartMonday.toString() + '-day-' + startTimes[0]).prop('disabled', false);
							} else if (!isLocked && calEvent.locked) {
								$('#' + weekStartMonday.toString() + '-day-' + startTimes[0]).prop('checked', true);
								$('#' + weekStartMonday.toString() + '-day-' + startTimes[0]).prop('disabled', false);
							} else if (isLocked && !calEvent.locked) {
								$('#' + weekStartMonday.toString() + '-day-' + startTimes[0]).prop('checked', false);
								$('#' + weekStartMonday.toString() + '-day-' + startTimes[0]).prop('disabled', 'disabled');
							}
								
							$('#' + weekStartMonday.toString() + '-day-' + schedBlock.startTime[0]).attr('data-schedId', schedBlock.id);
							
						}
					});
					$('#' + weekStartMonday.toString() + '-day-' + calEvent.start.getDay().toString()).attr('checked', 'checked');
					$('#' + weekStartMonday.toString() + '-day-' + calEvent.start.getDay().toString()).attr('disabled', 'disabled');
					
				},
				close: function() {
				   $dialogContentClick.hide();
				   $dialogContentClick.dialog("destroy");
				   $('#calendar').weekCalendar("removeUnsavedEvents");
				},
				buttons: {
					"Remove" : {
						html: '<i class="fa fa-times"></i> Remove selected',
						id: "edit-scheduled-block-event-delete",
						class: "btn-red-dialog btn-float-left-dialog",
						click: function() {

							var idsToDelete = [calEvent.id];
							$(".edit-schedule-checkbox input:checked:not(:disabled)").each(function() {
								if (typeof $(this).attr('data-schedId') == 'string') {
									idsToDelete.push(parseInt($(this).attr('data-schedId')));
								}
							});

							$.each(idsToDelete, function(i, id) {
								
								deleteEvent(id);
								
								for (let j = 0; j < idsToDelete.length; j++) {
									if (idsToDelete[j] > id) {
										idsToDelete[j] = idsToDelete[j] - 1;
									}
								}

							});

							$("#dialog-edit-schedule").focus(); /* IE needs focus to not scroll calendar back to top */
							$dialogContentClick.dialog("close");
						}
					},
					"Close without updating" : {
						text: "Close without updating",
						class: "btn-grey-dialog",
						click: function() {
							$("#dialog-edit-schedule").focus(); /* IE needs focus to not scroll calendar back to top */
							$dialogContentClick.dialog("close");
						}
					},
					"Update" : {
						text: "Update",
						class: "btn-green-dialog",
						click: function() {
							
							calEvent.start = new Date(startField.val());
							calEvent.end = new Date(endField.val());
							calEvent.break = $('#edit-schedule-break').data('break');
							
							calendar.weekCalendar("updateEvent", calEvent);
							
							var formattedStart = calEvent.start.getDay().toString() + "," + calEvent.start.getHours().toString() + "," + calEvent.start.getMinutes().toString();
							var formattedEnd;
							if (calEvent.end.getDay() == 0 && calEvent.end.getHours() == 0 && calEvent.end.getMinutes() == 0) {  // anti-loop back for blocks ending midnight Sat
								formattedEnd = "7,0,0";
							} else {
								formattedEnd = calEvent.end.getDay().toString() + "," +  calEvent.end.getHours().toString() + "," + calEvent.end.getMinutes().toString();
							}
							
							var replaceIndex = 0;
							$.each(schedule, function(i, val) {
								if (val.id == calEvent.id.toString()) {
									replaceIndex = i;
								}
							});
							
							var newBlock = {};
							newBlock.id = calEvent.id.toString();
							newBlock.startTime = formattedStart;
							newBlock.endTime = formattedEnd;
							newBlock.break = calEvent.break;
							schedule.splice(replaceIndex, 1, newBlock);
							
							/* Now, update other selected days as well */
							$(".edit-schedule-checkbox input:checked:not(:disabled)").each(function() {
								
								var newCalEventStart = new Date(startField.val());
								var newCalEventEnd = new Date(endField.val());
								
								var dayId = parseInt(this.id.slice(-1));
								if (weekStartMonday == 1) {
									dayId = (dayId == 0) ? 6 : dayId - 1;
								} else if (weekStartMonday == 6) {
									dayId = (dayId == 6) ? 0 : dayId + 1;
								}

								var schedId = "-1";
								if (typeof $(this).attr('data-schedId') == 'string') {
									schedId = $(this).attr('data-schedId');
								}
								
								if (schedId != "-1") {
									
									var replaceCalEvent = {};
									/* Scheduled block already exists, just update it while checking for locked entries  */
									
									var initialScheduleIndex = -1;
									$.each(initialSchedule, function(i, val) {
										if (val.id == parseInt(schedId)) {
											initialScheduleIndex = i;
										}
									});
									if (initialScheduleIndex >= 0) {
										replaceCalEvent.locked = initialSchedule[initialScheduleIndex].locked;
									} else {
										replaceCalEvent.locked = false;
									}
									
									replaceCalEvent.id = parseInt(schedId);
									replaceCalEvent.start = new Date(fakeStartWeekDate.getTime()).addDays(dayId);
									replaceCalEvent.start.setHours(newCalEventStart.getHours());
									replaceCalEvent.start.setMinutes(newCalEventStart.getMinutes());
									replaceCalEvent.start.setSeconds(0);
									replaceCalEvent.start.setMilliseconds(0);
									replaceCalEvent.end = new Date(fakeStartWeekDate.getTime()).addDays((newCalEventEnd.getHours() == 0 && newCalEventEnd.getMinutes() == 0) ? dayId+1 : dayId);
									replaceCalEvent.end.setHours(newCalEventEnd.getHours());
									replaceCalEvent.end.setMinutes(newCalEventEnd.getMinutes());
									replaceCalEvent.end.setSeconds(0);
									replaceCalEvent.end.setMilliseconds(0);
									replaceCalEvent.blockId = blockId;
									replaceCalEvent.break = $('#edit-schedule-break').data('break');									
									calendar.weekCalendar("updateEvent", replaceCalEvent);
									
									var formattedStart = replaceCalEvent.start.getDay().toString() + "," + replaceCalEvent.start.getHours().toString() + "," + replaceCalEvent.start.getMinutes().toString();
									var formattedEnd;
									if (replaceCalEvent.end.getDay() == 0 && replaceCalEvent.end.getHours() == 0 && replaceCalEvent.end.getMinutes() == 0) {  // anti-loop back for blocks ending midnight Sat
										formattedEnd = "7,0,0";
									} else {
										formattedEnd = replaceCalEvent.end.getDay().toString() + "," +  replaceCalEvent.end.getHours().toString() + "," + replaceCalEvent.end.getMinutes().toString();
									}
									
									var replaceIndex = 0;
									$.each(schedule, function(i, val) {
										if (val.id == schedId) {
											replaceIndex = i;
										}
									});
									
									var newBlock = {};
                                    var zeroDateBreak = calEvent.break;
                                    if (zeroDateBreak.indexOf("randomText,") == 0 || zeroDateBreak.indexOf("delay,") == 0) {
                                        zeroDateBreak = zeroDate(zeroDateBreak);
                                    }
									newBlock.id = schedId;
									newBlock.startTime = formattedStart;
									newBlock.endTime = formattedEnd;
									newBlock.break = zeroDateBreak;
									schedule.splice(replaceIndex, 1, newBlock);
									
								} else {
									
									/* Scheduled block doesn't exist add it */
									var newCalEvent = {};
									newCalEvent.id = schedule.length;
									newCalEvent.start = new Date(fakeStartWeekDate.getTime()).addDays(dayId);
									newCalEvent.start.setHours(newCalEventStart.getHours());
									newCalEvent.start.setMinutes(newCalEventStart.getMinutes());
									newCalEvent.start.setSeconds(0);
									newCalEvent.start.setMilliseconds(0);
									newCalEvent.end = new Date(fakeStartWeekDate.getTime()).addDays((newCalEventEnd.getHours() == 0 && newCalEventEnd.getMinutes() == 0) ? dayId+1 : dayId);
									newCalEvent.end.setHours(newCalEventEnd.getHours());
									newCalEvent.end.setMinutes(newCalEventEnd.getMinutes());
									newCalEvent.end.setSeconds(0);
									newCalEvent.end.setMilliseconds(0);
									newCalEvent.blockId = blockId;
									newCalEvent.break = $('#edit-schedule-break').data('break');
									newCalEvent.locked = false;
									
									calendar.weekCalendar("updateEvent", newCalEvent);
									
									var formattedStart = newCalEvent.start.getDay().toString() + "," + newCalEvent.start.getHours().toString() + "," + newCalEvent.start.getMinutes().toString();
									var formattedEnd;
									if (newCalEvent.end.getDay() == 0 && newCalEvent.end.getHours() == 0 && newCalEvent.end.getMinutes() == 0) {  // anti-loop back for blocks ending midnight Sat
										formattedEnd = "7,0,0";
									} else {
										formattedEnd = newCalEvent.end.getDay().toString() + "," +  newCalEvent.end.getHours().toString() + "," + newCalEvent.end.getMinutes().toString();
									}
									
									var newBlock = {};
                                    var zeroDateBreak = newCalEvent.break;
                                    if (zeroDateBreak.indexOf("randomText,") == 0 || zeroDateBreak.indexOf("delay,") == 0) {
                                        zeroDateBreak = zeroDate(zeroDateBreak);
                                    }
									newBlock.id = schedule.length.toString();
									newBlock.startTime = formattedStart;
									newBlock.endTime = formattedEnd;
									newBlock.break = zeroDateBreak;
									schedule.push(newBlock);
								}
							});
							
							$("#dialog-edit-schedule").focus(); /* IE needs focus to not scroll calendar back to top */
							$dialogContentClick.dialog("close");
							
						}
					}
				}
			}).show();
			setupStartAndEndTimeFields(startField, endField, calEvent, calendar.weekCalendar("getTimeslotTimes", calEvent.start));
		},
		beforeEventNew : function(calEvent, $event) {
		},
        calendarAfterLoad: function(calendar) {
			initialSchedule = schedule.slice();
			schedule = JSON.parse(JSON.stringify(settings.blocks[blockId].schedule));

			$(".wc-day-column-header>a").off("click");
			$(".wc-day-column-header>a").on("click", function() {
				var target = "day-1";
				var classList = $(this).parent().attr('class').split(/\s+/);
				for (var i = 0; i < classList.length; i++) {
					if (/^wc-day-\d$/.test(classList[i])) {
						target = classList[i].replace(/^wc\-/, '');
						break;
					}
				}
				currentlyAddingFullDayBlock = true;
				$(".wc-full-height-column." + target).mousedown();
				$(".wc-full-height-column." + target).mouseup();
			});

        },
        eventBody: function(calEvent, calendar) {
        },
		eventMouseover : function(calEvent, $event) {
		},
		eventMouseout : function(calEvent, $event) {
		},
		noEvents : function() {
		},
		data : function(start, end, callback) {
		   callback(getEventData());
		}
	});
}

function resetForm($dialogContent) {
	$dialogContent.find("input").val("");
	$dialogContent.find("textarea").val("");
}

function getEventData() {
	return {
	   events : schedule
	};
}

function showOthersOnSchedule(currentBlockId) {

	var calendar = $('#calendar');
	
	$.each(settings.blocks, function(otherBlockId, otherBlock) {
		if (currentBlockId != otherBlockId && otherBlock.enabled == "true" && otherBlock.type == "scheduled") {
			
			$.each(otherBlock.schedule, function(i, otherSchedEntry) {

				var actualDate = new Date();
				var fakeDate, fakeDayStartOffset, fakeDayEndOffset;

				var splitStart = otherSchedEntry.startTime.split(",");
				var splitEnd = otherSchedEntry.endTime.split(",");
				var formattedStart, formattedEnd;

				if (settings.settings.weekStart == "monday") {

					fakeDayStartOffset = (parseInt(splitStart[0]) == 0) ? 6 : parseInt(splitStart[0]) - 1;
					if (parseInt(splitEnd[0]) == 1 && parseInt(splitEnd[1]) == 0 && parseInt(splitEnd[2]) == 0) {
						fakeDayEndOffset = 7;
					} else {
						fakeDayEndOffset = (parseInt(splitEnd[0]) == 0) ? 6 : parseInt(splitEnd[0]) - 1;
					}
					fakeDate = new Date(2020,6,13,actualDate.getHours(),actualDate.getMinutes(),actualDate.getSeconds());

				} else if (settings.settings.weekStart == "saturday") {

					fakeDayStartOffset = (parseInt(splitStart[0]) == 6) ? 0 : parseInt(splitStart[0]) + 1;
					if (parseInt(splitEnd[0]) == 6 && parseInt(splitEnd[1]) == 0 && parseInt(splitEnd[2]) == 0) {
						fakeDayEndOffset = 7;
					} else {
						fakeDayEndOffset = (parseInt(splitEnd[0]) == 6) ? 0 : parseInt(splitEnd[0]) + 1;
						if (fakeDayEndOffset == 8) {
							fakeDayEndOffset = 1;
						}
					}
					fakeDate = new Date(2020,6,11,actualDate.getHours(),actualDate.getMinutes(),actualDate.getSeconds());

				} else {

					fakeDayStartOffset = parseInt(splitStart[0]);
					if (parseInt(splitEnd[0]) == 0 && parseInt(splitEnd[1]) == 0 && parseInt(splitEnd[2]) == 0) {
						fakeDayEndOffset = 7;
					} else {
						fakeDayEndOffset = parseInt(splitEnd[0]);
					}
					fakeDate = new Date(2020,6,12,actualDate.getHours(),actualDate.getMinutes(),actualDate.getSeconds());

				}

				formattedStart = new Date(fakeDate.getTime()).addDays(fakeDayStartOffset);
				formattedStart.setHours(parseInt(splitStart[1]));
				formattedStart.setMinutes(parseInt(splitStart[2]));
				formattedStart.setSeconds(0);
				formattedStart.setMilliseconds(0);

				formattedEnd = new Date(fakeDate.getTime()).addDays(fakeDayEndOffset);
				formattedEnd.setHours(parseInt(splitEnd[1]));
				formattedEnd.setMinutes(parseInt(splitEnd[2]));
				formattedEnd.setSeconds(0);
				formattedEnd.setMilliseconds(0);
				
				var newCalEvent = {};

				var otherBlockIdDisplay = otherBlockId;
				if (otherBlockId == "Frozen Turkey" || otherBlockId.indexOf("Frozen Turkey,") == 0) {
					otherBlockIdDisplay = (otherBlockId.indexOf(",") > 0) ? otherBlockId.substring(otherBlockId.indexOf(',') + 1) : otherBlockId;
				}
				newCalEvent.id = otherBlockIdDisplay + "\\" + i.toString();
				newCalEvent.start = formattedStart;
				newCalEvent.end = formattedEnd;
				newCalEvent.blockId = otherBlockId;
				newCalEvent.break = otherSchedEntry.break;
				newCalEvent.locked = true;
				
				calendar.weekCalendar("updateEvent", newCalEvent);
			
			});
			
		}
		
	});
	
}

function hideOthersOnSchedule(currentBlockId) {
	
	var calendar = $('#calendar');
	
	$.each(settings.blocks, function(otherBlockId, otherBlock) {
		var otherBlockIdDisplay = otherBlockId;
		if (otherBlockId == "Frozen Turkey" || otherBlockId.indexOf("Frozen Turkey,") == 0) {
			otherBlockIdDisplay = (otherBlockId.indexOf(",") > 0) ? otherBlockId.substring(otherBlockId.indexOf(',') + 1) : otherBlockId;
		}
		if (otherBlockId != currentBlockId) {
			for (var i = 0; i < otherBlock.schedule.length; i++) {
				calendar.weekCalendar("removeEvent", otherBlockIdDisplay + "\\" + i.toString());
			}
		}
	});
	
}

function deleteAllEvents() {

	$.each($('#calendar .wc-cal-event'), function(calId, calItem) {
		if (!isNaN($(calItem).data('calEvent').id) && !$(calItem).data('calEvent').locked) {
			deleteEvent($(calItem).data('calEvent').id);
		}
	});

}

function deleteEvent(data) {
	
	var id;
	if (event != undefined) {
		event.stopPropagation();
	}
	if (typeof data != 'number') {
		id = $(data.parentElement.parentElement).data('calEvent').id;
	} else {
		id = data;
	}
	
	var calendar = $('#calendar');
	
	calendar.weekCalendar("removeEvent", id);
	
	var replaceIndex = 0;
	$.each(schedule, function(i, val) {	// Find id of element to delete
		if (parseInt(val.id,10) == id) {
			replaceIndex = i;
		}
	});
	
	schedule.splice(replaceIndex, 1);   // Delete entry
	
	$.each(schedule, function(i, val) { // Re-index items after deletion of an entry
		if (parseInt(val.id,10) > replaceIndex) {
			val.id = (parseInt(val.id,10) - 1).toString();
		}
	});									// Re-index calEvent items on calendar
	$.each($('.wc-cal-event'), function(i, calEvent) {
		if ($(calEvent).data('calEvent').id > replaceIndex) {
			$(calEvent).data('calEvent').id = $(calEvent).data('calEvent').id - 1;
		}
	});
	
}

function setupStartAndEndTimeFields($startTimeField, $endTimeField, calEvent, timeslotTimes) {
	$startTimeField.empty();
	$endTimeField.empty();
	timeslotTimes.forEach(function(item) {
		var startTime = item.start;
		var endTime = item.end;
		var startSelected = "";
		if (startTime.getHours() == calEvent.start.getHours() && startTime.getMinutes() == calEvent.start.getMinutes()) {
			startSelected = "selected=\"selected\"";
		}
		var endSelected = "";
		if (endTime.getHours() == calEvent.end.getHours() && endTime.getMinutes() == calEvent.end.getMinutes()) {
			endSelected = "selected=\"selected\"";
		}
		if (typeof calEvent.locked != 'undefined' && calEvent.locked == true) {
			if ((startTime.getDay() == calEvent.lockedStart.getDay() && startTime.getHours() < calEvent.lockedStart.getHours()) || (startTime.getDay() == calEvent.lockedStart.getDay() && startTime.getHours() == calEvent.lockedStart.getHours() && startTime.getMinutes() <= calEvent.lockedStart.getMinutes())) {
				$startTimeField.append("<option value=\"" + startTime + "\" " + startSelected + ">" + item.startFormatted + "</option>");
			}
			if ((endTime.getDay() > calEvent.lockedEnd.getDay()) || (endTime.getDay() == calEvent.lockedEnd.getDay() && endTime.getHours() > calEvent.lockedEnd.getHours()) || (endTime.getDay() == calEvent.lockedEnd.getDay() && endTime.getHours() == calEvent.lockedEnd.getHours() && endTime.getMinutes() >= calEvent.lockedEnd.getMinutes())) {
				$endTimeField.append("<option value=\"" + endTime + "\" " + endSelected + ">" + item.endFormatted + "</option>");
			}
		} else {
			$startTimeField.append("<option value=\"" + startTime + "\" " + startSelected + ">" + item.startFormatted + "</option>");
			$endTimeField.append("<option value=\"" + endTime + "\" " + endSelected + ">" + item.endFormatted + "</option>");
		}
		$timestampsOfOptions.start[item.startFormatted] = startTime.getTime();
		$timestampsOfOptions.end[item.endFormatted] = endTime.getTime();
	});
	$endTimeOptions = $endTimeField.find("option");
	$startTimeField.trigger("change");
}

var currentlyAddingFullDayBlock = false;
var $endTimeField = $("select[name='end']");
var $endTimeOptions = $endTimeField.find("option");
var $timestampsOfOptions = {start:[],end:[]};

$("select[name='start']").change(function() {
	var startTime = $timestampsOfOptions.start[$(this).find(":selected").text()];
	var currentEndTime = $endTimeField.find("option:selected").val();
	$endTimeField.html(
			$endTimeOptions.filter(function() {
			   return startTime < $timestampsOfOptions.end[$(this).text()];
			})
	);
	var endTimeSelected = false;
	$endTimeField.find("option").each(function() {
	   if ($(this).val() === currentEndTime) {
			$(this).attr("selected", "selected");
			endTimeSelected = true;
			return false;
	   }
	});
});

function removeDate(inputString) {
    var parts = inputString.split(',');
    parts.splice(4, 7); // both randomText and delay breaks have dates starting at index 5, but also remove status (index 4) for 1+6 spaces
    return parts.join(',');
}

function zeroDate(inputString) {
    var parts = inputString.split(',');
    parts[4] = "none";
    parts[5] = "0";
    parts[6] = "0";
    parts[7] = "0";
    parts[8] = "0";
    parts[9] = "0";
    parts[10] = "0";
    return parts.join(',');
}
