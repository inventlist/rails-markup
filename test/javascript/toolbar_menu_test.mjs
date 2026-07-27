import assert from "node:assert/strict";
import test from "node:test";

import { createToolbarHarness } from "./support/toolbar_harness.mjs";

function injectToolbar(harness) {
  harness.toolbar._injectStyles();
  harness.toolbar._injectDOM();
  harness.toolbar._bindEvents();
}

function keydown(window, target, key) {
  const event = new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

function serverBackedAnnotation() {
  return {
    id: 7,
    clientId: "11111111-1111-4111-8111-111111111111",
    serverId: 42,
    serverUpdatedAt: "2026-07-20T10:00:00Z",
    syncState: "synced",
    dirtyFields: [],
    revision: 3,
    comment: "Before",
    intent: "change",
    severity: "suggestion",
    element: { selector: "main", nearbyText: "Welcome" },
    selectedText: null,
    screenshot: null,
    url: "https://example.test/products",
    pathname: "/products",
    pageUrl: "/products",
    timestamp: "2026-07-20T09:00:00Z",
    status: "acknowledged",
    thread: [],
    metadata: { tool: "toolbar" }
  };
}

test("keyboard navigation changes the hidden intent value and visible label", (t) => {
  const harness = createToolbarHarness();
  t.after(() => harness.reset());
  injectToolbar(harness);

  const input = harness.window.document.getElementById("rm-intent-select");
  const menu = input.closest(".rm-menu");
  const trigger = menu.querySelector(".rm-menu-btn");
  const list = menu.querySelector(".rm-menu-list");

  trigger.click();

  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  assert.ok(list.parentElement === harness.window.document.getElementById("rm-toolbar-root"));
  assert.equal(menu.contains(list), false);
  assert.equal(list.closest(".rm-popup"), null);
  assert.equal(harness.window.document.activeElement.dataset.value, "change");

  keydown(harness.window, harness.window.document.activeElement, "ArrowDown");
  assert.equal(harness.window.document.activeElement.dataset.value, "question");
  keydown(harness.window, harness.window.document.activeElement, "Enter");

  assert.equal(input.value, "question");
  assert.equal(menu.querySelector(".rm-menu-label").textContent, "Question");
  assert.equal(list.classList.contains("rm-menu-open"), false);
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  assert.ok(harness.window.document.activeElement === trigger);
  assert.ok(list.parentElement === menu);
});

test("ArrowUp and Home/End navigate a portaled menu and Space selects", (t) => {
  const harness = createToolbarHarness();
  t.after(() => harness.reset());
  injectToolbar(harness);

  const input = harness.window.document.getElementById("rm-intent-select");
  const menu = input.closest(".rm-menu");
  const trigger = menu.querySelector(".rm-menu-btn");
  const list = menu.querySelector(".rm-menu-list");

  trigger.click();
  keydown(harness.window, harness.window.document.activeElement, "ArrowUp");
  assert.equal(harness.window.document.activeElement.dataset.value, "fix");
  keydown(harness.window, harness.window.document.activeElement, "ArrowUp");
  assert.equal(harness.window.document.activeElement.dataset.value, "approve");
  keydown(harness.window, harness.window.document.activeElement, "Home");
  assert.equal(harness.window.document.activeElement.dataset.value, "fix");
  keydown(harness.window, harness.window.document.activeElement, "End");
  assert.equal(harness.window.document.activeElement.dataset.value, "approve");
  keydown(harness.window, harness.window.document.activeElement, " ");

  assert.equal(input.value, "approve");
  assert.equal(menu.querySelector(".rm-menu-label").textContent, "Approve");
  assert.equal(list.classList.contains("rm-menu-open"), false);
  assert.ok(list.parentElement === menu);
  assert.ok(harness.window.document.activeElement === trigger);
});

test("Escape closes an open menu and restores focus to its trigger", (t) => {
  const harness = createToolbarHarness();
  t.after(() => harness.reset());
  injectToolbar(harness);
  harness.toolbar.toggleMode();

  const menu = harness.window.document.getElementById("rm-severity-select").closest(".rm-menu");
  const trigger = menu.querySelector(".rm-menu-btn");
  trigger.click();
  assert.notEqual(harness.window.document.activeElement, trigger);

  keydown(harness.window, harness.window.document.activeElement, "Escape");

  assert.equal(menu.querySelector(".rm-menu-list").classList.contains("rm-menu-open"), false);
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  assert.ok(harness.window.document.activeElement === trigger);
  assert.equal(harness.toolbar.active, true);
});

test("Escape closes a panel menu while annotation mode is inactive", (t) => {
  const annotation = serverBackedAnnotation();
  const harness = createToolbarHarness({
    url: "https://example.test/products",
    storage: { "rm-annotations:%2Ffeedback%2Fapi": { annotations: [annotation], nextId: 8, outbox: {} } }
  });
  t.after(() => harness.reset());
  injectToolbar(harness);
  harness.toolbar._loadFromStorage();

  const menu = harness.window.document.querySelector('[data-status-id="7"]').closest(".rm-menu");
  const trigger = menu.querySelector(".rm-menu-btn");
  trigger.click();
  assert.equal(harness.toolbar.active, false);

  keydown(harness.window, harness.window.document.activeElement, "Escape");

  assert.equal(menu.querySelector(".rm-menu-list").classList.contains("rm-menu-open"), false);
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  assert.ok(harness.window.document.activeElement === trigger);
  assert.equal(harness.toolbar.active, false);
});

test("Escape still closes the popup and deactivates mode without swallowing inactive host keys", async (t) => {
  const harness = createToolbarHarness();
  t.after(() => harness.reset());
  injectToolbar(harness);
  let hostKeydowns = 0;
  harness.window.addEventListener("keydown", () => { hostKeydowns += 1; });

  const inactiveEscape = keydown(harness.window, harness.window.document.body, "Escape");
  assert.equal(inactiveEscape.defaultPrevented, false);
  assert.equal(hostKeydowns, 1);

  const popup = harness.window.document.getElementById("rm-popup");
  popup.style.display = "block";
  const popupEscape = keydown(harness.window, harness.window.document.body, "Escape");
  assert.equal(popupEscape.defaultPrevented, true);
  assert.equal(hostKeydowns, 1);
  await harness.advanceTimersBy(150);
  assert.equal(popup.style.display, "none");

  harness.toolbar.toggleMode();
  const modeEscape = keydown(harness.window, harness.window.document.body, "Escape");
  assert.equal(modeEscape.defaultPrevented, true);
  assert.equal(hostKeydowns, 1);
  assert.equal(harness.toolbar.active, false);
});

test("compact status menu updates its hidden value and visible label", (t) => {
  const annotation = serverBackedAnnotation();
  const harness = createToolbarHarness({
    url: "https://example.test/products",
    storage: { "rm-annotations:%2Ffeedback%2Fapi": { annotations: [annotation], nextId: 8, outbox: {} } }
  });
  t.after(() => harness.reset());
  injectToolbar(harness);
  harness.toolbar._loadFromStorage();

  const input = harness.window.document.querySelector('[data-status-id="7"]');
  const menu = input.closest(".rm-menu");
  const list = menu.querySelector(".rm-menu-list");
  menu.querySelector(".rm-menu-btn").click();
  list.querySelector('[data-value="resolved"]').click();

  assert.equal(input.value, "resolved");
  assert.equal(menu.querySelector(".rm-menu-label").textContent, "Resolved");
  assert.equal(harness.toolbar.annotations[0].status, "resolved");
});

test("open menus use fixed viewport positioning and close on panel scroll", (t) => {
  const annotation = serverBackedAnnotation();
  const harness = createToolbarHarness({
    url: "https://example.test/products",
    storage: { "rm-annotations:%2Ffeedback%2Fapi": { annotations: [annotation], nextId: 8, outbox: {} } }
  });
  t.after(() => harness.reset());
  injectToolbar(harness);
  harness.toolbar._loadFromStorage();

  const menu = harness.window.document.querySelector('[data-status-id="7"]').closest(".rm-menu");
  const trigger = menu.querySelector(".rm-menu-btn");
  const list = menu.querySelector(".rm-menu-list");
  trigger.getBoundingClientRect = () => ({ top: 100, right: 220, bottom: 124, left: 120, width: 100, height: 24 });
  Object.defineProperty(list, "offsetHeight", { configurable: true, value: 120 });

  trigger.click();

  assert.ok(list.parentElement === harness.window.document.getElementById("rm-toolbar-root"));
  assert.equal(menu.contains(list), false);
  assert.equal(list.closest(".rm-panel"), null);
  assert.equal(list.style.position, "fixed");
  assert.equal(list.style.top, "128px");
  assert.equal(list.style.left, "100px");
  assert.equal(list.style.minWidth, "120px");
  assert.equal(list.style.pointerEvents, "auto");

  harness.window.document.getElementById("rm-panel-list")
    .dispatchEvent(new harness.window.Event("scroll"));

  assert.equal(list.classList.contains("rm-menu-open"), false);
  assert.ok(list.parentElement === menu);
  assert.equal(list.style.position, "");
  assert.equal(list.style.top, "");
  assert.equal(list.style.left, "");
  assert.equal(list.style.pointerEvents, "");

  trigger.click();
  harness.window.dispatchEvent(new harness.window.Event("resize"));
  assert.equal(list.classList.contains("rm-menu-open"), false);
  assert.ok(list.parentElement === menu);
  assert.equal(list.style.position, "");
});
