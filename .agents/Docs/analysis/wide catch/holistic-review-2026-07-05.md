# CTBL++ — Cross-Component Holistic Review

**Date:** 2026-07-05  
**Reviewer:** Claude Code (claude-sonnet-4-6)  
**Scope:** Findings that are only visible by tracing connections between components. Single-component issues are excluded.

| Component | Role |
|-----------|------|
| Engine | Windows Service — HTTP API (port 58123), queue dispatch, state enforcement |
| Wd1 / Wd2 | Watchdog Services — cross-monitor Engine and each other; mark selves as critical processes |
| Infrastructure | SQLite repos, DPAPI HMAC, PidBroker pipe, enforcer services |
| WebUI (Raw/) | Vanilla JS frontend — patched Cold Turkey UI; calls Engine REST API via JSONP |
| Installer | WPF app — orchestrates full installation; embeds Payload.zip and WebPayload.zip |
| Deploy.ps1 | Dev script — webpack build + file copy to Cold Turkey web folder |

**Summary:** 3 Critical · 4 Risk · 6 Gap · 4 Note = **17 findings**

---

## 1. Inconsistent Conventions

### [Note] Four parallel logging systems coexist in C#

The backend uses four distinct logging mechanisms with no common thread:

- `ILogger<T>` (DI-injected) — used in `LocalWebServerService.cs`
- `EngineLogger.Log()` (static, no lock) — used in `AppControlStateManager.cs`, `DatabaseClient.cs`
- `StartupLog.Write()` (static, lock-guarded) — used for crash-path diagnostics
- `LockdownLogger.Log()` (static) — used throughout watchdog and lockdown code
- `Console.WriteLine()` — used directly in `WatchdogHeartbeat.cs` throughout the monitoring loop

Both `EngineLogger` and `StartupLog` write to the same file (`%ProgramData%\CtblPlusPlus\process_log.txt`) with different timestamp formats. `EngineLogger` has no locking — concurrent writes from multiple services can interleave. The `ILogger` messages go to the Windows Event Log, not to this file. A developer tailing the log file will see only a subset of what the system is doing.

---

### [Note] Frontend polling swallows all exceptions silently

The 1-second polling loop in `pollingService.js` wraps every tick in a bare `catch (intervalError) {}` — no log, no user feedback, no circuit-breaker. When the Engine is down, the UI freezes in its last-known state with no indication that data is stale. A user may interact with state that is minutes old without any visual cue.

The C# side logs all API errors with structured ILogger. The JS side logs nothing. The two error-handling approaches differ by design, but the total silence in JS is a gap relative to the noise the backend produces.

---

### [Note] "Phase X" comments are the only changelog

Refactoring history is encoded purely as inline comments: *"Phase 1 fix retained"*, *"Phase 2 fix"*, *"Phase 06: IntegrityVerificationService re-enabled"*. These appear in `DpapiHmacProvider.cs`, `Program.cs`, and elsewhere. The phase numbering is inconsistent (Phase 3, Phase 06) and there is no external document that maps a phase number to what changed and why. Future contributors encounter load-bearing comments that reference invisible context.

---

## 2. Duplicated Logic

### [Critical] HMAC comparison is timing-safe in the queue but not in the pipe protocol

The same HMAC key is used to sign two different channels, but verification is implemented differently in each:

- `QueueSecurityValidator.cs`: uses `CryptographicOperations.FixedTimeEquals()` — correct, timing-safe
- `PidBroker.cs`: uses `_hmac.ComputeHmac(payload) != providedSig` — plain string equality
- `WatchdogHeartbeat.cs`: uses `_hmac.ComputeHmac(receivedPayload) == receivedSig` — plain string equality

The pipe channel is local-only, which limits the practical attack surface, but the inconsistency means the security model is applied at different strength levels in two places that share a key.

> **Recommendation:** Extract a single `IHmacProvider.VerifyHmac(payload, sig)` method that always uses `FixedTimeEquals`, and call it from both paths.

---

### [Risk] Port 58123 and web root hardcoded independently in frontend and backend

Three separate artifacts encode the same deployment parameters with no shared source:

- `LocalWebServerService.cs` (constructor): `http://localhost:58123/` and `http://127.0.0.1:58123/`
- `CtblApiClient.js`: `var API_BASE_URL = "http://127.0.0.1:58123/api"`
- `LocalWebServerService.cs`: `@"C:\Program Files\Cold Turkey\web"`

