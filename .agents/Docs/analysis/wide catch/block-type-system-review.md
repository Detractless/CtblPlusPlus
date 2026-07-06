# CTBL++ Block Type System — Architectural Review

**Scope:** Full system — backend (C#), frontend (JS), config/serialization  
**Files examined:** 18 source files  
**Date:** July 2026

---

## Executive Summary

The system has two parallel concepts that are both called "block type" but work completely differently. The scheduling dimension (*continuous* vs. *scheduled*) is a Cold Turkey native concept stored in `CtblBlock.Type` and branched on throughout the codebase with no registry. The block *category* dimension (device block, focused block, regular block) is identified by name prefixes (`"Frozen Turkey,"`, `"Focused Turkey,"`) hard-coded into at least four files. Neither is extensible without shotgun surgery.

CTBL++'s one genuine extension point — the **lock type registry** in `lockTypes/registry.js` — is well-conceived and properly factored. It is limited to lock behaviors layered on Cold Turkey's `password` lock type via sentinel passwords. It does not reach the block category or scheduling type layers.

Adding a truly new block category today requires edits to at least **10–12 files**, with new hardcoded branches in each.

---

## Orientation: Three Distinct Concepts

CTBL++ uses "block type" loosely to mean at least three independent axes of variation. Conflating them explains most of the structural problems.

| Axis | Field | Known Values |
|------|-------|--------------|
| **Schedule type** | `CtblBlock.Type` | `"continuous"`, `"scheduled"` |
| **Block category** | Block name prefix | `"Frozen Turkey"`, `"Frozen Turkey,*"`, `"Focused Turkey,*"`, anything else |
| **Lock type** | `CtblBlock.Lock` | `none`, `password`, `randomText`, `delay`, `schedule`, `window`, `spassword`, `restart`, `YYYY,M,D,H,m` |

These three axes are independent in the data model but deeply entangled in the rendering and logic code.

---

## 01 — Coexistence with Cold Turkey

The boundary between CTBL++ and Cold Turkey is drawn at the data model. `CtblModels.cs` mirrors Cold Turkey's block schema as C# classes, and every class carries `[JsonExtensionData]`. Unknown fields introduced by a future CT update are silently round-tripped rather than dropped — a well-considered defensive posture.

### ✅ Good — JSON extension data on all model classes

All three model classes — `CtblRoot`, `CtblBlock`, `CtblAdditional` — carry:

```csharp
// CtblModels.cs:84
[JsonExtensionData]
public Dictionary<string, JsonElement>? ExtensionData { get; set; }
```

If Cold Turkey adds a new block property, CTBL++ reads, preserves, and writes it back without any code change. This is the correct approach when you don't own the schema.

### ❌ Critical — Extension lock types parasitize CT's `password` field

CTBL++'s "Queued Delay" lock type is implemented by setting `lock = "password"` and `password = "CTBL_QUEUED_DELAY"`. This is documented explicitly in `extensionTypes.js:1–11` with the comment:

> *"Cold Turkey's CLI can only auto-unlock `password`-type locks (see `CtblCliClient.StopBlock`)."*

```javascript
// lockTypes/extensionTypes.js:9–11
export const EXTENSION_TYPES = [
  { ctblTypeId: "queuedDelay", hostLockType: "password", sentinel: "CTBL_QUEUED_DELAY" }
];
```

The risk is structural: CT can legitimately change password validation, add a reserved-strings check, or alter unlock behavior for password-type locks, and all CTBL++ extension types break silently. The sentinel string is not namespaced. There is currently only one entry in `EXTENSION_TYPES`; the mechanism scales poorly as more extension types are added since each must claim a unique sentinel on the same `password` host type.

### ⚠️ Fragile — Block categories identified by name prefix, not a type field

Cold Turkey identifies blocks solely by name. CTBL++ layers its own categories on top by inspecting name prefixes at call sites. These checks are not centralized — they appear independently in:

| File | Line | Check |
|------|------|-------|
| `OverviewRenderers.js` | 19 | `blockName == "Frozen Turkey" \|\| blockName.indexOf("Frozen Turkey,") == 0` |
| `blockStateCalculator.js` | 54 | `(blockName == "Frozen Turkey" \|\| blockName.indexOf("Frozen Turkey,") == 0)` |
| `LockEditorPage.js` | 58 | `blockName.indexOf("Frozen Turkey") == 0` |
| `LockEditorPage.js` | 63 | `blockName.indexOf("Focused Turkey,") == 0` |

If CT ever introduces a block with a name starting with "Frozen Turkey," CTBL++ would misclassify it. There is no shared `isFrozenBlock(blockName)` utility — each file reimplements the same detection logic.

---

## 02 — Registration & Discovery

There are three distinct "type" dimensions in the system. Only one has a registry.

| Dimension | Mechanism | Extensible? |
|-----------|-----------|-------------|
| **Block categories** (Frozen Turkey, Focused Turkey, regular) | Name-prefix `if-else` chains at 4+ call sites | ❌ No registry |
| **Scheduling types** (`"continuous"`, `"scheduled"`) | Literal string comparisons at 5+ sites | ❌ No registry |
| **Lock types — CTBL++ extensions** (`queuedDelay`) | `registerLockType()` / `findLockType()` in `lockTypes/registry.js` | ✅ Has a registry |
| **Native CT lock types** (password, randomText, delay, etc.) | Owned by CT; CTBL++ branches on all of them in parallel `if-else` chains | Hook exists for `password` type only |

### The Lock Type Registry (the one good extension point)

```javascript
// lockTypes/registry.js:9–22
var registeredLockTypes = [];

export function registerLockType(descriptor) {
  registeredLockTypes.push(descriptor);
}

export function findLockType(blockName, blockData) {
  for (var i = 0; i < registeredLockTypes.length; i++) {
    if (registeredLockTypes[i].matches(blockName, blockData)) {
      return registeredLockTypes[i];
    }
  }
  return null;
}
```

`lockTypes/index.js` is the entry point — currently imports only one descriptor:

```javascript
export { registerLockType, findLockType } from './registry';
import './queuedDelay';
```

### Required Descriptor Interface

The interface is not formally declared — it exists only as the shape of `queuedDelayLockType` in `queuedDelay.js:291–307`:

```javascript
{
  id,                              // string identifier
  matches(blockName, blockData),   // → bool: does this block use this type?
  getLockText(blockName, blockData),      // → string | null: overview lock label
  getDisplayState(blockName, blockData),  // → string | null: block card display name
  getLockedWarning(blockName, blockData), // → string | null: warning before locking
  getQueueListEntries(blockName),         // → Promise<HTML>: queue tab content
  getEditorLockMode(blockName, blockData),// → string | null: which editor tab
  parseEditorState(currentLock),          // → object: initial UI values
  bindEditorUI(parsed),                   // side-effect: populate editor DOM
  buildLockConfig(),                      // → string: lock config string to save
  onSave(blockName),                      // → { lock, password }: CT fields
  requestUnlock(blockName, ctx)           // side-effect: open unlock modal
}
```

There is no validation that a registered descriptor satisfies this interface, and no documentation of which methods are optional.

---

## 03 — Shotgun Surgery Test

**Hypothetical:** Add a **Process Block** — a block that restricts a Windows application by process name rather than exe path or URL. This is a new block *category*, not just a new lock type.

### Results

| Metric | Count |
|--------|-------|
| Files to edit | **11** (floor) |
| New hardcoded if-else branches | **6** |
| New files to create | **1** |

### File-by-File Breakdown

| File | Layer | What changes |
|------|-------|-------------|
| `CtblModels.cs` | Backend | Add field or establish prefix convention for process names in `CtblBlock.Apps`. Decision affects every downstream consumer. |
| `CtblStateEnforcer.cs` | Backend | `ExecuteAsync` loop (line 66) builds an `intendedPaths` list and calls `ForceEnforce`. Process-name enforcement needs a different CT API surface — new branch here. |
| `ScheduleChangeQueueHandler.cs` | Backend | Lines 84–93 hard-code side effects for `"scheduled"` and `"continuous"` transitions. New scheduling behavior for process blocks needs cases here. |
| `OverviewRenderers.js` | Frontend | `getBlockMetadata()` at line 19 branches on `"Frozen Turkey"` and falls through to the regular block path. New block category needs its own `else if` with distinct `iconClass`, `blockTypeDesc`, and `blockDetails`. |
| `blockStateCalculator.js` | Frontend | Three independent branches to update: the `isFrozen` check (line 54), the block-type active-state logic (lines 24–51), and the continuous-vs-scheduled rendering fork (lines 113–147). The frozen path is a completely separate rendering tree — a new category needs its own tree. |
| `LockEditorPage.js` | Frontend | Name-prefix checks at lines 58–63 (`isFrozenTurkey`, `displayBlockName`). `_applyFrozenVisibility()` (line 184) shows/hides frozen-specific UI text — a new category needs its own visibility method. |
| `BlockModal.html` | Frontend | The edit dialog (line 219) has fixed tabs: Websites, Exceptions, Apps, Queue. A process block needs a process-name input UI — either a new tab or a conditional panel. |
| `extensionTypes.js` | Config | If the new type uses the extension lock mechanism, a new entry joins `EXTENSION_TYPES` at line 9. |
| `lockTypes/index.js` | Frontend | A new `import './processBlock';` must be added. Without this import, the descriptor is never registered regardless of what it calls on load. |
| `lockTypes/processBlock.js` | New file | The descriptor implementing the 11-method interface. Written from scratch by copying `queuedDelay.js` as a template — no scaffolding. |
| `BlocksPage.js` / `BlockCard.js` | Frontend | Likely needs changes to control which editor dialogs are reachable from the block card for a process-category block. |

The count of 11 is a **floor, not a ceiling** — it assumes the new block type reuses as much existing plumbing as possible. Any unique enforcement behavior, break behavior, or autostart behavior adds more sites.

For comparison, adding a new *lock type* via the existing registry takes 1 new file + 1 import line (+ 1 entry in `EXTENSION_TYPES`).

---

## 04 — Reusability & Duplication

### ✅ Good — `queuedDelay.js` consolidation

The `queuedDelay` descriptor's own file comment names the files it replaced:

> *"Consolidates logic previously duplicated across `blockStateCalculator.js`, `OverviewRenderers.js`, `BlockModalDialogs.js`, `ListEditorPage.js`, `LockEditorPage.js`, `SecurityModal.js` and `UnlockDelayModal.js`."*

That's a successful refactor — logic that used to be sprinkled across seven files now lives in one. The registry pattern is the right direction.

### ❌ Critical — Break text rendering duplicated 1:1

`OverviewRenderers.js` contains two functions that are near-identical:

| Function | Lines | Length |
|----------|-------|--------|
| `getContinuousBreakText()` | 192–385 | ~190 lines |
| `getScheduledBreakText()` | 387–564 | ~175 lines |

The only structural difference is that the scheduled version uses a `schedItem` parameter instead of `blockData`, and suffixes variable names with `2` (`delayParts` vs `delayParts2`, `allowanceSecs` vs `allowanceSecs2`). Every break type (`allowance`, `reward`, `randomText`, `delay`, `sessions`, `pomodoro`) is handled **twice**. Adding or changing any break type requires two parallel edits.

### ⚠️ Fragile — Parallel lock display chains

The lock display logic in `blockStateCalculator.js:151–298` and `OverviewRenderers.js:getLockText()` are parallel `if-else` chains over the same native CT lock type strings. Both chains have a `findLockType()` hook inserted for the `password` case — which is the right pattern — but it covers only one of eight lock types.

### Major if-else chains by size

| Chain | File | Approx. lines |
|-------|------|---------------|
| `getContinuousBreakText()` | `OverviewRenderers.js:192` | ~190 |
| `getScheduledBreakText()` — near-duplicate | `OverviewRenderers.js:387` | ~175 |
| Lock display chain | `blockStateCalculator.js:151` | ~148 |
| `getLockText()` | `OverviewRenderers.js` | ~142 |
| `_onSave()` switch | `LockEditorPage.js:485` | ~135 |

---

## 05 — The API Question

### Lock types — close to an open API, but not there yet

The `registerLockType()` / `findLockType()` pair is a genuine plugin API. A new lock type requires only:
1. A new descriptor file
2. An import added to `lockTypes/index.js`
3. An entry added to `EXTENSION_TYPES` in `extensionTypes.js`

Remaining issue: `LockEditorPage._parseState()` still has a hardcoded `else if` branch at **line 260**:

```javascript
} else if (currentLock.indexOf("queuedDelay") == 0) {
    if (LockEditor.matchedLockType) {
        var parsedQueuedDelay = LockEditor.matchedLockType.parseEditorState(currentLock);
        // ...
    } else if (currentLock.indexOf(",") > 0) {
        // ... fallback hardcoded logic still present ...
    }
}
```

The descriptor pattern partially replaces this but doesn't fully eliminate it.

### Block categories — fully closed list

There is no API surface for block categories. The system cannot discover a new category from a descriptor. Every rendering path contains an exhaustive `if-else` chain that must be manually extended.

### Scheduling types — fully closed list

The two scheduling types (`"continuous"`, `"scheduled"`) are compared by literal string in:

| File | Lines | Context |
|------|-------|---------|
| `ScheduleChangeQueueHandler.cs` | 84–93 | Backend side-effects on type switch |
| `blockStateCalculator.js` | 24–51 | Active state calculation |
| `OverviewPage.js` | 68, 125 | Timeline rendering |
| `ScheduleEditorPage.js` | 298 | Toggle logic |

A third scheduling type would require coordinated changes across both the C# and JS layers.

### What would move this toward an API

The minimum viable change for block categories is a central `BlockCategoryRegistry` (mirroring `lockTypes/registry.js`) where each category descriptor declares:

- `matches(blockName)` predicate
- Icon and display name logic
- Editor visibility rules
- Enforcement path

The current name-prefix `if-else` chains become single calls to `findBlockCategory(blockName)` with a fallback to the default website/app behavior.

---

## 06 — Frontend Rendering

The UI knows about block types through a combination of inline string matching, hardcoded HTML tab structures, and the partial lock type registry. There is no data-driven rendering path for block categories or scheduling types.

### Block card metadata — no descriptor

`getBlockMetadata()` in `OverviewRenderers.js:12–44` returns `iconClass`, `blockTypeDesc`, and `blockDetails` for every block row. Its entire body is a single `if / else if / else` chain on block name prefixes:

```javascript
export function getBlockMetadata(blockName, blockData) {
  if (blockName == "Frozen Turkey" || blockName.indexOf("Frozen Turkey,") == 0) {
    iconClass = "sign-out";
    blockTypeDesc = "Device block";
    // ...
  } else if (blockName.indexOf("Focused Turkey,") == 0) {
    blockDisplayName = blockName.replace("Focused Turkey,", "");
  } else {
    iconClass = "shield";
    blockTypeDesc = "Website & app block";
    // ...
  }
}
```

A new block category has nowhere to register its metadata — it must add a branch here.

### Lock display — hook exists for extension types only

Both `blockStateCalculator.js:184–196` and `OverviewRenderers.js:94–99` call `findLockType()` inside the `lock.indexOf("password")` branch and delegate to the descriptor's `getDisplayState()` / `getLockText()`. This works for the one registered extension type. Native CT lock types (randomText, delay, window, schedule, restart, timer) are still fully hardcoded with no hook point.

### Editor dialogs — no component model

`BlockModal.html` contains static HTML for all possible dialog states. The "Edit Block" dialog (line 219) has four fixed tabs hardcoded for the website/app block category. The device block dialog (`#dialog-edit-device-block`, line 739) is a separate `<div>` element entirely. A new block category requires:

1. A new `<div id="dialog-edit-X">` element with its own hardcoded tab structure
2. Wiring into `BlocksPage.js` alongside the existing dialog routing logic

---

## 07 — Config & Serialization

### ✅ Good — `CtblBlock.Type` is an unconstrained string

The `Type` property is declared as `string` with a default of `"continuous"`. There is no enum, no allowlist, no validator. Writing a new `type` value to the config file will not break serialization. The problem is that every consumer then needs a new hardcoded branch to handle the value.

### ❌ Critical — Extension type identity lives in AppState, not config

Whether a block is a "Queued Delay" block is **not stored in Cold Turkey's config file**. It is inferred at runtime from:

1. `AppState.configuredQueuedDelays` — maintained in memory and persisted via a CTBL++ settings key
2. The sentinel `password === "CTBL_QUEUED_DELAY"` in the block's own config

If `AppState` is lost (process restart, crash, clearing CTBL++ settings), a Queued Delay block appears to the rest of the system as a regular password-locked block — because from Cold Turkey's perspective, it *is* one. The extension type identity is not self-describing in the config.

### ⚠️ Note — The unused `extension` field

`CtblBlock.Extension` (`CtblModels.cs:82`) is defined, serialized with `[JsonPropertyName("extension")]`, defaults to `""`, and is **read or written by no file in the codebase**:

```csharp
[JsonPropertyName("extension")]
public string Extension { get; set; } = "";
```

This field is a ready-made home for CTBL++-owned type metadata. It could carry the extension type identifier (`"queuedDelay"`, etc.) and free the sentinel-password mechanism from its current structural constraints. The extension type identity would then be self-describing in the config, surviving process restarts without relying on `AppState`.

---

## Summary

| Dimension | Rating | Key Finding |
|-----------|--------|-------------|
| Coexistence with Cold Turkey | **Good** | `ExtensionData` protects unknown fields; single integration point |
| Lock type registration | **Good** | Open registry; descriptor pattern; self-registration |
| Block category registration | **Poor** | No registry; string prefix duplicated across 4+ files |
| Schedule type registration | **Poor** | Closed `if-else` in 3+ files; no registry |
| Shotgun surgery (new category) | **Poor** | 11 files / 6 new branches — too high |
| Reusability | **Mixed** | Lock types: good. Break text: ~365 lines duplicated 1:1 |
| Frontend rendering | **Mixed** | Lock types: data-driven. Everything else: hardcoded `if-else` |
| Config / serialization | **Mixed** | Additive-safe schema; `Extension` field exists but unused |

---

## Recommendations

### REC 01 — Introduce a `BlockCategoryRegistry`

Mirror the structure of `lockTypes/registry.js`. Move Frozen Turkey and Focused Turkey category logic into descriptors. Make `getBlockMetadata()`, `calculateBlockState()`, and the lock editor call `findBlockCategory(blockName)` rather than inline name-prefix checks. A new category then requires one new file and one import — not 11 file edits.

### REC 02 — Use the existing `extension` field for type identity

Write the CTBL++ extension type identifier into `CtblBlock.Extension` when a block is configured with an extension lock type. This makes the type self-describing in config and removes the runtime dependency on `AppState.configuredQueuedDelays` for extension type identity.

### REC 03 — Merge the two break text functions

`getContinuousBreakText()` and `getScheduledBreakText()` in `OverviewRenderers.js` are ~85% identical. Merge them into a single function parameterized by the break source object (`blockData.break` vs. `schedItem.break`). Every future break type change currently requires two parallel edits; this reduces it to one.

### REC 04 — Formalize the lock type descriptor interface

Either as a JSDoc `@typedef` or as a validation function called inside `registerLockType()`. Remove the residual hardcoded `queuedDelay` branch from `LockEditorPage._parseState()` (line 260) in favor of the `matchedLockType.parseEditorState()` delegate that already exists.

---

## File Reference Index

| File | Role in block type system |
|------|--------------------------|
| `CtblPlusPlus.Domain/Models/CtblModels.cs` | Block data schema; `CtblBlock.Type` and `Extension` fields |
| `CtblPlusPlus.Application/Queue/Handlers/ScheduleChangeQueueHandler.cs` | Backend type-switch side effects (lines 84–93) |
| `CtblPlusPlus.Application/Queue/Handlers/BlockConfigQueueHandler.cs` | Queued lock/password config updates |
| `CtblPlusPlus.Application/AppControl/CtblStateEnforcer.cs` | 45s enforcement loop; app list sync |
| `CtblPlusPlus.Application/Interfaces/IColdTurkeyInjector.cs` | CT interaction boundary |
| `web/Raw/lockTypes/registry.js` | Lock type registry: `registerLockType`, `findLockType` |
| `web/Raw/lockTypes/index.js` | Entry point; imports all descriptors |
| `web/Raw/lockTypes/extensionTypes.js` | `EXTENSION_TYPES` sentinel table; `isExtensionLock()` |
| `web/Raw/lockTypes/queuedDelay.js` | Only registered lock type descriptor |
| `web/Raw/utils/blockStateCalculator.js` | Block active state; lock display chain (lines 24–298) |
| `web/Raw/pages/OverviewPage/OverviewRenderers.js` | Block metadata; break text (~365 lines duplicated) |
| `web/Raw/pages/OverviewPage/OverviewPage.js` | Timeline rendering; type branches at lines 68, 125 |
| `web/Raw/pages/LockEditorPage/LockEditorPage.js` | Lock editor; category name-prefix checks (lines 58–63); `_onSave()` switch (line 485) |
| `web/Raw/components/BlockModal/BlockModal.html` | Static dialog HTML; fixed tab structure (line 219) |
