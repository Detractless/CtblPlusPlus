# CTBL++ Frontend UI Review

**Scope:** `CtblPlusPlus.WebUI/web/Raw/` source directory  
**Stack:** Vanilla JS (ES modules via webpack), jQuery, Bootstrap 3, jQuery UI  
**Bridge:** WebView2 (`window.external` COM + localhost JSONP API)  
**Date:** July 2026  
**Findings:** 24 across 8 sections

---

## Severity Key

- **[Critical]** Breaks correctness or will definitely break at scale
- **[Medium]** Works today but fragile or actively harmful to maintain
- **[Low]** Style, cleanup, or minor robustness gap

---

## Summary

| Section | Critical | Medium | Low |
|---|:---:|:---:|:---:|
| 1. DOM Manipulation | 1 | 1 | 1 |
| 2. Event Handling | — | 3 | 1 |
| 3. State Management | 1 | 2 | 1 |
| 4. CSS Organization | 1 | 1 | 2 |
| 5. Module Structure | 1 | 1 | 2 |
| 6. WebView2 Bridge | 1 | 3 | 1 |
| 7. Accessibility | 1 | 2 | 2 |
| 8. Future Scale | 1 | 2 | — |

---

## 1. DOM Manipulation

### [Critical] `appendComponentSync` uses `innerHTML +=`, silently destroying all jQuery event handlers on existing nodes

**File:** `utils/templateLoader.js:33`

```js
container.innerHTML += xhr.responseText;  // ← the problem
```

The `+=` operator serializes the existing DOM to an HTML string, concatenates the new HTML, then re-parses and replaces the entire content. Every DOM node that previously existed is destroyed and recreated from scratch. Any jQuery event listeners bound to those nodes — or to their children — are silently lost, because jQuery listeners live on the JS object, not in the serialized attribute string.

This is called in `app.js` for every modal appended to `#dialogs-container`. At startup, six modals are appended in sequence. Each successive call destroys the listeners registered by all the previous ones. At present this works only because each modal re-registers its own listeners at open time — but that invariant is invisible and easy to break.

**Fix:** Replace the `+=` assignment with `insertAdjacentHTML`:

```js
container.insertAdjacentHTML('beforeend', xhr.responseText);
```

---

### [Medium] Three DOM strategies coexist without a consistent rule for when to use each

The codebase builds DOM in three distinct ways:

1. **Template HTML files** — loaded via XHR and injected at startup (`BlockModal.html`, `SettingsPage.html`, etc.)
2. **jQuery helpers** — `.empty()`, `.append()`, `.text()`, `.html()` for targeted updates
3. **String concatenation → append** — large HTML strings built in JS then injected, as in `OverviewPage.js`

None is wrong in itself, but the mixing creates confusion. New code gets added to the nearest existing pattern.

**Recommended rule (enforce via code review):** Static structural markup belongs in HTML files; dynamic list content is built with template-literal functions that return HTML strings; targeted scalar updates use jQuery `.text()/.val()/.prop()`.

---

### [Low] Large HTML strings embedded in JS make the markup invisible to tooling

`OverviewPage.js:265` and `OverviewRenderers.js` (36.9 KB) contain blocks of multi-hundred-character HTML strings built via string concatenation. These are not syntax-highlighted, not linted as HTML, and can't be reformatted by an HTML formatter.

**Fix:** Extract these into named template functions using multi-line template literals. The function signature documents the data contract; the template literal is at least readable.

---

## 2. Event Handling

### [Medium] The polling service swallows all exceptions silently

**File:** `services/pollingService.js:14`

```js
try {
    updateOverview();
    // ...
} catch (intervalError) {}  // ← silent discard
```

A JS error thrown anywhere inside `updateOverview()` or `updateBlocks()` disappears without trace. The polling continues to fire every second, and the user sees a frozen UI.

**Fix:**

```js
} catch (intervalError) {
    console.error("[pollingService] Unhandled error:", intervalError);
}
```

---

### [Medium] `updateSettings()` cascades a full event-rebind of ~50 elements on every call, including from the poll loop

