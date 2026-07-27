  Object.assign(RailsMarkupToolbar, {
    _intentOptions() {
      return [
        ["fix", "Fix"],
        ["change", "Change"],
        ["question", "Question"],
        ["approve", "Approve"]
      ];
    },
    _severityOptions() {
      return [
        ["suggestion", "Suggestion"],
        ["important", "Important"],
        ["blocking", "Blocking"]
      ];
    },
    _statusOptions() {
      return [
        ["pending", "Pending"],
        ["acknowledged", "Acknowledged"],
        ["resolved", "Resolved"],
        ["dismissed", "Dismissed"]
      ];
    },
    _menuMarkup({ inputId, statusId, label, value, options, compact }) {
      const current = options.find(([v]) => v === value) || options[0];
      const currentValue = current[0];
      const currentLabel = current[1];
      const menuId = inputId ? `rm-menu-${inputId}` : `rm-menu-status-${statusId}`;
      const listId = `${menuId}-list`;
      const inputAttrs = inputId
        ? `id="${inputId}"`
        : `data-status-id="${statusId}"`;
      const optionsHtml = options.map(([v, text]) => {
        const active = v === currentValue;
        return `<button type="button" class="rm-menu-option${active ? " rm-menu-option-active" : ""}" role="option" data-menu-owner="${menuId}" data-value="${v}" aria-selected="${active ? "true" : "false"}">${text}</button>`;
      }).join("");
      return `<div class="rm-menu${compact ? " rm-menu-compact" : ""}" id="${menuId}">` +
        `<input type="hidden" ${inputAttrs} value="${currentValue}">` +
        `<button type="button" class="rm-menu-btn" aria-haspopup="listbox" aria-controls="${listId}" aria-expanded="false" title="${this._esc(label)}" aria-label="${this._esc(label)}">` +
          `<span class="rm-menu-label">${currentLabel}</span>` +
          `<svg class="rm-menu-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>` +
        `</button>` +
        `<div class="rm-menu-list${compact ? " rm-menu-list-compact" : ""}" id="${listId}" role="listbox" data-menu-owner="${menuId}" aria-label="${this._esc(label)}">${optionsHtml}</div>` +
      `</div>`;
    },
    _menuForElement(element) {
      if (!element) return null;
      const nestedMenu = element.closest?.(".rm-menu");
      if (nestedMenu) return nestedMenu;
      const ownerId = element.closest?.("[data-menu-owner]")?.dataset.menuOwner;
      return ownerId ? document.getElementById(ownerId) : null;
    },
    _menuList(menu) {
      if (!menu) return null;
      return menu.querySelector(".rm-menu-list") ||
        document.getElementById(`${menu.id}-list`);
    },
    _selectMenuOption(option) {
      const menu = this._menuForElement(option);
      if (!menu || !this.root?.contains(menu)) return;
      const value = option.dataset.value;
      const statusInput = menu.querySelector("[data-status-id]");
      const statusId = statusInput?.dataset.statusId;
      this._setMenuValue(menu, value);
      if (!statusId) return;
      const id = parseInt(statusId, 10);
      if (Number.isNaN(id)) return;
      this._changeStatus(id, value);
      this.root.querySelector(`[data-status-id="${statusId}"]`)
        ?.closest(".rm-menu")
        ?.querySelector(".rm-menu-btn")
        ?.focus();
    },
    _setMenuValue(inputOrMenu, value, restoreFocus = true) {
      if (!inputOrMenu) return;
      const menu = inputOrMenu.classList?.contains("rm-menu")
        ? inputOrMenu
        : inputOrMenu.closest?.(".rm-menu");
      const input = menu
        ? menu.querySelector('input[type="hidden"]')
        : inputOrMenu;
      if (!input) return;
      const resolvedMenu = menu || input.closest(".rm-menu");
      input.value = value;
      if (!resolvedMenu) return;
      const list = this._menuList(resolvedMenu);
      const option = list?.querySelector(`.rm-menu-option[data-value="${value}"]`);
      const label = resolvedMenu.querySelector(".rm-menu-label");
      if (label && option) label.textContent = option.textContent;
      list?.querySelectorAll(".rm-menu-option").forEach(opt => {
        const active = opt.dataset.value === value;
        opt.classList.toggle("rm-menu-option-active", active);
        opt.setAttribute("aria-selected", active ? "true" : "false");
      });
      this._closeMenu(resolvedMenu, restoreFocus);
    },
    _toggleMenu(menu) {
      const open = this._menuList(menu)?.classList.contains("rm-menu-open");
      this._closeAllMenus();
      if (!open) this._openMenu(menu);
    },
    _openMenu(menu) {
      const list = this._menuList(menu);
      const btn = menu.querySelector(".rm-menu-btn");
      if (!list || !btn) return;
      this._closeAllMenus();
      const rect = btn.getBoundingClientRect();
      const gap = 4;
      const viewportPadding = 8;
      const compactWidth = menu.classList.contains("rm-menu-compact") ? 120 : 0;
      const minimumWidth = Math.max(rect.width || 0, compactWidth);

      list._rmMenuPortalOrigin = {
        parent: list.parentNode,
        nextSibling: list.nextSibling
      };
      this.root.appendChild(list);
      list.style.pointerEvents = "auto";
      list.style.position = "fixed";
      list.style.top = "0px";
      list.style.bottom = "";
      list.style.left = "0px";
      list.style.right = "auto";
      list.style.minWidth = `${minimumWidth}px`;
      list.classList.add("rm-menu-open");
      btn.setAttribute("aria-expanded", "true");

      const menuWidth = Math.max(list.offsetWidth || 0, rect.width || 0, compactWidth);
      const menuHeight = list.offsetHeight || 0;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openUp = menuHeight > spaceBelow && spaceAbove > spaceBelow;
      const preferredLeft = compactWidth ? rect.right - menuWidth : rect.left;
      const maxLeft = Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding);
      const left = Math.min(Math.max(viewportPadding, preferredLeft), maxLeft);

      list.style.position = "fixed";
      list.style.top = openUp ? "" : `${rect.bottom + gap}px`;
      list.style.bottom = openUp ? `${window.innerHeight - rect.top + gap}px` : "";
      list.style.left = `${left}px`;
      list.style.right = "auto";
      list.style.minWidth = `${minimumWidth}px`;
      const availableHeight = Math.max(0, (openUp ? spaceAbove : spaceBelow) - gap);
      list.style.maxHeight = availableHeight ? `${availableHeight}px` : "";
      list.style.overflowY = menuHeight > availableHeight && availableHeight > 0 ? "auto" : "";

      const selected = list.querySelector('.rm-menu-option[aria-selected="true"]') ||
        list.querySelector(".rm-menu-option");
      selected?.focus();
    },
    _closeMenu(menu, restoreFocus = false) {
      const list = this._menuList(menu);
      const btn = menu.querySelector(".rm-menu-btn");
      if (list) {
        list.classList.remove("rm-menu-open");
        ["position", "top", "bottom", "left", "right", "minWidth", "maxHeight", "overflowY", "pointerEvents"]
          .forEach(property => { list.style[property] = ""; });
        const origin = list._rmMenuPortalOrigin;
        if (origin?.parent) {
          if (origin.nextSibling?.parentNode === origin.parent) {
            origin.parent.insertBefore(list, origin.nextSibling);
          } else {
            origin.parent.appendChild(list);
          }
        }
        delete list._rmMenuPortalOrigin;
      }
      if (btn) btn.setAttribute("aria-expanded", "false");
      if (restoreFocus) btn?.focus();
    },
    _closeAllMenus() {
      if (!this.root) return;
      this.root.querySelectorAll(".rm-menu").forEach(menu => this._closeMenu(menu));
    },
  });
