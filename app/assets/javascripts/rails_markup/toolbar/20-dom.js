  Object.assign(RailsMarkupToolbar, {
    _injectDOM() {
      const root = document.createElement("div");
      root.id = "rm-toolbar-root";

      const accentBg = this._accentBg();
      const accentBgHover = this._accentBgHover();
      const accentLight = this._accentLight();
      const accentText = this._accentText();

      // Position: bl (bottom-left), br (bottom-right), tl (top-left), tr (top-right)
      const posMap = { bl: "bottom:24px;left:24px;", br: "bottom:24px;right:24px;", tl: "top:24px;left:24px;", tr: "top:24px;right:24px;" };
      const fabPos = posMap[this.position] || posMap.bl;

      // Size: default (48px), compact (40px), slim (32px)
      const sizeMap = { "default": { dim: 48, icon: 20 }, compact: { dim: 40, icon: 18 }, slim: { dim: 32, icon: 16 } };
      const fabSize = sizeMap[this.size] || sizeMap["default"];

      // Panel offset matches FAB position
      const isRight = this.position === "br" || this.position === "tr";
      const isTop = this.position === "tl" || this.position === "tr";
      const panelToggleStyle = isRight ? `${isTop ? 'top' : 'bottom'}:24px;right:${fabSize.dim + 8 + 24}px;` : `${isTop ? 'top' : 'bottom'}:24px;left:${fabSize.dim + 8 + 24}px;`;
      const panelStyle = isRight
        ? `${isTop ? 'top' : 'bottom'}:${fabSize.dim + 32}px;right:24px;`
        : `${isTop ? 'top' : 'bottom'}:${fabSize.dim + 32}px;left:24px;`;
      const toastStyle = isRight
        ? `${isTop ? 'top' : 'bottom'}:${fabSize.dim + 32}px;right:24px;`
        : `${isTop ? 'top' : 'bottom'}:${fabSize.dim + 32}px;left:24px;`;

      root.innerHTML = `
        <button class="rm-fab" id="rm-fab" style="${fabPos}width:${fabSize.dim}px;height:${fabSize.dim}px;background:${accentBg};color:#fff;${this.fabVisible ? "" : "display:none;"}" title="Toggle annotation mode" aria-label="Toggle annotation mode" aria-expanded="false" aria-controls="rm-panel">
          <svg viewBox="0 0 24 24" style="width:${fabSize.icon}px;height:${fabSize.icon}px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span class="rm-fab-badge" id="rm-fab-badge"></span>
        </button>
        <button class="rm-panel-toggle" id="rm-panel-toggle" style="${panelToggleStyle}" title="View annotations" aria-label="View annotations" aria-controls="rm-panel">
          <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
        </button>
        <div class="rm-toast-container" id="rm-toast-container" style="${toastStyle}"></div>
        <div class="rm-popup" id="rm-popup" role="dialog" aria-label="Add annotation" aria-modal="false">
          <div style="margin-bottom:12px">
            <p class="rm-popup-el" id="rm-popup-el"></p>
            <p class="rm-popup-text" id="rm-popup-text"></p>
          </div>
          <textarea id="rm-popup-input" rows="3" placeholder="What should change?"></textarea>
          <div style="display:flex;align-items:center;gap:8px;margin-top:12px">
            ${this._menuMarkup({ inputId: "rm-intent-select", label: "Intent", value: "change", options: this._intentOptions() })}
            ${this._menuMarkup({ inputId: "rm-severity-select", label: "Severity", value: "suggestion", options: this._severityOptions() })}
            <span class="rm-count" id="rm-char-count"></span>
          </div>
          <div class="rm-popup-actions">
            <button class="rm-btn-cancel" id="rm-btn-cancel">Cancel</button>
            <button class="rm-btn-submit" id="rm-btn-submit" style="background:${accentBg}">
              <span id="rm-submit-label">Add</span>
              <kbd>⌘↩</kbd>
            </button>
          </div>
        </div>
        <div class="rm-panel" id="rm-panel" style="${panelStyle}" role="dialog" aria-label="Annotations panel">
          <div class="rm-panel-header">
            <div style="display:flex;align-items:center;gap:8px">
              <h3>Feedback</h3>
              <span class="rm-panel-count" id="rm-panel-count" style="background:${accentLight};color:${accentText}">0</span>
            </div>
            <button class="rm-panel-close" id="rm-panel-close" aria-label="Close annotations panel">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="rm-filter-chips" id="rm-filter-chips">
            <button class="rm-chip rm-chip-active" data-filter="all" style="background:${accentBg}">All</button>
            <button class="rm-chip rm-chip-inactive" data-filter="pending">Pending</button>
            <button class="rm-chip rm-chip-inactive" data-filter="resolved">Resolved</button>
          </div>
          <div class="rm-panel-list" id="rm-panel-list"></div>
          <div class="rm-panel-footer">
            <span class="rm-status-dot" id="rm-status-dot"></span>
            <span id="rm-status-text">Offline</span>
          </div>
        </div>
      `;

      document.body.appendChild(root);
      this.root = root;
      // Pins container lives on body (not inside fixed root); scroll listener keeps them stuck to target elements
      const pinsContainer = document.createElement("div");
      pinsContainer.className = "rm-pins-container";
      pinsContainer.id = "rm-pins-container";
      document.body.appendChild(pinsContainer);
      if (!this._onResize) {
        this._onResize = this._debouncedRepositionPins(250);
        this._onScroll = this._debouncedRepositionPins(50);
        window.addEventListener("resize", this._onResize);
        window.addEventListener("scroll", this._onScroll, { passive: true });
      }
    },
  });