`updateSettings()` calls `bindBooleanSetting()` for every settings checkbox. Each call does `.off("change").on("change", ...)`. In total, `updateSettings(true)` performs roughly 50 DOM queries and event registrations. It is called from the poll loop when the settings page is active — every second.

**Fix:** Separate the event-binding phase from the value-update phase. Run `initSettingsEvents()` once on page init. Run a value-only `syncSettingsValues()` on subsequent poll calls.

---

### [Medium] The `refreshQueuedDelayState` in `app.js` fires two sequential `updateBlocks()` calls with no coordination

`getQueuedDelays()` and `getConfiguredQueuedDelays()` both call `updateBlocks(true)` in their success handlers. If both succeed quickly, the blocks panel re-renders twice in rapid succession.

**Fix:** Fetch both, then render once:

```js
$.when(getQueuedDelays(), getConfiguredQueuedDelays())
    .then(function(delays, configured) {
        AppState.queuedDelays = delays[0] || [];
        AppState.configuredQueuedDelays = configured[0] || [];
        updateBlocks(true);
    });
```

---

### [Low] Deprecated jQuery APIs: `.bind()`, `DOMMouseScroll`

**File:** `app.js:199–203`

```js
$(window).bind("mousewheel DOMMouseScroll", ...);
$(window).bind("mousedown", ...);
$(".no-typing").bind("keydown", ...);
```

`.bind()` was removed in jQuery 3.0. `DOMMouseScroll` is a Firefox-only legacy event. The standard wheel event is `wheel`.

**Fix:** Replace all `.bind()` with `.on()`. Replace the wheel event with `"wheel"`.

---

## 3. State Management

### [Critical] `AppState` initializes moment-based dates at module-load time — values become permanently stale

**File:** `store/AppState.js:18–30`

```js
export const AppState = {
    lastRefreshedMinute: moment().minutes(),        // frozen at startup
    statsBlockedWebStart: moment().startOf("week"), // frozen at startup
    statsBlockedWebEnd:   moment().endOf("week"),   // frozen at startup
    // ... 6 more moment() calls ...
};
```

These calls run exactly once — when the ES module is first imported. If the application runs past a week boundary (e.g., open Sunday night, kept open into Monday), `statsBlockedWebStart` points to the previous week. The stats charts would show the wrong date range with no error.

**Fix:** Initialize moment-derived values to `null` and compute them lazily:

```js
get statsBlockedWebStart() {
    return this._statsBlockedWebStart ?? moment().startOf("week");
},
```

---

### [Medium] The `window.settings` global is accessed directly at hundreds of call sites with no abstraction layer

The entire C# data model is exposed as a mutable global: `settings.blocks[blockId].lock`, `settings.settings.passwordStrict`, etc. Any rename or reshape of a field in the C# backend requires a grep-replace across the entire codebase.

The `AppState.js` store already exists as the right place to centralize this. The pattern to move toward: read-only access to `settings` goes through a getter in `AppState`; writes go through a function that also calls `save()`.

---

### [Medium] Boolean settings stored as strings `"true"/"false"` — over 100 fragile comparisons throughout the codebase

```js
if (settings.blocks[blockId].enabled == "false") { ... }
if ("true" == settings.settings.statsEnabled) { ... }
```

An `undefined` field silently passes `!= "false"` as truthy. A JS `false` boolean also passes `!= "false"` as truthy (since `false != "false"` is `true`).

**Fix:** Add one helper and use it everywhere:

```js
function isTrue(val) { return val === "true" || val === true; }

if (isTrue(blockData.enabled)) { ... }
```

---

### [Low] `AppState.lastRefreshedMinute` is written by three separate modules with no single owner

`AppState.lastRefreshedMinute = moment().minutes()` appears in `updateOverview()`, `updateSettings()`, and is read in the polling service. This should be a write-once property managed by the polling service, with a reset called explicitly.

---

## 4. CSS Organization

### [Critical] `base.css` contains a verbatim duplicate of its first ~200 lines — drift has already begun

**File:** `styles/base.css`

`base.css` declares `html`, `body`, `button`, `input:-ms-input-placeholder`, `.col-xs-*`, and other global rules twice. The second block begins at approximately line 247. They have already diverged: the first block has `.no-select`, `.hidden`, `.bold`, `.green`, `.red`, and several utility classes the second block lacks.

