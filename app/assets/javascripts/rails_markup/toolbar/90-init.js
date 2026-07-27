  Object.assign(RailsMarkupToolbar, {
    init(opts = {}) {
      const previousPathname = this._currentPathname;
      const previousPageUrl = this._currentPageUrl;
      const currentPageUrl = this._pageUrl();
      this.endpoint = opts.endpoint || "/feedback/api";
      this.accent = opts.accent || "indigo";
      this.position = opts.position || "bl";
      this.size = opts.size || "default";
      this.fabVisible = opts.fabVisible !== false;
      this.enableScreenshots = opts.enableScreenshots !== false;
      this.legacyStorageEndpoint = opts.legacyStorageEndpoint || this.legacyStorageEndpoint;
      this.healthIntervalMs = (opts.healthInterval || 60) * 1000;

      if (document.getElementById("rm-toolbar-root")) {
        if (currentPageUrl !== this._currentPageUrl) this._onTurboNavigate();
        return;
      }

      if (previousPathname && previousPathname !== window.location.pathname) this._deactivateMode();
      if (previousPageUrl && previousPageUrl !== currentPageUrl && previousPathname === window.location.pathname) this._deactivateMode();
      this._currentPathname = window.location.pathname;
      this._currentPageUrl = currentPageUrl;
      this._injectStyles();
      this._injectDOM();
      this._bindEvents();
      this._loadFromStorage();
      this._checkHealth();
      if (!this.healthInterval) this.healthInterval = setInterval(() => this._checkHealth(), this.healthIntervalMs);
      if (!this._boundVisibilityChange) {
        this._boundVisibilityChange = () => this._onVisibilityChange();
        document.addEventListener("visibilitychange", this._boundVisibilityChange);
      }
      if (!this._boundOnline) {
        this._boundOnline = () => this._onOnline();
        window.addEventListener("online", this._boundOnline);
      }
      this._renderPins();
      this._updateCount();
      if (previousPageUrl && previousPageUrl !== this._currentPageUrl && this.serverOnline) this._initSession();
    },
    destroy() {
      this._closeAllMenus();
      this._deactivateMode();
      if (this.sseSource) { this.sseSource.close(); this.sseSource = null; }
      if (this.healthInterval) { clearInterval(this.healthInterval); this.healthInterval = null; }
      if (this._outboxFlushTimer) { clearTimeout(this._outboxFlushTimer); this._outboxFlushTimer = null; }
      if (this._syncRetryTimer) { clearTimeout(this._syncRetryTimer); this._syncRetryTimer = null; }
      this._outboxFlushScheduled = false;
      if (this._boundVisibilityChange) {
        document.removeEventListener("visibilitychange", this._boundVisibilityChange);
        this._boundVisibilityChange = null;
      }
      if (this._boundOnline) {
        window.removeEventListener("online", this._boundOnline);
        this._boundOnline = null;
      }
      if (this._boundKeyDown) {
        document.removeEventListener("keydown", this._boundKeyDown, true);
        this._boundKeyDown = null;
      }
      if (this._onResize) window.removeEventListener("resize", this._onResize);
      if (this._onScroll) window.removeEventListener("scroll", this._onScroll);
      if (this._boundTurboFrame) {
        document.removeEventListener("turbo:frame-render", this._boundTurboFrame);
        this._boundTurboFrame = null;
      }
      if (this._boundMenuDocClick) {
        document.removeEventListener("click", this._boundMenuDocClick);
        this._boundMenuDocClick = null;
      }
      if (this._boundMenuViewportChange) {
        document.getElementById("rm-panel-list")
          ?.removeEventListener("scroll", this._boundMenuViewportChange);
        window.removeEventListener("resize", this._boundMenuViewportChange);
        window.removeEventListener("scroll", this._boundMenuViewportChange);
        this._boundMenuViewportChange = null;
      }
      this._onResize = null;
      this._onScroll = null;
      const root = document.getElementById("rm-toolbar-root");
      if (root) root.remove();
      const pins = document.getElementById("rm-pins-container");
      if (pins) pins.remove();
      const styles = document.getElementById("rm-toolbar-styles");
      if (styles) styles.remove();
    },
  });

  global.RailsMarkupToolbar = RailsMarkupToolbar;
})(window);
