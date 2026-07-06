# CTBL++ Build System & CI Review
**Date:** 2026-07-05  
**Version:** v0.2.1.2  
**Stack:** .NET 10 · Node.js · Windows  
**Scope:** `ctbl.bat`, `Deploy.ps1`, 7 `.csproj` files, `webpack.config.js`, `CONTRIBUTING.md`, `LocalWebServerService.cs`, `AppControlConstants.cs`, `.claude/settings.local.json`

> **Note:** This review covers only the public repo surface. The private watchdog/vault/HMAC source is not included.

---

## Severity Summary

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 4 |
| Medium | 9 |
| Low | 6 |
| **Total** | **20** |

---

## 01 — Security

### SEC-01 · Critical — Wildcard CORS on the localhost enforcement API
**File:** `CtblPlusPlus.Engine/LocalWebServerService.cs : 75–78`

Every response sets `Access-Control-Allow-Origin: *` unconditionally, before any route is matched. Any web page the user visits can call `http://localhost:58123/api/…` via `fetch()` and read or manipulate the enforcement engine — queue state, active locks, scheduled changes. On a machine where the user is relying on CTBL++ to resist impulse decisions, a malicious or compromised site can query or tamper with it.

**Fix:** Restrict the allowed origin to the actual Cold Turkey web root (or `null` for `file://` requests). Add a per-request token the web UI sends with every call so unauthenticated cross-origin requests are rejected before they reach a handler.

---

### SEC-02 · High — JSONP support bypasses CORS entirely — fixing SEC-01 alone is not enough
**File:** `CtblPlusPlus.Engine/LocalWebServerService.cs : 145–162`

Any endpoint accepts a `callback` query parameter and returns a JSONP-wrapped response with `Content-Type: application/javascript`. JSONP loads via `<script src="…">` and is not subject to CORS at all — it bypasses even a correctly restricted `Access-Control-Allow-Origin` header. Fixing SEC-01 without removing JSONP leaves this path fully open to any web page. JSONP was introduced for the Cold Turkey web UI's IE-era `XDomainRequest` needs; the current patched UI uses WebView2 and `fetch()`.

**Fix:** Remove JSONP support entirely.

---

### SEC-03 · Medium — `QueuedDelayLockPassword` is a static, publicly readable sentinel
**File:** `CtblPlusPlus.Domain/Models/AppControlConstants.cs : 20`

The string `"CTBL_QUEUED_DELAY"` is the exact password Cold Turkey requires to release a Queued Delay–locked block. Because the repo is public MIT, anyone can read this constant without cloning — a web search would surface it. A user who wants to bypass their configured delay can type this directly into Cold Turkey's UI.

This is an inherent open-source enforcement tension (a determined user could compile a patched build regardless), but the bar is currently at "read the README."

**Consider:** Deriving the sentinel from a value written by the installer and stored in the vault, so it is unique per installation and not derivable from source alone.

---

## 02 — Build Reliability

### BLD-01 · High — `_payload\` is never cleaned before a build — partial failures leave stale binaries
**File:** `ctbl.bat : 42–73`

