# CTBL++ Frontend Code Review

**Scope:** `Raw/` source tree (pre-bundle)  
**Stack:** Vanilla JS (ES modules) · jQuery · Bootstrap 3 · jQuery UI  
**Bridge:** WebView2 · Local HTTP server on `:58123`  
**Date:** 2026-07-05

---

## At a Glance

| Area | Signal | Key Issue |
|------|--------|-----------|
| DOM Manipulation | Mixed | Consistent jQuery; `innerHTML +=` in TemplateLoader; DOM-as-state for sort order |
| Event Handling | Mostly OK | Delegated events correct; raw `window`/`document` binds in `app.js` never cleaned up |
| State Management | Workable | Two-tier design sound; composite-string unlock keys and stale stats dates are fragile |
| CSS Organization | Needs Work | `Toggle.css` fully duplicated; no color tokens; hardcoded magic values everywhere |
| Module Structure | Mixed | Good component folders; `blockStateCalculator` and `SecurityModal` are god files; `String.prototype` mutation |
| WebView2 Bridge | Fragile | Four distinct communication channels; JSONP mutations via GET; inconsistent encoding |
| Accessibility | Gaps | No `<nav>`, no `aria-current`, close button hidden from all users, no live regions |
| Scalability | Watch it | Full DOM teardown every second; 200-line function run per block per tick; manual XSS guard |

---

## 01 — DOM Manipulation

### ✅ Good: jQuery used consistently — no framework mixing

Every DOM operation goes through jQuery. There is no mixing of `document.createElement`, `innerHTML =`, and `$.append()` at the same level. Delegated events and empty-then-repopulate are used uniformly across page components. This is the right call for a codebase of this size.

---

### ⚠️ Medium: `TemplateLoader.appendComponentSync` uses `innerHTML +=`

**File:** `utils/TemplateLoader.js`

Each call to `appendComponentSync` does `el.innerHTML += newContent`. This forces the browser to serialize the existing DOM subtree to a string, concatenate, and then re-parse the whole thing. With 6 consecutive appends during startup, the existing HTML is re-parsed 5 unnecessary times. Any event listeners attached to existing child elements are also destroyed and recreated.

**Fix:** Use `insertAdjacentHTML('beforeend', responseText)` instead, which does not re-parse existing content:

```js
// Before
el.innerHTML += responseText;

// After
el.insertAdjacentHTML('beforeend', responseText);
```

---

### ⚠️ Medium: `BlockCard.js` — 600-character string template, unmaintainable at 2×

**File:** `components/BlockCard/BlockCard.js`

`BlockCard` is a single `return '<div...>'` statement with the entire card HTML as a concatenated string. Attributes are escaped manually (four separate `.replace()` chains). Adding a new column, a new data attribute, or fixing a typo means editing a 600-character character soup.

**Fix:** A tagged template literal helper keeps the same vanilla approach while making the structure readable:

```js
function html(strings, ...vals) {
  return strings.reduce((acc, s, i) => acc + s + (vals[i] ?? ''), '');
}

// Usage:
return html`
  <div class="block-card ${activeClass}">
    <a class="list-link" data-blockname="${escaped}">${displayName}</a>
  </div>
`;
```

HTML encoding can be centralized into the helper instead of scattered across each interpolation site.

---

### 🔵 Low: DOM used as state for sort order

**File:** `components/BlockCard/BlockCard.js`, `pages/BlocksPage/BlocksPage.js`

`BlockCard` writes `data-alphabeticalOrder` onto each card element. `updateBlocks` then sorts on the jQuery collection of rendered strings — sorting HTML strings by their leading data attribute. The sort cannot happen until the HTML is built, and changing the sort logic requires understanding the string format of the attribute.

**Fix:** Sort the data first, then render. The `settings.blocks` keys are available before rendering. Build the sorted array of block names, iterate it, then call `BlockCard` per item. No data attribute needed.

---

## 02 — Event Handling

### ✅ Good: Delegated events with `.off().on()` prevent duplicate handlers

**File:** `pages/BlocksPage/BlocksPage.js`