**Fix:** Delete the duplicate block (lines ~247–365). The file was clearly copy-pasted and the second paste was never cleaned up.

---

### [Medium] No CSS custom properties for theming — two 19KB files must both be edited for every color change

`styles/themes/dark.css` and `light.css` are 19KB each and redeclare every selector with different color values. Colors like `#65a30d` and `#ef4444` also appear hardcoded in component CSS files and `base.css`, which means they don't respond to theme switching at all. Adding a third theme requires creating a third 19KB copy-paste.

**Fix:** Define colors as CSS custom properties in a `:root` block. Theme files become small overrides:

```css
/* themes/dark.css */
:root {
    --color-accent: #65a30d;
    --color-bg:     #1a1a1a;
    --color-text:   #fafafa;
}

/* then in Button.css: */
.btn-primary { background: var(--color-accent); }
```

---

### [Low] Global utility class names collide with Bootstrap: `.center`, `.right`, `.bold`, `.green`, `.red`

These occupy names Bootstrap might use in future versions, and they're semantically poor — `.green` has no meaning if the design changes.

**Fix:** Rename to intent-based names: `.text-success`, `.text-error`, `.text-center`, `.fw-bold`. Or prefix them: `.ctbl-center`, `.ctbl-green`.

---

### [Low] Several component CSS files are 0 bytes — empty `<link>` tags fire useless HTTP requests

Empty files: `FrozenAutostartEditor.css`, `RandomTextBreakModal.css`, `StatsToggle.css`, `StatsEnabler.css`, `BlockOrderToggle.css`, `LockReminderModal.css`, `ImportBlocks.css`, `ExtensionInstallModal.css`, `OverviewPage.css`.

**Fix:** Delete the empty files and remove their `<link>` tags from `index.html`.

---

## 5. Module Structure

### [Critical] `SettingsPage.js` was committed partially minified — the file body is a single unformatted line

**File:** `pages/SettingsPage/SettingsPage.js`

The first line of `SettingsPage.js` is correctly formatted. Lines 2 onward are a single continuous minified string — no line breaks, no indentation, all variable names shortened. The full `updateSettings()` function, which is already the most complex function in the codebase, cannot be read or debugged in this form. The file is 31.8KB and nominally "source" but is functionally bytecode.

**Fix:** Replace `SettingsPage.js` with its unminified form. Check git history for the last readable version. Configure the build to never write output back into `Raw/` — `Bundled/` exists for exactly this purpose.

---

### [Medium] Circular imports between pages and components — webpack resolves them now, but they'll produce undefined imports if the load order shifts

`BlockModalDialogs.js` imports from `OverviewPage`, `SettingsPage`, `BlocksPage`, and `ScheduleEditorPage`. All four of those pages import from `BlockModalDialogs`. Webpack resolves this by making one side of each cycle receive an empty object at the first evaluation, then filling it in later. When initialization order shifts, you get a "X is not a function" error with no obvious cause.

**Fix:** Break the cycle by moving the shared callbacks out of pages into a dedicated event module. Pages register handlers; the modal calls them. A shared registry object that both sides can reference without circling back — no full pub/sub system needed.

---

### [Low] The `Bundled/` directory is git-tracked alongside source, doubling all diffs and permanently bloating history

Every source file in `Raw/` has a counterpart in `Bundled/Raw/`. The 346KB `bundle.js` is also tracked. Every commit that touches a source file shows a doubled diff. These blobs can't be removed from history without a rewrite.

**Fix:** Add `Bundled/` to `.gitignore`. Commit a build script (the `webpack.config.js` already exists) and document how to produce the bundle from source.

---

### [Low] Empty placeholder files: `coldTurkeyAPI.js`, `BlockModal.js` (0 bytes)

`services/coldTurkeyAPI.js` and `components/BlockModal/BlockModal.js` are both 0 bytes and are not imported by anything in the current codebase.

**Fix:** Delete them. If the intent was to stub a future module, a comment in the relevant importer is clearer than an empty file.

---

## 6. WebView2 Bridge

### [Critical] `save()` calls `window.external` with no null guard — crashes in any non-WebView2 context