If Engine publishes but Wd2 fails, `_payload\` is left on disk. The next `[1] Build` publishes into it without clearing it first — stale binaries from the failed run coexist with fresh ones. `Payload.zip` is then built from this mixed state and embedded into the Installer.

**Fix:** Add `if exist "%ROOT%_payload" rmdir /s /q "%ROOT%_payload"` at the very top of `:build`, before any `dotnet publish` command.

---

### BLD-02 · High — Option [1] Build always produces Debug binaries — the distributed payload is never Release
**File:** `ctbl.bat : 42, 50, 58, 120`

Every `dotnet publish` for Engine, Wd1, and Wd2 passes `-c Debug`. The Installer build at step [5/5] uses `dotnet build -c Debug`. When a contributor runs `[4] Publish single-file installer`, the Release-profile Installer exe wraps Debug-mode services — larger files, no JIT optimizations, PDB paths baked into assemblies.

**Fix:** Option [4] should first rebuild the payload with `-c Release`, or at minimum display a clear warning that it only republishes the Installer wrapper and that the payload is whatever configuration was last built via [1].

---

### BLD-03 · High — CONTRIBUTING.md documents a Split / Combine workflow that does not exist in `ctbl.bat`
**Files:** `CONTRIBUTING.md : 61–68` · `ctbl.bat : 21–29`

The guide tells authorized contributors to run `[5] Split / Combine → [2] Combine` to merge private repo source files into the project tree. Option [5] in the current batch file is **Clean project for GitHub**. There is no Split / Combine sub-menu anywhere in the file. A contributor following the documented onboarding steps hits a dead end on their first interaction with the build system.

**Fix:** Either restore the Split / Combine sub-menu, or update `CONTRIBUTING.md` to describe the actual current workflow.

---

### BLD-04 · Medium — No `.gitignore` — build artifacts are being committed
*(no .gitignore present at repo root)*

`bin\`, `obj\`, `Payload.zip`, `WebPayload.zip`, the `_payload\` staging directory, and the webpack `Bundled\` output are all on disk and unguarded. The committed `.claude\settings.local.json` (see CFG-02) and `bin\`/`obj\` directories in the tree confirm artifacts are already making it into commits. Option [5] Clean is a manual backstop that only works if remembered before staging.

**Fix:** Add a standard `.NET + Node` `.gitignore`. This resolves BLD-04, most of CFG-02, and prevents future incidents in one step.

---

### BLD-05 · Medium — Building the Installer directly fails on a clean clone — `Payload.zip` and `WebPayload.zip` don't exist yet
**File:** `CtblPlusPlus.Installer/CtblPlusPlus.Installer.csproj : 23–27`

Both zip files are declared as `<EmbeddedResource>` but are generated by `ctbl.bat` before the Installer builds. On a fresh clone, neither exists. A contributor who runs `dotnet build CtblPlusPlus.Installer` directly — a completely normal reflex — gets either an MSBuild missing-file error or a silently broken installer with no payload embedded.

**Fix:** Add a `BeforeBuild` target that emits a clear diagnostic error if the zip files are absent, pointing to `ctbl.bat [1]`.

---

### BLD-06 · Low — No `global.json` — required SDK version is unspecified
*(no global.json at repo root)*

The solution targets `net10.0-windows` but there is no `global.json` to pin the SDK. A developer with .NET 9 gets a confusing framework error; one with a .NET 11 preview may encounter silent behavioral differences.

**Fix:** Add a `global.json` with `"sdk": { "version": "10.0.xxx", "rollForward": "latestFeature" }`.

---

## 03 — PowerShell Scripts

### PS-01 · Medium — `Deploy.ps1` has no `-ErrorAction Stop` — cmdlet failures continue silently
**File:** `Deploy.ps1 : 54, 58, 62`

The three critical file operations — `Copy-Item` (backup), `Remove-Item` (wipe target), `Copy-Item` (install new files) — all run without `-ErrorAction Stop`. If the backup fails (disk full, locked file), the script proceeds to delete the target directory anyway. If `Remove-Item` fails partway through because Cold Turkey has a file open, the partial wipe is followed by a partial copy, leaving the web directory in a broken intermediate state with no error surfaced.

**Fix:** Add `-ErrorAction Stop` to all three operations and wrap the sequence in a `try/catch`.

---

### PS-02 · Low — Self-elevation re-launches with `-ExecutionPolicy Bypass`
**File:** `Deploy.ps1 : 10`

The elevated re-launch circumvents whatever execution policy the user or their organization has configured. `-ExecutionPolicy RemoteSigned` is sufficient for a locally authored script and respects enterprise policy.

**Fix:** Change `-ExecutionPolicy Bypass` to `-ExecutionPolicy RemoteSigned`.

---

### PS-03 · Low — `pause` and `Read-Host` hang non-interactive callers
**File:** `Deploy.ps1 : 21, 37, 43, 65`

Every exit path calls `pause`; the missing-target fallback calls `Read-Host`. Both block indefinitely if the script is invoked from a CI step, a scheduled task, or another script.

**Fix:** Add a `-NonInteractive` switch that skips these blocks. Functionality is unchanged for interactive use.

---

## 04 — Comment-Driven Access Control

> The GitHub Actions workflow file is not present in the public repo. These findings are assessed from the behavior described in `CONTRIBUTING.md`.

---

### ACC-01 · Medium — Edited comment events may double-trigger or silently reset the 7-day countdown
**Reference:** `CONTRIBUTING.md : 28–41`

The GitHub `issue_comment` event fires on `created`, `edited`, and `deleted`. If the workflow triggers on both `created` and `edited`, a user who edits their request comment (even a typo fix) could restart their countdown. GitHub may also internally touch a comment (link-preview expansion), producing a spurious `edited` event that re-processes an active request mid-countdown.

**Fix:** Gate explicitly on `github.event.action == 'created'`, or use the comment's node ID as a dedup key persisted across runs.

---

### ACC-02 · Medium — Deleted comments may not cancel a pending countdown
**Reference:** `CONTRIBUTING.md : 28–41`

A user who posts a request and immediately deletes it should have their countdown cancelled. This requires explicitly handling the `deleted` action type — it is not fired by `issue_comment: [created]`. If the workflow only listens on `created`, the countdown continues silently after the comment is gone.

CONTRIBUTING.md currently requires posting a separate `[Username]::Forget Full Access` comment to cancel, which is only possible if the user remembers they made the request.

---

### ACC-03 · Medium — Workflow re-runs could re-process already-satisfied or in-flight requests
**Reference:** `CONTRIBUTING.md : 28–41`

The scheduled 2-hour scan reads the issue thread for pending requests. If a maintainer manually re-triggers the scan from the Actions UI while a grant is in-flight, the same request may be evaluated twice — potentially sending duplicate invitations, or conflicting with a just-posted `Access Granted` comment.

**Fix:** Store processed state outside the comment thread (an issue label per user, or a separate file), or check for an existing `Access Granted` marker for that username before any API call.

---

### ACC-04 · Low — *Access Granted* comment does not confirm actual repository access was given
**Reference:** `CONTRIBUTING.md : 39`

The `[Username]::Access Granted [Date]` comment is the only signal to the user. If the GitHub collaborator invitation API call fails silently, or if the user receives the invitation but never accepts it, the comment implies access that doesn't exist.

**Fix:** Post the confirmation comment only after a verified successful API response, and include an "accept your invitation at this link" note in the grant message so the user can self-verify.

---

## 05 — Configuration

### CFG-01 · Medium — Cold Turkey install path hardcoded — non-default installs silently break
**File:** `CtblPlusPlus.Engine/LocalWebServerService.cs : 32`

`Path.GetFullPath(@"C:\Program Files\Cold Turkey\web")` is constructed in the constructor with no configuration mechanism. Users who installed Cold Turkey to a non-default drive or directory will find the Engine starts, serves nothing, and logs `404` for every request.

Note: `SystemPathGuard.cs` correctly uses `Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles)` for the same path — `LocalWebServerService.cs` should do the same, and ideally also check the registry.

**Fix:** Read the Cold Turkey install path from the Windows registry at startup. Fall back to the default and log a clear warning if the registry key is absent.

---

### CFG-02 · Medium — `.claude/settings.local.json` committed with another developer's machine paths
**File:** `.claude/settings.local.json`

The committed file contains absolute paths from a different developer's machine (`C:\Users\Calibro1\…`) and from a prior version of the project (`CTBL ++ Version 0.2.1.3 / 0.2.7.5`). This is a local session file that serves no purpose for other contributors and leaks the working directory layout and username of whoever originally committed it.

**Fix:** Add `.claude/settings.local.json` to `.gitignore` and remove the committed copy.

---

### CFG-03 · Low — Nullable reference warnings suppressed globally in Application and Domain
**Files:** `CtblPlusPlus.Application/CtblPlusPlus.Application.csproj : 7` · `CtblPlusPlus.Domain/CtblPlusPlus.Domain.csproj : 7`

```xml
<NoWarn>CS8600;CS8604;CS8618;CS8625</NoWarn>
```

`CS8600` (null assigned to non-nullable) and `CS8604` (null passed to non-nullable parameter) hide real null-dereference risk across the two most business-critical layers.

**Fix:** Resolve per-site with `!`, null guards, or `?.` rather than silencing project-wide. Remove `NoWarn` once cleared.

---

### CFG-04 · Low — Webpack targeting IE 11 when the host browser is Chromium (WebView2)
**File:** `CtblPlusPlus.WebUI/web/Scripts/webpack.config.js : 14`

`targets: { ie: '11' }` causes Babel to rewrite `async/await` as generator state machines and emit ES5-compatible output. Cold Turkey's embedded browser is WebView2 (Chromium), which supports ES2021+ natively. The IE 11 target produces a larger bundle, eliminates async stack traces in the debugger, and may cause unexpected behavior from prototype-patching polyfills.

**Fix:** Switch to `targets: { chrome: '90' }` or `"last 2 Chrome versions"`.

---

## Recommended Action Order

1. **SEC-01 + SEC-02 together** — Fix CORS and remove JSONP. These are one coherent change and close the most direct bypass vector against the enforcement engine.
2. **BLD-03** — Fix or remove the Split / Combine reference in `CONTRIBUTING.md` so new contributors can actually onboard.
3. **BLD-04** — Add a `.gitignore`. Also resolves most of CFG-02 going forward; takes five minutes.
4. **PS-01** — Add `-ErrorAction Stop` to `Deploy.ps1`'s three file operations before the next time anyone deploys the web UI.
5. **BLD-01** — Clean `_payload\` at the start of every build.
6. **BLD-02** — Make the Release payload path explicit or warn loudly.
7. **CFG-01** — Read the Cold Turkey install path from the registry.
8. Remaining medium and low findings as bandwidth allows.