The frontend value is baked into `Bundled/bundle.js` at webpack build time. A port conflict causes the Engine's `HttpListenerException` to be logged and swallowed — the service keeps running with no HTTP server. The frontend's API calls silently fall back to their `fallback: null`/`fallback: []` defaults. The user sees no error; CTBL++ features stop working entirely.

---

### [Risk] Process resurrection logic duplicated between Engine and Watchdogs — with a divergence

Both `PidBroker.cs` (Engine → resurrect watchdogs) and `WatchdogHeartbeat.cs` (Watchdog → resurrect Engine/peer) implement resurrection. `PidBroker` was updated for the split-EXE architecture and correctly launches `CtblPlusPlus.Wd1.exe` and `CtblPlusPlus.Wd2.exe` by name. `WatchdogHeartbeat` was not updated: it launches `_exePath` (the watchdog's own executable) with `--engine`/`--watchdog1`/`--watchdog2` arguments that neither `Wd1.Program.cs` nor `Wd2.Program.cs` handles. See §4 for the full failure trace.

---

## 3. Implicit Contracts

### [Critical] Cold Turkey's CTB17 encoding is reverse-engineered with no version detection

`DatabaseClient.cs` reads and writes Cold Turkey's `data-app.db` using a custom hex encoding: prefix `"CTB17"`, byte offset `17`. This format was reverse-engineered and is undocumented. The constants have no comment explaining what version of Cold Turkey introduced them, whether the format has changed in the past, or what the detection strategy is if it changes again.

If Cold Turkey ships an update that changes the encoding, `GetDbState()` throws `InvalidDataException("Settings value does not start with the expected prefix.")`. This is the only guard. There is no fallback, no version check before decoding, and no way for the Engine to distinguish "Cold Turkey updated" from "database corrupted." The error propagates unhandled into the queue dispatcher, which will stop processing.

> **The entire block-state integration depends on a single magic constant matching what an external closed-source application expects.**

---

### [Risk] The pipe protocol between Engine and Watchdogs is positional with no versioning

The named-pipe protocol (`CtblPlusPlusPidBroker`) is implemented as bare string messages parsed by index — e.g., `parts[4]` for Wd1 health, `parts[5]` for Wd2 health in the `GET_PIDS` response. The protocol is defined implicitly across two files:

- Server side: `PidBroker.cs` — writes the wire format
- Client side: `WatchdogHeartbeat.cs` — parses it

There is no shared constant class, no schema, no version field. Adding a field to the `PIDS` response requires updating both files simultaneously with no compile-time enforcement. A mismatch silently produces wrong PID values and incorrect health booleans, causing watchdogs to take no action when they should.

---

### [Gap] window.external call sites are undocumented after coldTurkeyAPI.js was deprecated

`coldTurkeyAPI.js` is the entire file:

```
// Deprecated. We now call window.external directly for perfect COM interop.
```

The native bridge (`window.external.GetSettings()`, `window.external.SetSettings()`, etc.) is now called from scattered call sites throughout the component tree. There is no inventory of which `window.external` methods the UI depends on, no abstraction layer, and no documentation of what Cold Turkey's COM interface exposes. If Cold Turkey updates its WebView2 integration or changes a method name, every call site breaks independently with no central place to fix.

---

### [Gap] Installer's WebPayload.zip can silently diverge from Deploy.ps1 output

Two mechanisms exist to deploy the patched UI:

- `Deploy.ps1` — runs webpack, copies `Bundled/` to `C:\Program Files\Cold Turkey\web` (dev workflow)
- `Installer/WebPayload.zip` — static binary blob embedded in the installer at compile time (end-user workflow)

If a developer runs `Deploy.ps1` but does not rebuild the Installer project, installed end-users and the developer's own machine run different versions of the UI. There is no hash check, no manifest comparison, and no build step that enforces they are in sync. The `_manifest.json` in `Bundled/` could be used for this, but it is not checked by the installer.

---

## 4. Single Points of Failure

### [Critical] Watchdog self-resurrection of Engine is broken — the wrong executable is launched

When a watchdog detects the Engine has died, `WatchdogHeartbeat.HandleDeathAsync()` runs this logic:

```csharp
string arg = targetName == "Engine" ? "--engine" : ...;
// FileName = _exePath (the watchdog's OWN binary), Arguments = arg
```

`_exePath` resolves to `Process.GetCurrentProcess().MainModule.FileName` — the watchdog's own binary, e.g. `CtblPlusPlus.Wd1.exe`. Neither `Wd1.Program.cs` nor `Wd2.Program.cs` parses arguments; both have a fixed identity hardcoded as `const string wdName = "Wd1"`. Launching `CtblPlusPlus.Wd1.exe --engine` starts another Wd1 instance, which immediately fails the `Global\CtblPlusPlus_Wd1_Mutex` check and exits.

Meanwhile, `PidBroker.cs` (Engine → resurrect watchdogs) was correctly updated for the split-EXE architecture and uses dedicated EXE names. The two sides of the watchdog system are in different states.

> **Failure trace:** Engine dies → Wd1 detects it → `HandleDeathAsync("Engine")` → launches `Wd1.exe --engine` → mutex fails → process exits → Engine stays dead. The Engine-side recovery (PidBroker) is the only working resurrection path, but it cannot restart itself.

**Fix:** In `HandleDeathAsync()`, when `targetName == "Engine"`, look up `CtblPlusPlus.Engine.exe` in `AppDomain.CurrentDomain.BaseDirectory` and launch that — mirroring what `PidBroker.ResurrectProcess()` already does correctly for watchdogs.

---

### [Risk] system.key is machine-bound and unrecoverable after OS reinstall

`DpapiHmacProvider.cs` stores the 32-byte HMAC key encrypted with `DataProtectionScope.LocalMachine` DPAPI. Every queue signature in the SQLite database was computed with this key.

- **OS reinstall:** DPAPI LocalMachine key is destroyed; `system.key` cannot be decrypted even if the file survives; all existing queue entries fail signature validation with `FailedSecurityViolation`
- **Key deletion:** the code falls through to generating a new random key — silently invalidating all pending requests
- `VaultRecoveryService` can restore executables but not the DPAPI-protected key blob

The installer generates the key before services start (documented in code comments), which is correct. But the key has no export, no escrow, and no recovery path for the user. A failed OS update or Windows repair that regenerates DPAPI keys would silently break all queued operations with no user-visible explanation.

> ✓ The mutex-protected key-init path correctly prevents the boot-race write collision when all three services start simultaneously.

---

### [Risk] Cold Turkey's data-app.db is a shared write target with no retry on lock

`DatabaseClient.cs` opens `%ProgramData%\Cold Turkey\data-app.db` in `ReadWrite` mode without WAL. Both Cold Turkey and the Engine write to this file. On `SqliteErrorCode 5 or 6` (busy/locked), a `DatabaseLockedException` is thrown — with no retry, no backoff, and no queue for the failed write to be retried later.

Backup files (`data-app.db.bak.yyyyMMddHHmmss`) accumulate in Cold Turkey's own data folder. They are pruned to 5 copies, but the pruning folder is Cold Turkey's — not cleaned on CTBL++ uninstall. A user who uninstalls CTBL++ is left with up to 5 stale backup files in a third-party application's data directory.

---

## 5. Testing Gaps

### [Gap] No test projects exist — highest-risk paths ranked by consequence

There are no `*.Tests` or `*.Test` assemblies in the solution. No JavaScript test runner. All verification is manual. The paths most dangerous to leave untested, in consequence order:

1. **DatabaseClient encode/decode round-trip** — a byte-offset bug silently corrupts Cold Turkey's settings database; no user warning, no detection until Cold Turkey misbehaves
2. **QueueSecurityValidator HMAC verification** — the security backbone; a regression here either blocks all legitimate requests or passes tampered ones
3. **WatchdogHeartbeat resurrection path** — the confirmed bug in §4 would be caught by a test that asserts which executable gets launched with which arguments
4. **API route path strings vs. handler CanHandle() patterns** — `CtblApiClient.js` calls `/blocks/enqueue-queued-delay`; the handler matches `"api/blocks/enqueue-queued-delay"`; these are implicit string contracts with no compile-time verification
5. **SqliteBaseRepository ALTER TABLE migrations** — failures are `catch { }`'d silently; a migration that fails for any reason other than "column already exists" leaves the schema in a partial state
6. **InternetTimeSource fallback behavior** — if the time source is unreachable, it is unclear whether queue processing falls back to local time; a compromised local clock could cause delays to fire early

---

## 6. Documentation

### [Gap] CTB17 encoding constants are unexplained

`DatabaseClient.cs` defines `const string PREFIX = "CTB17"` and `const int OFFSET = 17`. Neither constant has a comment. Missing context: which version of Cold Turkey introduced this format, whether the format has changed historically, whether "CTB17" encodes a version number, and what a future developer should do if the prefix check fails at runtime.

Similarly, the v1→v2 signature migration in `SqliteQueueRepository.cs` is implemented but the delta between v1 and v2 payload formats is not documented. The `Classify()` backfill method in `QueueRequestKinds.cs` encodes legacy dispatch rules (TargetUrl pattern matching) with no explanation of when or why these rules existed before the `Kind` column was added.

---

### [Gap] JSONP choice is undocumented despite CORS headers being present

The Engine sets `Access-Control-Allow-Origin: *` on every response. The frontend exclusively uses jQuery JSONP (`dataType: "jsonp"`). JSONP was presumably chosen because the UI originally ran from `file:///` and could not make cross-origin XHR. But CORS headers mean regular `fetch()` would also work from `file:///` on modern browsers.

JSONP is deprecated, cannot use POST bodies, and passes all parameters as query strings (including `payload: encodeURIComponent(JSON.stringify(payloadObj))` — a potentially large string). The decision to keep JSONP rather than migrate to `fetch()` is not documented. A future developer who adds an API endpoint with a large body will hit URL length limits before they understand why POST is being sent as GET.

---

### [Gap] No CI pipeline means no automated verification that build artifacts stay in sync

There are no GitHub Actions workflows, no automated build gate, and no test runner. The build system is `ctbl.bat` (interactive menu) and `Deploy.ps1` (UI deployment). Nothing verifies that:

- The `Bundled/bundle.js` in the repo matches the current state of `Raw/`
- The `WebPayload.zip` embedded in the Installer matches the current `Bundled/`
- The C# solution builds cleanly after a frontend change (or vice versa)
- The API surface in `CtblApiClient.js` matches the registered route handlers in `Program.cs`

All of these are cross-component invariants that can silently break between any two commits.

---

## 7. Dependency Risks

### [Risk] Entire integration fails silently if Cold Turkey changes its encoding or COM API

Cold Turkey is a closed-source commercial product outside the developer's control. Three integration points carry no fallback detection:

- **data-app.db encoding** — guarded only by a prefix check; a format change results in `InvalidDataException` propagating through the queue dispatcher
- **window.external COM API** — scattered call sites, no abstraction; a renamed method breaks each call site independently at runtime
- **Web folder path** — `C:\Program Files\Cold Turkey\web` is hardcoded in both `LocalWebServerService.cs` and `Deploy.ps1`; a Cold Turkey installer that moves the web folder breaks both the running Engine and the dev deploy script simultaneously

There is no version check against the installed Cold Turkey version at startup, no compatibility matrix, and no documented minimum/maximum Cold Turkey version.

---

### [Note] Vendored JS libraries have no version manifest or update mechanism

The `vendor/` directory inside `Raw/` contains copies of jQuery, Bootstrap, bootstrap-datetimepicker, and Flot. These are not managed by npm (no entry in the Scripts `package.json`) and have no version-pinning manifest. A security issue in the vendored jQuery would require a manual file replacement with no tooling to discover that an update is needed.

The ML pipeline referenced in the roadmap (Gemma 4 E2B, Lfm2.5, Gemma 3 1B) does not yet exist. When it lands, its Python dependencies will introduce a separate dependency surface (PyPI packages, model weights, inference runtime) that the current build system has no mechanism to manage.

---

### [Note] net localgroup parsing in the Installer is locale-sensitive

`InstallationOrchestrator.cs` calls `net localgroup Administrators` and parses the output. On non-English Windows, the Administrators group name is localized (German: *Administratoren*, French: *Administrateurs*, etc.). If CTBL++ is ever installed on a non-English Windows system, this parse fails.

**A robust alternative:** `WindowsIdentity` + `WindowsPrincipal.IsInRole(WindowsBuiltInRole.Administrator)` is locale-independent.

---

## Priority Action List

| Priority | Finding | Location |
|----------|---------|----------|
| 1 | Watchdog cannot resurrect Engine — wrong exe launched | `WatchdogHeartbeat.cs HandleDeathAsync()` |
| 2 | HMAC comparison inconsistency — plain `==` on pipe channel | `PidBroker.cs`, `WatchdogHeartbeat.cs` |
| 3 | CTB17 encoding has no version detection before write | `DatabaseClient.cs` |
| 4 | `coldTurkeyAPI.js` stub — window.external calls undocumented | Scattered across WebUI components |
| 5 | WebPayload.zip vs Deploy.ps1 can diverge silently | `Installer/`, `Deploy.ps1` |
| 6 | No tests for DatabaseClient round-trip or HMAC validation | Solution root |