**File:** `app.js:66`

```js
export function save() {
    window.external.GetSettings(JSON.stringify(settings));
}
```

If `window.external` is `undefined` (browser devtools, a test harness, any non-WebView2 environment), this throws a `TypeError` immediately. The call site — and every caller of `save()` across the codebase — has no guard.

**Fix:**

```js
function save() {
    if (!window.external?.GetSettings) {
        console.warn("[save] window.external not available");
        return;
    }
    window.external.GetSettings(JSON.stringify(settings));
}
```

---

### [Medium] Two separate bridge mechanisms for the same C# backend: `window.external` COM calls and JSONP over `localhost:58123`

The codebase talks to C# two different ways:

1. **`window.external.*`** — synchronous COM calls: `GetSettings()`, `SendSettings()`, `ZoomIn()`, `DeleteStats()`. These block the UI thread.
2. **`CtblApiClient.js`** — async JSONP GETs to `http://127.0.0.1:58123/api/*`. These are non-blocking.

These have different error handling, timeout behavior, and semantics. A developer reading the code can't easily tell which bridge to use for a new feature, so both keep growing.

**Recommendation:** Decide on one bridge and migrate toward it. The REST API over localhost is the better long-term choice — async, testable without WebView2, and extensible.

---

### [Medium] `CtblApiClient` uses JSONP — any process that wins port 58123 can inject arbitrary script

JSONP works by injecting a `<script>` tag pointed at the server and trusting it to call a global callback. The server's response is executed as JavaScript unconditionally. In a controlled localhost environment this is low risk in practice, but it means:

- Any other process that binds to port 58123 before CTBL++ can inject code into the WebView.
- Error responses from the server are silently ignored (the callback is never called, not called with an error).
- JSONP does not support POST, which forces mutations like `enqueueBlockConfigChange` to be sent as GETs.

**Fix:** Replace JSONP with `fetch()` or `$.ajax({ dataType: "json" })` with CORS headers on the server (`Access-Control-Allow-Origin: *` on localhost is fine). Client-side change is `dataType: "jsonp"` → `dataType: "json"`.

---

### [Medium] `save()` serializes the full settings tree on every change with no debouncing

Every settings change calls `save()`, which does `JSON.stringify(settings)` on the full settings object and sends it synchronously over the COM bridge. Rapid changes (e.g., a user typing in a text field) trigger multiple full serializations per second.

**Fix:** Debounce `save()` with a ~300ms delay:

```js
let _saveTimer = null;
function save() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(function() {
        if (window.external?.GetSettings)
            window.external.GetSettings(JSON.stringify(settings));
    }, 300);
}
```

---

### [Low] Port `58123` is hardcoded in two separate files

`services/CtblApiClient.js:7` and `utils/templateLoader.js:4` both hardcode different forms of the same address (`http://127.0.0.1:58123` and `http://localhost:58123`). If the port changes, it must be updated in both places.

**Fix:** Define once: `export const API_BASE = "http://127.0.0.1:58123";` and import it in both consumers.

---

## 7. Accessibility

### [Critical] `a:focus { outline: 0 }` in `base.css` removes the focus ring from every link

**File:** `styles/base.css:218`

```css
a:focus, a:hover, a:active { outline: 0; }
```

This removes the browser's default focus indicator from every anchor tag. Keyboard navigation via Tab is still functional, but the user receives no visual feedback about which element is focused. This affects every user who navigates with a keyboard.

**Fix:** Use `:focus-visible` to preserve the focus ring for keyboard navigation while suppressing it for mouse clicks:

```css
a:focus:not(:focus-visible) { outline: 0; }
a:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
```

---

### [Medium] No ARIA on navigation, tabs, or modal dialogs — sidebar active state is invisible to screen readers

The sidebar is a `<ul>` with no `role="navigation"` or `aria-label`. Active page state is conveyed only by a CSS class (`.active`) — screen readers cannot determine which page is current without `aria-current="page"`. The Bootstrap tab panels lack `role="tablist"`, `role="tab"`, and `role="tabpanel"`.