`initBlocksPageEvents()` binds all click handlers on the stable container `#page-blocks-content`, not on the dynamically-generated cards. Each bind is preceded by `.off()`. This correctly survives repeated calls to `updateBlocks()` without accumulating duplicate handlers. This pattern should be the template for all page-level event setup.

---

### ⚠️ Medium: Six raw `window`/`document` bindings in `app.js` with no teardown

**File:** `app.js`

Bindings added at startup with no cleanup path:
- `$(document).keydown`
- `$(window).bind("mousewheel DOMMouseScroll")`
- `$(window).bind("mousedown")`
- `$(document).on("contextmenu")`
- `$(".no-typing").bind("keydown")`
- `$(window).resize`

The `.no-typing` bind runs before the DOM is confirmed populated (templates load synchronously, but the bind happens in document.ready — the ordering is implicit).

**Fix:** Group in an `initGlobalEvents()` function. Use namespaced events (`"keydown.ctbl"`) so they can be selectively removed:

```js
$(document).on('keydown.ctbl', function(e) { ... });
```

---

### 🔵 Low: Polling service runs every 1 s with no back-pressure or teardown

**File:** `services/pollingService.js`

`window.setInterval(fn, 1000)` — no handle stored, interval can never be stopped. Each tick calls `updateOverview()` unconditionally plus the active page update. If the backend is briefly unavailable, the interval keeps firing and queueing network requests.

**Fix:** Store the interval handle in `AppState`. Add a guard flag so that if the previous tick's update hasn't finished, the current tick is skipped.

---

### 🔴 High: Inline `onclick` in sidebar HTML calls globals that must exist at parse time

**File:** `components/Sidebar/Sidebar.html`

Buttons like `onclick="showUpgradeModal();"`, `onclick="showExtensionInstall()"` evaluate against `window` at click time. The functions are assigned to `window.*` in `app.js` after the bundle runs. If the bundle errors before those assignments, every sidebar button throws with no visible feedback.

**Fix:** Remove inline handlers. After `initRouter()`, bind them in JS:

```js
$('#sidebar-button-upgrade').on('click', showUpgradeModal);
$('#sidebar-button-extensions').on('click', () => {
  settings.additional.forceExtensionInstall = 'true';
  showExtensionInstall();
});
```

---

## 03 — State Management

### ✅ Good: Two-tier architecture (`settings` / `AppState`) is the right design

