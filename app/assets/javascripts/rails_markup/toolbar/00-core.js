/**
 * Rails Markup Toolbar — self-contained annotation UI
 * No dependencies (no Stimulus, no importmap). Works in any Rails app.
 *
 * Usage: include via <script> tag, then call:
 *   RailsMarkupToolbar.init({ endpoint: "/feedback/api", accent: "indigo" })
 */
(function(global) {
  "use strict";

  if (global.RailsMarkupToolbar) return;

  const RailsMarkupToolbar = {
    // State
    annotations: [],
    outbox: {},
    legacyMigrations: {},
    nextId: 1,
    active: false,
    serverOnline: false,
    sessionId: null,
    sseSource: null,
    healthInterval: null,
    hoveredElement: null,
    selectedText: null,
    clickedElement: null,
    activeFilter: "all",
    editingId: null,
    _currentScreenshot: null,
    _storageError: null,
    _outboxFlushScheduled: false,
    _outboxFlushTimer: null,
    _flushPromise: null,
    _flushAfterPullPromise: null,
    _healthPromise: null,
    _pullPromise: null,
    _pullPageUrl: null,
    _pullNeeded: true,
    _syncRetryTimer: null,
    _syncRetryAttempt: 0,
    _syncRetryDelay: 0,
    _syncBaseRetryDelay: 1000,
    _syncMaxRetryDelay: 30000,
    _syncMalformedLimit: 3,
    _syncUnavailable: null,
    legacyStorageEndpoint: null,

    // Drawing state
    drawingMode: null,      // null | "arrow" | "rect" | "highlight"
    drawingCanvas: null,
    drawingCtx: null,
    drawingStart: null,
    drawingHistory: [],
    _screenshotImg: null,

    // Config
    endpoint: "/feedback/api",
    accent: "indigo",
    position: "bl",
    size: "default",
    fabVisible: true,
    enableScreenshots: true,

    // DOM refs (set in init)
    root: null,
    _currentPathname: null,
    _currentPageUrl: null
  };
