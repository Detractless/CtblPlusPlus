/**
 * @file AppState.js
 * @layer Store
 * @description Centralized global state for Cold Turkey Blocker UI.
 */

var settings; // Populated later when DOM is ready

export const AppState = {
  allowances: {},
  queuedDelays: [],
  configuredQueuedDelays: [],
  schedule: [],
  lockedBlockList: [],
  unlockedBlocks: [],
  passwordChecked: false,
  passwordStrict: [],
  lastRefreshedMinute: moment().minutes(),
  specialSeconds: [],
  firstResizeEvent: true,
  scheduleModalOpenedOnDay: new Date().getDay(),
  ignoreChartDateChange: false,
  statsBlockedWebStart: moment().startOf("week"),
  statsBlockedWebEnd: moment().endOf("week"),
  statsBlockedAppStart: moment().startOf("week"),
  statsBlockedAppEnd: moment().endOf("week"),
  statsWebStart: moment().startOf("week"),
  statsWebEnd: moment().endOf("week"),
  statsAppStart: moment().startOf("week"),
  statsAppEnd: moment().endOf("week")
};