**Fix:** Add to sidebar HTML: `role="navigation" aria-label="Main navigation"`. In the router, when navigating: `$("#" + pageId + " a").attr("aria-current", "page")` and clear it on the previous page.

---

### [Medium] `user-select: none` on the body prevents copying block names and URLs

**File:** `base.css:12`

`user-select: none` is set on the entire body. This prevents selecting text anywhere in the application, including block names in the list, URLs in the exceptions list, and error messages.

**Fix:** Keep `user-select: none` on interactive controls (buttons, navigation items) but remove it from the body. Content that users might reasonably want to copy should be selectable by default.

---

### [Low] `window.onerror` shows a raw `alert()` with stack trace in production

**File:** `index.html:78`

```js
window.onerror = function(message, source, lineno, colno, error) {
    alert("JS Error: " + message + "\nStack: " + (error && error.stack));
};
```

A production JS error interrupts the user with a modal alert containing a raw stack trace. If errors recur (e.g., from the poll loop), the user receives a new alert every second.

**Fix:** Log to `utils/errorTracker.js` (which already exists). Suppress the alert.

---

### [Low] `font-size: 14px !important` on body overrides user's browser zoom preference

**File:** `base.css`

The comment indicates this was added for an IE text-in-textbox rendering bug. WebView2 (Chromium) does not have this bug. The override prevents the browser's default zoom from scaling text correctly for users who have set a larger default font size.

**Fix:** Remove `!important` (or the rule entirely if IE is no longer a target).

---

## 8. Future Scale

### [Critical] Three files exceed 100KB of static HTML/template-string content — they cannot grow much further

Current file sizes:

| File | Size |
|---|---|
| `BlockModal.html` | 104.7 KB |
| `SettingsPage.template.js` | 43.1 KB |
| `SettingsPage.html` | 37.8 KB |
| `OverviewRenderers.js` | 36.9 KB |
| `BreakEditorPage.js` | 35.0 KB |
| `LockEditorPage.js` | 33.2 KB |

`BlockModal.html` is a single file that defines the entire block editing UI. No individual developer can hold 104KB of HTML markup in working memory. At 2× features, these files double.

**Fix for `BlockModal.html`:** Split by tab. Each tab in the block editor is a logical boundary. Extract each tab's HTML into its own file and assemble them at load time via `TemplateLoader.appendComponentSync`. The total HTML is the same size, but each piece is independently comprehensible.

---

### [Medium] Block state is a string-serialized format parsed inline with `split(",")` at every call site

Lock types are encoded as strings like `"delay,true,60,2026,7,1,14,30,0"`. Every place that reads a lock value does its own parsing:

```js
var lockParts = settings.blocks[blockId].lock.split(",");
var lockDate = new Date(lockParts[0], lockParts[1]-1, lockParts[2], lockParts[3], lockParts[4]);
```

This parsing logic appears in `OverviewPage.js`, `blockStateCalculator.js`, `blockManager.js`, `LockEditorPage.js`, and elsewhere. Adding a new field to a lock type — or fixing an off-by-one — requires finding and updating every parser.

**Fix:** The `lockTypes/` directory already exists with a `findLockType()` registry. Extend it: each lock type provides a `parse(str)` function that returns a structured object. The string format stays the same (C# owns it); only the JS parsing is centralized.

---

### [Medium] The synchronous XHR in `TemplateLoader` blocks the main thread during startup — will worsen as more templates are added

**File:** `utils/templateLoader.js:6`

```js
xhr.open('GET', url, false); // false makes it synchronous
```

Each call blocks all JS execution until the HTTP response arrives. Currently 11 templates are loaded synchronously at startup. Synchronous XHR is deprecated in browsers and produces a console warning.

**Fix:** Batch all template fetches as concurrent async requests, then inject them in order before running any component initialization:

```js
const templates = await Promise.all([
    fetch("Raw/layouts/AppShell/AppShell.html").then(r => r.text()),
    fetch("Raw/components/Sidebar/Sidebar.html").then(r => r.text()),
    // ...
]);
// inject in order, then init components
```

Startup time becomes that of the slowest single fetch, not the sum of all fetches.

---

*CTBL++ Frontend Review — Raw/ source directory — 8 sections, 24 findings*