Separating persistent configuration (`window.settings`, owned by C#) from transient UI state (`AppState`, owned by the frontend) is the correct split. `AppState` holding `unlockedBlocks`, `passwordChecked`, and stats date ranges prevents those from accidentally being serialized into the C# save payload.

---

### ⚠️ Medium: Unlock state stored as composite string keys — silent failure on format change

**File:** `components/SecurityModal/SecurityModal.js`, `pages/BlocksPage/BlocksPage.js`

`AppState.unlockedBlocks` stores entries as `"blockName\\lockType\\randomTextLength\\password"`. Membership is checked by constructing the same key inline at every call site (at least three independent sites). If a block name contains a backslash, the key silently fails to match.

**Fix:** Encapsulate in two functions:

```js
function makeUnlockKey(name, block) {
  return [name, block.lock, block.randomTextLength, block.password].join('\x00');
}
function isUnlocked(name, block) {
  return AppState.unlockedBlocks.includes(makeUnlockKey(name, block));
}
```

---

### ⚠️ Medium: Stats date ranges initialized once at module load, never refreshed

**File:** `store/AppState.js`

Eight Moment.js date ranges are initialized to `moment().startOf("week")` when the module is first imported. If the app is open at 11:59 PM Sunday and the user checks stats after midnight, these ranges are one week stale with no indication.

**Fix:** Remove the initializers from the `AppState` literal. Initialize lazily inside `initStatsEvents()`, and refresh when the user navigates to the Stats page.

---

### 🔵 Low: `Object.defineProperty` bridge is opaque and non-writable

**File:** `app.js`

```js
Object.defineProperty(window, 'settings', {
  get: () => AppState.settings,
  set: e => AppState.settings = e
});
```

Clever — C#'s `ForceSettingsUpdate` writes `window.settings` and it propagates into `AppState`. But it is completely undocumented, and the property is non-configurable by default. Any future attempt to override it will silently fail.

**Fix:** Add a comment explaining the chain: why `window.settings` is used instead of `AppState.settings` directly, and how C# triggers `ForceSettingsUpdate` which writes to this property.

---

## 04 — CSS Organization

### 🔴 High: `Toggle.css` is entirely duplicated — every rule appears twice

**File:** `components/Toggle/Toggle.css`

The file is 103 lines, then the exact same 103 lines repeated verbatim, including block comments. `Modal.css` has the same problem for the `.ui-dialog-titlebar`, `.ui-widget-overlay`, and `.noTitleModal` rule groups. The second copy silently overrides (or reinforces) the first — a future edit to only the first copy has no effect.

**Fix:** Delete the duplicate block from both files. Diff the two halves, confirm they are identical, remove one.

---

### 🔴 High: No color tokens — hardcoded hex values scattered across all files

**Files:** `components/Toggle/Toggle.css` and others

The active-green (`#65a30d`) appears in `Toggle.css` seven times across checked, disabled, and hover states. The near-black (`#27272A`) appears four times. Theme files (`dark.css`, `light.css`) exist but component files ignore them and use raw hex instead.

**Fix:** Define custom properties on `:root` and reference them in component CSS:

```css
:root {
  --color-active:        #65a30d;
  --color-active-hover:  #57801e;
  --color-danger:        #ef4444;
  --color-ink:           #27272A;
  --color-surface:       #fafafa;
}
```

This is the single highest-leverage CSS change — it unlocks consistent theming with no new tooling.

---

### ⚠️ Medium: `!important` used for standard spacing overrides, not as a last resort

**File:** `components/BlockCard/BlockCard.css`

```css
.block-card {
  margin-bottom: 15px !important;
  margin-top: 15px !important;
  margin-left: 0px !important;
  margin-right: 0px !important;
}
```

These fight Bootstrap's `.form-group` margin. Every `!important` in a component file is a specificity conflict with vendor CSS that will worsen as new components are added.

**Fix:** Scope the Bootstrap override:

```css
.blocks-list .block-card { margin: 15px 0; }
```

This beats Bootstrap's `.form-group` at equal specificity via the parent selector, no `!important` needed.

---

### 🔵 Low: IE8 rules and manual cache-busting strings

**Files:** `layouts/MainLayout/MainLayout.css`, `index.html`

`MainLayout.css` contains a `.ie8` block (WebView2 is Chromium — this rule is dead). `index.html` has `?v=2` appended to several CSS links as a manual cache-buster that will not be incremented consistently.

**Fix:** Remove the IE8 block. For cache-busting, rely on the bundler to inject content hashes.

---

## 05 — JS Module Structure

### ✅ Good: Component-folder structure is clear and consistent

Every component lives in its own folder with a co-located `.js` and `.css`. Pages, layouts, services, utils, and the store are in clearly named top-level directories. The `lockTypes` registry pattern is a clean extension point — adding a new lock type means creating one file and calling `registerLockType()`. No circular dependencies were found at the module level.

---

### 🔴 High: `String.prototype` mutated in four places — breaks any library that relies on native behavior

**File:** `utils/formatString.js`

```js
String.prototype.trimEnd = function() { ... };
String.prototype.normalizeOnlyHiddenChars = function() { ... };
String.prototype.normalizePassword = function() { ... };
String.prototype.normalizeCustomText = function() { ... };
```

The `trimEnd` override replaces the native ES2019 method. Any vendor library (jQuery, Moment) that calls `.trimEnd()` on a string will silently get this replacement. A corner-case difference in behavior will surface inside third-party code with no traceable cause.

**Fix:** Remove all four prototype additions. Convert to named utility functions:

```js
// Before:  someString.normalizePassword()
// After:   normalizePassword(someString)
export function normalizePassword(s) {
  return s.replace(...).replace(...);
}
```

All call sites are within this codebase and are easily updated.

---

### 🔴 High: `shortenOverviewBlockName` references three undeclared variables — live ReferenceError

**File:** `utils/formatString.js`

```js
export function shortenOverviewBlockName(e) {
  var u = Math.floor(width / 10) - prefix.length - suffix.length;
  return u > 3 ? prefix + e + suffix : prefix + "This Block" + suffix;
}
```

`width`, `prefix`, and `suffix` are not parameters, not imports, and not declared anywhere in the file. This throws `ReferenceError: width is not defined` unless called from a context where those names happen to exist as globals. This is either dead code or a bug masked by implicit globals.

**Fix:** If used, add the three variables as parameters: `shortenOverviewBlockName(name, width, prefix, suffix)`. If dead code, delete it.

---

### ⚠️ Medium: `blockStateCalculator.js` and `SecurityModal.js` are god files

**Files:** `utils/blockStateCalculator.js`, `components/SecurityModal/SecurityModal.js`

`calculateBlockState` is a single 200+ line function that imports from 15 modules, computes lock state, determines display text, decides which HTML strings to use for the toggle and autostart button, and handles 10+ distinct lock type branches inline.

`SecurityModal.js` owns: the password dialog UI, the lock/unlock action dispatch table (`executeAction`), the settings password flow, the block password flow, and three separate confirmation dialogs.

**Fix:** Split `calculateBlockState` into a pure state-computation function and a separate template layer. Move `executeAction` and `requestUnlock` into a `lockActionDispatcher.js`; leave only dialog UI in `SecurityModal.js`.

---

### ⚠️ Medium: ~20 functions pinned to `window` for C# callbacks

**File:** `app.js`

`window.save`, `window.ForceSettingsUpdate`, `window.focusLost`, `window.getMaxZ`, `window.getBreakText`, `window.removeDate`, `window.editBreak`, `window.stats`, `window.showUpgradeModal`, and more. Any name collision with a vendor library or browser global is silent. The C#↔JS contract is invisible.

**Fix:** Single namespace object:

```js
window.CTBL = {
  save,
  ForceSettingsUpdate,
  focusLost,
  // ... all C#-callable functions
};
```

C# calls `window.CTBL.save()`. Zero collision risk going forward.

---

## 06 — WebView2 Bridge

### 🔴 High: Four distinct communication channels between JS and C#

The frontend communicates with its host through four separate mechanisms, none sharing error handling or logging:

1. **Sync `window.external.*`** — `SendSettings()`, `GetSettings()`, `ZoomIn()`, `ZoomOut()`, `ResetZoom()`, `UpdateButton()`
2. **C# → JS script injection** — C# calls `ExecuteScriptAsync("window.ForceSettingsUpdate(...)")`
3. **Sync XHR to `http://localhost:58123/Raw/…`** — Template loading via `TemplateLoader`
4. **Async JSONP to `http://127.0.0.1:58123/api`** — All API operations via `CtblApiClient`

**Fix:** Document this map. Create a single `bridge.js` that re-exports all `window.external.*` calls as named functions. This makes the surface area visible and testable in one place.

---

### 🔴 High: All API mutations use JSONP GET — state changes are cacheable and URL-length-limited

**File:** `services/CtblApiClient.js`

`dataType: "jsonp"` is used for every call including mutations like `toggleQueuedDelay`, `allowApp`, `revokeApp`, `enqueueBlockConfigChange`. JSONP forces GET. Consequences:

- These requests can be cached by any HTTP proxy or browser cache
- Subject to URL length limits — `enqueueBlockConfigChange` sends `encodeURIComponent(JSON.stringify(payload))` in a query string, which can exceed 2000 characters for large block configs
- DevTools shows them as script loads, not as network calls, making debugging harder

**Fix:** Replace JSONP with standard `fetch()` POST calls. The local server at `:58123` can accept POST at the same endpoints. This eliminates caching, URL length limits, and makes the API surface debuggable.

---

### 🔴 High: Inconsistent URL encoding in `CtblApiClient.js`

**File:** `services/CtblApiClient.js`

Some calls use `encodeURIComponent(blockName)`. Others do not. Specifically:

```js
// bulkAllowApps — pipe separator not encoded
bulkAllowApps: (ids) => ctblApiGet('/app-control', { action: 'bulk-allow', ids: ids.join('|') }, ...)
```

If any ID ever contains `&`, `=`, or `+`, those parameters will be silently misread on the server side.

**Fix:** Encode consistently. With the switch to POST + JSON body, none of this applies — the body is serialized correctly by `JSON.stringify`.

---

### ⚠️ Medium: `window.onerror` shows an `alert()` in production

**File:** `index.html`

```js
window.onerror = function(message, source, lineno, colno, error) {
  alert("JS Error: " + message + "\nSource: " + source + "\nLine: " + lineno + ":" + colno + "...");
};
```

Displays unhandled errors as blocking dialogs. Halts all JS execution until dismissed. Can cause cascading failures if the error was non-fatal. Exposes implementation details (file paths, stack traces) to end users.

**Fix:** Route errors to a logging function that writes to the console and optionally sends them to the C# host via `window.external` for structured logging. Reserve the alert for catastrophic initialization failures only.

---

## 07 — Accessibility

> **Context:** CTBL++ is a desktop app running in WebView2 — the user base is primarily mouse-and-keyboard on Windows. Full WCAG compliance is not the goal. But keyboard navigability and screen reader basics matter to a meaningful percentage of power users, and the gaps here are mostly trivial to fix.

### ✅ Good: Toggle uses the correct accessible pattern

The toggle component is a visually hidden `<input type="checkbox">` with the clip/overflow technique (not `display: none`). The visual toggle is driven by CSS `:checked` + adjacent sibling. This is fully keyboard operable (Space to toggle), focusable, and readable by screen readers as a checkbox.

---

### 🔴 High: Sidebar has no `<nav>`, no `aria-current`, and no keyboard focus indication

**File:** `components/Sidebar/Sidebar.html`

- Sidebar is `<div class="page-sidebar">` wrapping a `<ul>` — no `<nav>` landmark
- Screen reader users navigating by landmarks cannot find the navigation
- Active item has class `active` but no `aria-current="page"`
- No visible focus styles defined in reviewed CSS — native browser outline likely suppressed by Bootstrap

**Fix (each is a one-liner):**

```html
<!-- Wrap the ul in: -->
<nav aria-label="Main navigation">
```

```js
// In navigateTo(), after adding .active:
el.setAttribute('aria-current', 'page');
// And on others:
el.removeAttribute('aria-current');
```

```css
/* In base.css: */
:focus-visible {
  outline: 2px solid var(--color-active);
  outline-offset: 2px;
}
```

---

### 🔴 High: Dialog close button is hidden from everyone — including keyboard users

**File:** `components/Modal/Modal.css`

```css
.ui-dialog-titlebar-close { display: none; }
```

jQuery UI generates a close button in every dialog's title bar. `display: none` removes it from the tab order and from the accessibility tree. If a user navigates into a dialog by keyboard, there is no escape path except the Escape key — which may or may not be wired.

**Fix:** In every dialog's `open` callback, bind Escape (the `Modal.js` `showErrorDialog` already does the Enter key binding — add Escape alongside it):

```js
open: function() {
  // ... existing code ...
  dialog.parent().on('keydown.closeDialog', function(e) {
    if (e.key === 'Escape') dialog.dialog('close');
  });
},
close: function() {
  dialog.parent().off('keydown.closeDialog');
  // ... existing code ...
}
```

---

### ⚠️ Medium: Block list updates silently — no `aria-live` region

`updateBlocks()` empties and rebuilds `#blocks-list` every second. A screen reader user has no way to know the list has changed.

**Fix:** Add a visually-hidden status region:

```html
<div id="status-announcer" aria-live="polite" class="sr-only"></div>
```

```css
.sr-only {
  position: absolute; width: 1px; height: 1px;
  clip: rect(0 0 0 0); overflow: hidden;
}
```

When `updateBlocks()` detects a meaningful state change, set the text content. The browser announces it at the current polling cadence.

---

## 08 — Scalability — What Breaks at 2×

### 🔴 High: Full DOM teardown every second — no diffing

**File:** `pages/BlocksPage/BlocksPage.js`, `services/pollingService.js`

`pollingService` calls `updateBlocks(false)` every second. `updateBlocks` calls `$('#blocks-list').empty()` then iterates all blocks, calls `calculateBlockState` (200+ line function) and `BlockCard` (600-char string builder) for each, and appends them all. At 10 blocks: rebuilding 6,000+ characters of HTML every tick. At 20 blocks: the browser destroys and recreates 40+ DOM nodes every second. Any focused element or open dropdown inside a block card is destroyed.

**Fix:** Render-skip guard — compute a lightweight state key and skip if nothing changed:

```js
function updateBlocks(forceClose) {
  const stateKey = JSON.stringify({
    blocks: settings.blocks,
    unlocked: AppState.unlockedBlocks,
    queued: AppState.queuedDelays
  });

  if (!forceClose && stateKey === AppState.lastRenderedKey) return;
  AppState.lastRenderedKey = stateKey;

  // ... existing render logic ...
}
```

This eliminates redundant renders at zero cost when nothing changed.

---

### 🔴 High: Manual `toHtml()` escaping is the only XSS guard — one missed call is a bug

**Files:** `components/BlockCard/BlockCard.js`, `utils/blockStateCalculator.js`

Protection relies on calling `toHtml()` at each insertion point — inconsistently applied. Some attributes use the full chain `toHtml(e.replace(/'/g, ...)).replace(/"/g, ...)`, others use just `toHtml(e)`, others insert data directly into `data-*` attributes without escaping.

In a WebView2 app the attack surface is smaller, but block names are user-provided and can contain characters that corrupt HTML structure, causing silent UI bugs.

**Fix:** The tagged template literal helper from section 01 is the correct fix — escaping happens automatically at every interpolation site. Short-term: audit every `'<... data-blockname="'` occurrence and confirm each has a `toHtml()` call.

---

### ⚠️ Medium: Settings save sends the entire object on every change

**File:** `app.js`

`window.save()` calls `window.external.GetSettings(JSON.stringify(settings))`. Every mutation — toggling a block, renaming a list, changing a single preference — serializes and transmits the entire settings object.

**Fix:** Debounce `save()` with a 200ms delay. Two saves within 200ms collapse into one:

```js
const save = debounce(
  () => window.external.GetSettings(JSON.stringify(settings)),
  200
);
```

---

### 🔵 Low: Template loading is synchronous XHR — blocks the main thread at startup

**File:** `utils/TemplateLoader.js`

`xhr.open("GET", url, false)` — the `false` argument means synchronous. 13 template loads at startup, each blocking the main thread until the local server responds. If the C# server starts slowly, the UI hangs with a blank screen and no progress indicator.

**Fix:** Switch to async XHR or `fetch()` with `Promise.all()` for parallel loading. Show a loading indicator until all templates resolve.

---

## Recommended Fix Order

### Do First — High leverage, low risk

1. Remove duplicate rules from `Toggle.css` and `Modal.css`
2. Delete the four `String.prototype` mutations — convert to named exports
3. Fix `shortenOverviewBlockName` — add parameters or delete it
4. Add `debounce` to `save()`
5. Add render-skip guard to `updateBlocks()` (the state hash check)

### Next Batch — Structural improvements

1. Introduce CSS custom properties for the 6–8 most-used colors
2. Replace `window.*` globals with a single `window.CTBL` namespace
3. Replace inline `onclick` in sidebar HTML with JS-bound handlers
4. Encapsulate unlock key construction in two functions
5. Add `<nav>`, `aria-current`, and `:focus-visible` styles
6. Wire Escape key in all dialog `open` callbacks

### Later — Larger refactors

1. Replace JSONP with `fetch()` POST in `CtblApiClient`
2. Build the tagged template literal helper; migrate `BlockCard` to it
3. Split `blockStateCalculator` into compute + template layers
4. Split `SecurityModal.js` — separate dispatcher from dialog UI
5. Replace sync XHR template loading with async `Promise.all`
