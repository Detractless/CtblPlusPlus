# CTBL++ Known Issues and Surface-Level Findings

**Merged from:** code-review.md · code-review-findings.md · frontend-code-review.md · frontend-ui-review.md · build-system-review.md · ci-build-review-2026-07-05.md · cross-component-review.md · holistic-review-2026-07-05.md · block-type-system-review.md · agent-skill-review.md · skill-library-review.md  
**Date of source reviews:** 2026-07-05

---

## File / Folder Structure

**F-01 — No `.sln` file at repo root**  
Visual Studio cannot open the solution as a unit. IDE refactoring across projects is broken. There is no solution-level `dotnet build` command; `ctbl.bat` works around this but it is a genuine contributor friction point.  
*Source: build-system-review.md*

**F-02 — No `Directory.Build.props`**  
Each `.csproj` independently declares `<Nullable>enable</Nullable>`, `<ImplicitUsings>enable</ImplicitUsings>`, and `<TargetFramework>net10.0-windows</TargetFramework>`. A shared `Directory.Build.props` at the root would centralize these and prevent drift. Of note: `CtblPlusPlus.Infrastructure.csproj` enables `UseWindowsForms` and `UseWPF` without explaining why a headless infrastructure library needs the WPF/WinForms SDK surface.  
*Source: build-system-review.md*

**F-03 — No `global.json` — required SDK version unspecified**  
The solution targets `net10.0-windows` but there is no `global.json` to pin the SDK. A developer with .NET 9 gets a confusing framework error; one with .NET 11 preview may encounter silent behavioral differences. Fix: add `global.json` with `"sdk": { "version": "10.0.xxx", "rollForward": "latestFeature" }`.  
*Source: ci-build-review-2026-07-05.md*

**F-04 — No `.gitignore` — build artifacts committed to repo**  
`bin\`, `obj\`, `Payload.zip`, `WebPayload.zip`, the `_payload\` staging directory, and the webpack `Bundled\` output are all unguarded. `node_modules\` (with platform-specific Windows shims) is committed. The committed `.claude\settings.local.json` confirms artifacts are already in version history. Option [5] Clean is the only backstop, and it must be remembered before every stage operation.  
*Source: build-system-review.md · ci-build-review-2026-07-05.md (BLD-04). Flagged by both sweepers.*

**F-05 — `Bundled/` directory git-tracked alongside source**  
Every source file in `Raw/` has a counterpart in `Bundled/Raw/`. The 346 KB `bundle.js` is also tracked. Every commit touching source produces a doubled diff. These blobs cannot be removed from history without a rewrite. Fix: add `Bundled/` to `.gitignore`; commit only the `webpack.config.js` build script and document the build workflow.  
*Source: frontend-ui-review.md*

**F-06 — `.claude/settings.local.json` committed with another developer's machine paths**  
The committed file contains absolute paths from a different developer's machine (`C:\Users\Calibro1\…`) and from a prior project version (`CTBL ++ Version 0.2.1.3 / 0.2.7.5`). It leaks the working-directory layout and username of whoever originally committed it. Fix: add to `.gitignore` and remove the committed copy.  
*Source: ci-build-review-2026-07-05.md (CFG-02)*

**F-07 — `node_modules/` committed with platform-specific Windows shims**  
Platform-specific `.ps1`/`.cmd` shims from the original Windows build machine are in version control. Contributors on other machines receive the original developer's `node_modules`. `npm install` is never reliably triggered; the committed copy may be stale relative to `package-lock.json`.  
*Source: build-system-review.md*

**F-08 — Third-party binaries committed to `assets/`**  
`assets/ColdTurkey_Installer.exe` and `assets/MicrosoftEdgeWebView2Setup.exe` are committed as binary blobs. Cold Turkey updates its installer; the committed copy goes stale silently. Redistributing Cold Turkey's installer requires verifying their terms. A commit that replaces these binaries is easy to miss in a diff review. Fix: download at install time from official URLs and verify a pinned SHA-256 hash.  
*Source: build-system-review.md*

**F-09 — Empty CSS and JS placeholder files fire useless HTTP requests and clutter the tree**  
Empty files: `FrozenAutostartEditor.css`, `RandomTextBreakModal.css`, `StatsToggle.css`, `StatsEnabler.css`, `BlockOrderToggle.css`, `LockReminderModal.css`, `ImportBlocks.css`, `ExtensionInstallModal.css`, `OverviewPage.css`, `services/coldTurkeyAPI.js`, `components/BlockModal/BlockModal.js`. None are imported by any current code. Fix: delete them and remove their `<link>` tags from `index.html`.  
*Source: frontend-ui-review.md*

**F-10 — Namespace/folder mismatch for enforcer classes**  
Files in `CtblPlusPlus.Infrastructure\Enforcers\` declare namespace `CtblPlusPlus.Infrastructure.Security.Enforcers`. The folder path omits `Security`. This is inconsistent and makes navigating by namespace vs. directory confusing.  
*Source: code-review.md (5.4)*

**F-11 — No `ARCHITECTURE.md` exists — both architect skills reference it**  
`Skill_Csharp_Architect.md` and `Skill_Html_Architect.md` both contain verification checklist items that say "document decisions in `ARCHITECTURE.md`." No such file exists in the repository. Architecture documentation is in `README.md`. Both verification steps silently fail every time the skills are run.  
*Source: agent-skill-review.md · skill-library-review.md. Flagged by both sweepers.*

**F-12 — `Docs/` subfolder in `.agents/` has no format or naming convention**  
`amazon-vm-ie-webview-fix.md` has no frontmatter. If more documents are added to `Docs/`, there is no convention to follow. The subfolder's purpose relative to `Skills/` is also undocumented.  
*Source: agent-skill-review.md*

---

## C# Backend

### Critical / High Severity

**CS-01 — `AclHelper` accumulates duplicate ACEs on every pulse — DACL overflow within hours**  
**Files:** `CtblPlusPlus.Infrastructure/Security/Lockdown/AclHelper.cs:28`; also `PersistenceEnforcer.cs:76` (5-second pulse), `VaultAclEnforcementService.cs:54` (60-second pulse)  
`DenyAdminWrite`, `DenyAdminDelete`, and `HardenVault` all call `acl.AddAccessRule(denyRule)` followed by `SetAccessControl` with no idempotency check. Every pulse appends a new ACE for the same SID. NTFS DACLs are capped at ~64 KB. At one `DenyAdminWrite` per 5 seconds from `PersistenceEnforcer`, the DACL overflows in roughly 2.5–3 hours of uptime. After overflow, `SetAccessControl` throws; the exception is swallowed by the bare `catch { }` in `EnforceAcls`, and the DACL is permanently broken. `HardenVault` also re-grants SYSTEM full control on every call, accumulating duplicate Allow ACEs. Fix: before `AddAccessRule`, query `acl.GetAccessRules(true, false, typeof(SecurityIdentifier))` and skip adding a rule if an equivalent entry already exists.  
*Source: code-review-findings.md (#1 — unique to that sweeper)*

**CS-02 — `WatchdogHeartbeat.HandleDeathAsync:259` launches the wrong binary — Engine resurrection is dead**  
**File:** `CtblPlusPlus.Infrastructure/Security/WatchdogHeartbeat.cs:259`  
`_exePath` is assigned from `Process.GetCurrentProcess().MainModule?.FileName` — the watchdog's own EXE path (e.g., `CtblPlusPlus.Wd1.exe`). When `targetName == "Engine"`, the method launches the watchdog's own binary with `--engine`. `Wd1/Program.cs` has no argument parsing and hardcodes `const string wdName = "Wd1"`. The launched process hits `Global\CtblPlusPlus_Wd1_Mutex` and exits silently. The entire cross-process healing path from watchdogs to Engine is non-functional. `PidBroker.ResurrectProcess` (lines 224–249) does this correctly by building an explicit path from the exe name; `WatchdogHeartbeat` must mirror that approach. Fix: derive `targetExePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "CtblPlusPlus.Engine.exe")` when `targetName == "Engine"`.  
*Source: code-review.md (3.1) · code-review-findings.md (#2) · build-system-review.md (§10) · cross-component-review.md (§3 Critical) · holistic-review-2026-07-05.md (§4 Critical). Flagged by all five backend sweepers.*

**CS-03 — JSONP callback injected into response without validation — script injection via localhost**  
**File:** `CtblPlusPlus.Engine/LocalWebServerService.cs:161`  
`callback` is taken from the query string and interpolated directly: `jsonResponse = $"{callback}({jsonResponse});"`. Any web page can request `http://localhost:58123/api/...?callback=<arbitrary_code>` and the browser executes the injected code. Because `Access-Control-Allow-Origin: *` is set, any origin can trigger this — no user interaction required beyond visiting a malicious page while the engine runs. Fix: validate `callback` against `^[a-zA-Z_$][a-zA-Z0-9_.]*$` before interpolation, or remove JSONP support entirely.  
*Source: code-review-findings.md (#3 — unique to that sweeper; related CORS/JSONP findings also in ci-build-review SEC-01/SEC-02)*

**CS-04 — `PidBroker.ExecuteAsync:44` — Unobserved fire-and-forget health monitor**  
**File:** `PidBroker.cs:44`  
```csharp
_ = Task.Run(async () => { while (!stoppingToken.IsCancellationRequested) { ... } }, stoppingToken);
```
Any exception thrown inside the lambda is silently lost. If `Process.GetProcessById` throws, the entire health-monitor loop dies permanently with no trace. The task is not stored, not awaited in `StopAsync`, and not observed. Fix: store as `_monitorTask = Task.Run(...)`, await it in `StopAsync` after cancellation, add a top-level `try/catch` that logs and continues inside the loop.  
*Source: code-review.md (1.1) · code-review-findings.md (#6). Flagged by both C# sweepers.*

**CS-05 — `DpapiHmacProvider.InitializeCryptoKey` proceeds without mutex on 30-second timeout**  
**File:** `DpapiHmacProvider.cs:37`  
```csharp
mutexAcquired = keyInitMutex.WaitOne(TimeSpan.FromSeconds(30));
// No else / no throw — execution continues regardless
try { if (File.Exists(_keyPath)) { /* read key */ return; } /* generate and write new key */ }
finally { if (mutexAcquired) keyInitMutex.ReleaseMutex(); }
```
If `WaitOne` times out, execution falls through into the `try` block without holding the mutex. Two processes could simultaneously generate different keys, write them over each other, and end up with a key mismatch — causing all subsequent HMAC verifications to fail. Fix: `if (!mutexAcquired) throw new TimeoutException("Key initialization mutex timed out.");`  
*Source: code-review.md (8.7)*

**CS-06 — `LocalWebServerService.cs:72` — `Access-Control-Allow-Origin: *` on the enforcement API**  
Port 58123 handles queue operations, block control enable/disable, schedule changes, and Cold Turkey block configuration. `Access-Control-Allow-Origin: *` means any web page the user has open can call these APIs cross-origin. For a tamper-resistance tool, a malicious page can disable enforcements or enqueue delay unlocks with no user interaction. Fix: restrict to `null` (the `file://` origin the bundled UI uses), or restrict CORS and remove JSONP to be consistent (see CS-03).  
*Source: code-review.md (8.5) · ci-build-review-2026-07-05.md (SEC-01) · build-system-review.md (§9). Flagged by three sweepers.*

**CS-07 — `PidBroker:138,54` — Dual resurrection race — duplicate `Process.Start`**  
**File:** `PidBroker.cs:138, 54`  
Two concurrent paths both call `ResurrectProcess` for the same watchdog within the same window: (1) `_ = WaitForProcessAsync(pid, wdName, stoppingToken)` fires the moment the process exits; (2) the background health-monitor loop fires when the heartbeat is stale, which happens immediately when the process dies. There is no flag to indicate "resurrection already in progress." Both paths call `Process.Start`; the first may kill the process the second just started. Fix: introduce a per-watchdog `bool _wd1Resurrecting` flag set before `Process.Start`, cleared after registration.  
*Source: code-review.md (2.3) · code-review-findings.md (#5). Flagged by both C# sweepers.*

**CS-08 — `VaultRecoveryService.LoadManifest:51` — DPAPI failure indistinguishable from file-not-found**  
```csharp
catch { return null; }
```
A `CryptographicException` (vault created on a different machine, DPAPI key rotated) returns `null` identically to "file doesn't exist." `IntegrityVerificationService.VerifyIntegrity` line 58 then logs `"Integrity check skipped."` and exits — silently disabling the entire integrity verification path. A DPAPI failure should be logged at error severity and treated as a failure, not a skip.  
*Source: code-review.md (1.3)*

**CS-09 — `WatchdogHeartbeat.HandleDeathAsync` vault subfolder contract mismatch with `PidBroker`**  
`VaultRecoveryService.RestoreTarget(targetSubfolder, destinationDir)` is called with `"CtblPlusPlus"` by `WatchdogHeartbeat` when restoring a watchdog binary, but `PidBroker` calls it with `Path.GetFileNameWithoutExtension(wdExeName)` (resolving to `"CtblPlusPlus.Wd1"`). One of the callers extracts the wrong set of vault entries. There is no documentation of the vault's internal directory structure to determine which caller is correct.  
*Source: cross-component-review.md (§3 High)*

### Medium Severity

**CS-10 — `PidBroker.cs:199`, `WatchdogHeartbeat.cs:222` — bare `catch { }` swallows `OperationCanceledException`**  
Both methods have a final `catch { }` / `catch (Exception) { }` that swallows `OperationCanceledException`. When the host cancels `stoppingToken`, the await on `proc.WaitForExitAsync` throws `OperationCanceledException`, which disappears rather than propagating cleanly. Resurrection is also attempted during clean shutdown. Fix: both should filter `catch (Exception ex) when (ex is not OperationCanceledException)`.  
*Source: code-review.md (1.2)*

**CS-11 — `PersistenceEnforcer.EnforceAcls:91` — silent ACL enforcement failure**  
```csharp
catch { }
```
No logging when `AclHelper.DenyAdminWrite` throws. This is the principal anti-tamper enforcement method in `PersistenceEnforcer`, which runs every 5 seconds. Silent failure means ACL drift goes completely undetected. (Also note: without CS-01 fixed, every call accumulates duplicate ACEs regardless.)  
*Source: code-review.md (1.4)*

**CS-12 — `IntegrityVerificationService.VerifyIntegrity:87` — hash read failure triggers spurious vault restore**  
```csharp
try { using var fs = ...; actualHash = ...; }
catch { actualHash = string.Empty; }
if (!string.Equals(actualHash, expectedHash, ...)) { restorationNeeded = true; }
```
If a file is temporarily locked (e.g., by `BinaryFileLockService`'s own open handles), the hash read throws, `actualHash` becomes `""`, the comparison fails, and the entire vault is restored. The two services will fight each other. Fix: catch `IOException` separately and either retry or log without triggering a restore.  
*Source: code-review.md (1.5)*

**CS-13 — `PrivilegeEnforcer.RunSecedit` — no failure propagation from `secedit.exe`**  
```csharp
if (process?.ExitCode != 0 && process?.ExitCode != 1)
{
    // Log warning but don't necessarily throw — and there is no log statement here
}
```
`secedit.exe` failures (exit code 3, permission denied, etc.) are silently ignored, meaning privilege policy changes fail invisibly.  
*Source: code-review.md (1.7)*

**CS-14 — `Thread.Sleep` blocking thread-pool threads in async call chain**  
**Files:** `QueueBatchContext.cs:38, 50`; `PidBroker.cs:216`  
`GetCtblState` is called from async `ProcessQueueAsync`. `Thread.Sleep(500)` there pins a thread-pool thread for up to 2500 ms (5 retries × 500 ms). `PidBroker.ResurrectProcess` contains `Thread.Sleep(1000)` reached via an async path. Fix: replace all instances with `await Task.Delay(...)` after making the enclosing methods async.  
*Source: code-review-findings.md (#7)*

**CS-15 — `PidBroker.cs:92`, `WatchdogHeartbeat.cs:56` — single-read buffer assumes complete message**  
Both sides assume a complete message arrives in one `ReadAsync`. With `PipeTransmissionMode.Byte` (the default), the OS can split a write across multiple reads. If a message is fragmented, `rawLine` is partial, the HMAC fails, and the connection drops with "Protocol Violation." Fix: switch to `PipeTransmissionMode.Message` (which preserves write boundaries) or implement length-prefixed framing.  
*Source: code-review.md (2.1) · code-review-findings.md (#17). Flagged by both C# sweepers.*

**CS-16 — `PidBroker.cs` — stale PIDs cause spurious re-resurrections**  
When `ResurrectProcess` starts a new watchdog, the PID fields are not updated until the new watchdog re-registers via pipe (several seconds later). During that interval, the health monitor sees the old dead PID, calls `ResurrectProcess` again every 10 seconds. The mutex prevents duplicate instances, but orphaned `Process.Start` calls accumulate until re-registration completes.  
*Source: code-review.md (2.4)*

**CS-17 — `TimeEnforcer.ExecuteAsync` exits permanently on violation — enforcement disabled for the session**  
**File:** `TimeEnforcer.cs:136, 169`  
`return` exits `ExecuteAsync`, permanently stopping the hosted service. `BackgroundService` treats this as the service completing — there is no restart mechanism. `_isDirtyFlag` is left `true` (only cleared in `StopAsync`, which never runs after a `return`). On next startup, `LoadPersistence` reads `IsDirty=True` and fires the offline-lockdown path — even though the shutdown was a valid violation response, not a crash. Fix: replace `return` with `continue` to stay in the loop.  
*Source: code-review.md (3.3) · code-review-findings.md (#4). Flagged by both C# sweepers.*

**CS-18 — `AccountEnforcer`/`FactoryResetEnforcer` — concurrent writes to same registry value**  
`AppendHideAccounts`, `RemoveHideAccounts` (`AccountEnforcer`) and `AppendHideRecovery`, `RemoveHideRecovery` (`FactoryResetEnforcer`) all independently read, modify, and write `HKCU\...\Policies\Explorer\SettingsPageVisibility`. Neither enforcer knows about the other's tokens; concurrent 60-second ticks can overwrite each other's changes. Fix: a single `SettingsPageVisibilityEditor.Add(tokens)` / `.Remove(tokens)` with an atomic read-modify-write, which also addresses the duplication in CS-34.  
*Source: code-review.md (4.3)*

**CS-19 — `NativeMethods.SetCriticalProcess` leaks a Win32 HANDLE**  
**File:** `NativeMethods.cs:44`  
```csharp
if (OpenProcessToken(Process.GetCurrentProcess().Handle, ..., out hToken))
{
    AdjustTokenPrivileges(hToken, ...);
    // hToken is never CloseHandle'd
}
```
`SetCriticalProcess` is called at startup and stop for both watchdogs and the Engine — 6 leaked handles per combined process lifetime. Fix: P/Invoke `CloseHandle` in a `finally` block after `AdjustTokenPrivileges`.  
*Source: code-review.md (6.1) · code-review-findings.md (#8). Flagged by both C# sweepers.*

**CS-20 — `CtblCliClient.ExecuteCommand:177` and `KillService:73,83` — `Process` objects not disposed**  
`Process` implements `IDisposable` and holds a native process handle. `KillService` has two instances (`p1`, `p2`). Not disposing means handles are held until GC finalizes. All three should use `using var`.  
*Source: code-review.md (6.2)*

**CS-21 — `LocalWebServerService` — no `StopAsync` override to close `HttpListener`**  
`_listener.Close()` is called in `ExecuteAsync`'s `finally`, but if the host's `StopAsync` timeout is exceeded, `ExecuteAsync` may be abandoned — leaving the `HttpListener` open and holding port 58123. Fix: override `StopAsync` and call `_listener.Abort()` (non-blocking) before calling `base.StopAsync`.  
*Source: code-review.md (6.3)*

**CS-22 — `TimeEnforcer.ExecuteAsync:72` — fire-and-forget with synchronous lambda and `DateTime` race**  
```csharp
_ = Task.Run(() => {          // NOT async
    DateTime? startupAuthTime = _timeSource.GetUtcTime(out _);
    if (...) { _highWaterMarkUtc = ...; SavePersistence(); }
}, stoppingToken);
```
The `CancellationToken` only cancels task scheduling, not the running HTTP fetch. The assignment `_highWaterMarkUtc = startupAuthTime.Value` on the task thread races with `UpdateHighWaterMark(currentUtc)` on the main loop thread at line 103. `DateTime` is an 8-byte struct; the assignment is not guaranteed atomic.  
*Source: code-review.md (7.1)*

**CS-23 — `CtblCliClient.ExecuteCommand:185` — `WaitForExit(3000)` blocks the thread pool**  
Inside an `async Task` method, `process.WaitForExit(3000)` is a synchronous block of up to 3 seconds on a thread-pool thread. Fix: use `await process.WaitForExitAsync(cts.Token)` with a linked `CancellationTokenSource`.  
*Source: code-review.md (7.2)*

**CS-24 — `CtblCliClient.KillService:80,91` — `WaitForExit()` with no timeout**  
Two synchronous `WaitForExit()` calls with no timeout. If `taskkill.exe` hangs (possible if IFEO is interfering, and `TaskManagerEnforcer` does target various system tools), this blocks the calling thread indefinitely.  
*Source: code-review.md (7.3)*

**CS-25 — `DatabaseClient.DecodeHexWithOffset` relies on undocumented byte underflow behavior**  
**File:** `DatabaseClient.cs:169`  
```csharp
int decodedValue = value - offset; // can be negative
bytes[i] = (byte)decodedValue;     // relies on unchecked two's-complement wrap
```
The encode side correctly uses `(b + offset) % 256`. The decode side relies on C#'s default unchecked cast behavior. This silently breaks inside a `checked { }` block or if explicit bounds checking is added. Fix: `bytes[i] = (byte)((value - offset + 256) % 256);`  
*Source: code-review.md (8.1)*

**CS-26 — `EngineLogger` and `LockdownLogger` use unsynchronized `File.AppendAllText`**  
Both loggers call `File.AppendAllText(logPath, ...)` without mutual exclusion. Multiple `BackgroundService` instances run on thread-pool threads and call these loggers concurrently. `File.AppendAllText` is not thread-safe for concurrent writers — two threads can interleave writes and produce merged or torn log lines. Fix: use a `Channel<string>` consumer, a `lock` around the append, or replace both with DI-native `ILogger<T>`.  
*Source: code-review.md (8.4)*

**CS-27 — `ScorchedEarthPurgeService.SearchAndDestroy` — synchronous recursive walk of System32 + WinSxS every 60 seconds**  
**File:** `ScorchedEarthPurgeService.cs:89`  
WinSxS on a typical Windows installation contains 50,000–150,000 files. `SearchAndDestroy` uses `Directory.EnumerateFiles` with manual recursion, all synchronously, on a thread-pool thread. This blocks a thread-pool thread for potentially several seconds every minute, causing thread-pool starvation that ripples into `Task.Delay` continuations in other hosted services. Fix: wrap the walk in `Task.Run(() => SearchAndDestroy(rootPath))`, add a `stoppingToken.ThrowIfCancellationRequested()` inside the recursion.  
*Source: code-review.md (8.8) · code-review-findings.md (#20). Flagged by both C# sweepers.*

**CS-28 — `SqliteQueueRepository:14` — `static` migration flags redundant on singleton class**  
```csharp
private static bool _kindBackfillDone = false;
private static readonly object _kindBackfillLock = new();
```
`SqliteQueueRepository` is registered as a singleton. `static` is correct in intent but misleading: if registration is ever changed to transient or scoped, the static flag silently breaks the migration guard. Convert to instance fields.  
*Source: code-review-findings.md (#14)*

**CS-29 — `DateTime.Now` and `DateTime.UtcNow` mixed across loggers — double-timestamped queue entries**  
**Files:** `EngineLogger`, `LockdownLogger`, `PersistenceEnforcer`, `AccountEnforcer`, `TaskManagerEnforcer`, `TimeEnforcer` all log `DateTime.Now` (local time). `QueueDispatcher` passes `DateTime.UtcNow` as a prefix into `context.Log()`, which then prepends another `DateTime.Now` via `EngineLogger`. Queue entries end up with two timestamps in different timezones. Standardize on `DateTime.UtcNow` everywhere.  
*Source: code-review-findings.md (#15)*

**CS-30 — `FileSystemWatchdogService.cs:65` — `C:\Users\Public\Desktop` hardcoded**  
`Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory)` two lines above already returns this path on standard systems. The hardcoded form breaks on non-C: system drives and is already covered by `Distinct()`. Delete the hardcoded string.  
*Source: code-review-findings.md (#16)*

**CS-31 — HMAC parse/verify block duplicated three times**  
**Files:** `WatchdogHeartbeat.cs:61–70` (registration response), `WatchdogHeartbeat.cs:134–143` (GET_PIDS response), `PidBroker.cs:102–115` (inbound message)  
The `SIG:<hmac>:<payload>` parsing pattern — `Split(':', 3)`, length check, sig extraction, `ComputeHmac` comparison — appears verbatim in all three places. Extract to a `static bool TryParseSignedMessage(string raw, IHmacProvider hmac, out string payload)` helper.  
*Source: code-review-findings.md (#18)*

**CS-32 — `KillWriteRestart()` leaves Cold Turkey dead if the DB write fails**  
**File:** `ColdTurkeyInjector.cs KillWriteRestart()`  
CT is killed before any write attempt. If the DB write fails (permission error, file locked, SQLITE_BUSY), the method returns without restarting CT. Cold Turkey remains dead. No blocking is active. No automated recovery restarts it, and no error is surfaced to the user. The watchdog layer monitors CT's process state, not write-path outcomes, so the dead CT is not a condition the watchdogs detect or recover from.  
*Source: cross-component-review.md (§4 Medium)*

**CS-33 — Port 58123 conflict silently treated as normal shutdown**  
**File:** `LocalWebServerService.cs`  
The exception handler catches `HttpListenerException` and logs "port conflict or normal shutdown" — then exits the listen loop without retrying, without alerting, and without attempting an alternative port. The Engine process continues running (all other hosted services unaffected), but the WebUI and queued delay dispatches through the API receive no response. No health-check endpoint surfaces this to the watchdogs.  
*Source: cross-component-review.md (§4 Medium)*

**CS-34 — `InternetTimeSource` failure at boot is indistinguishable from clock tampering — both trigger lockdown**  
**Files:** `TimeEnforcer.cs` · `InternetTimeSource.cs`  
`TimeEnforcer` sets `_isDirtyFlag = true` on startup. At startup it calls `InternetTimeSource.GetUtcTime()`, which tries up to 5 of 9 hardcoded public endpoints and requires two sources to agree within 10 seconds. On a complete network outage, captive portal, or corporate firewall, `TriggerLockdown()` fires — identical to the clock-manipulation code path. A user who was blocked yesterday, had their machine crash overnight, and boots on a flaky network is locked down with no indication this was a false positive.  
*Source: cross-component-review.md (§4 Medium)*

**CS-35 — `net localgroup` parsing in the Installer is locale-sensitive**  
**File:** `InstallationOrchestrator.cs`  
The installer calls `net localgroup Administrators` and parses the output. On non-English Windows, the Administrators group name is localized (German: *Administratoren*, French: *Administrateurs*). If CTBL++ is ever installed on a non-English Windows system, this parse fails silently. Fix: use `WindowsIdentity` + `WindowsPrincipal.IsInRole(WindowsBuiltInRole.Administrator)`, which is locale-independent.  
*Source: holistic-review-2026-07-05.md*

### Low Severity

**CS-36 — `SqliteBaseRepository.EnsureDatabaseCreated:85–96` — bare `catch { }` on schema migration**  
```csharp
try { command.CommandText = "ALTER TABLE ... ADD COLUMN ..."; command.ExecuteNonQuery(); }
catch { }
```
The intent is to swallow "duplicate column" errors. But any other `SqliteException` (locked database, schema corruption, disk full) is also swallowed with no indication. Should be `catch (SqliteException)` at minimum, or check the specific SQLite error code for duplicate columns.  
*Source: code-review.md (1.6)*

**CS-37 — `WatchdogHeartbeat.cs:96–166` — two pipe connections per 5-second heartbeat cycle**  
The monitoring loop opens one pipe for `HEARTBEAT` and a separate pipe for `GET_PIDS` — two full connect/read/write/disconnect round-trips every iteration. The `GET_PIDS` response can arrive before `HEARTBEAT` has updated `_lastHeartbeats`, creating a TOCTOU window where health checks read stale data. A single compound request would eliminate the extra round-trip and the race.  
*Source: code-review.md (2.2) · code-review-findings.md (#11). Flagged by both C# sweepers.*

**CS-38 — `BinaryFileLockService.ReleaseLocks()` called twice during shutdown**  
**File:** `BinaryFileLockService.cs:44, 81, 92`  
`ReleaseLocks()` is called in `StopAsync` (line 92) and in `ExecuteAsync`'s `finally` block (line 44). When the host stops, `StopAsync` disposes all handles and clears `_lockedHandles`. Cancellation then exits `ExecuteAsync`, whose `finally` calls `ReleaseLocks()` again on an already-empty list. Harmless currently but represents lifecycle confusion.  
*Source: code-review.md (3.2) · code-review-findings.md (#19). Flagged by both C# sweepers.*

**CS-39 — `Wd1/Program.cs` and `Wd2/Program.cs` are 28-line clones — 1-line functional difference**  
The two files differ only in `const string wdName = "Wd1"` vs `"Wd2"` and the service display name string. Mutex creation, `DpapiHmacProvider` registration, and `WatchdogHeartbeat` registration are all copy-pasted. A shared `WatchdogHostBuilder.Create(string wdName, string serviceName, string[] args)` in a shared project would reduce both files to 3–4 lines.  
*Source: code-review.md (4.1) · code-review-findings.md (#10). Flagged by both C# sweepers.*

**CS-40 — `RemoveToken` duplicated identically in `AccountEnforcer:208` and `FactoryResetEnforcer:217`**  
Both methods parse `SettingsPageVisibility` registry strings using the same logic (split on `;`, filter by token, rejoin). The only difference is `global::System.Collections.Generic.List<string>` vs `var`. This belongs in a shared `SettingsPageVisibilityHelper` static class.  
*Source: code-review.md (4.2)*

**CS-41 — Six enforcers still have private `Log()` methods despite `EngineLogger` existing**  
`TimeEnforcer`, `TaskManagerEnforcer`, `AccountEnforcer`, `FactoryResetEnforcer`, `PrivilegeEnforcer`, and `PersistenceEnforcer` each have a private `Log()` that calls `File.AppendAllText` directly. `EngineLogger.cs` has a comment saying it "Replaces the 8+ private Log() methods." The migration was never completed. Additionally, `WatchdogHeartbeat` uses `LockdownLogger` directly and `InternetTimeSource`/`VaultRecoveryService` also have their own direct appends. An operator tailing `process_log.txt` sees output from multiple formatters with no consistent component tagging.  
*Source: code-review.md (4.4) · code-review-findings.md (#12) · cross-component-review.md (§1 Medium) · holistic-review-2026-07-05.md (§1 Note). Flagged by four sweepers.*

**CS-42 — `SCREAMING_SNAKE_CASE` for private fields in three enforcers**  
`TaskManagerEnforcer.IFEO_KEY`, `TARGET_EXES`; `AccountEnforcer.ACCOUNT_URIS`, `EXPLORER_POLICY_KEY`; `FactoryResetEnforcer.SYSTEM_POLICY_KEY`, `EXPLORER_POLICY_KEY` — all private fields using a C/Java convention. C# idiom: `private const string IfeoKey` for constants, `private static readonly string[] TargetExes` for statics.  
*Source: code-review.md (5.1)*

**CS-43 — `Name` property: inconsistent syntax and dead public API**  
`TaskManagerEnforcer` uses `public string Name { get { return "..."; } }` while `TimeEnforcer` uses `public string Name => "..."`. More importantly, `Name` is declared on concrete classes but no interface or base class requires it — it is dead public API that nothing consumes.  
*Source: code-review.md (5.2)*

**CS-44 — `_isDirtyFlag` is a misleading name**  
**File:** `TimeEnforcer.cs`  
The field represents "the process did not clean-shutdown last time." `_uncleanShutdownFlag` or `_crashGuard` would be self-explanatory without reading the persistence file format.  
*Source: code-review.md (5.3)*

**CS-45 — `BinaryFileLockService` does not implement `IDisposable`**  
The class holds a `List<FileStream>` of open OS handles but does not implement `IDisposable`. In the crash path, handles are cleaned up by GC only.  
*Source: code-review.md (6.4)*

**CS-46 — `CtblCliClient.HideColdTurkeyWindowAsync` — polling loop with no cancellation**  
Called as fire-and-forget (`_ = HideColdTurkeyWindowAsync(process)`), this polls every 50 ms for up to 10 seconds (200 thread-pool wake-ups per `ExecuteCommand` invocation). There is no `CancellationToken` parameter. If `StartBlock`/`StopBlock` are called in rapid succession from `QueueDispatcher`, multiple overlapping instances accumulate with no way to cancel them.  
*Source: code-review.md (7.4)*

**CS-47 — `QueueDispatcher.ProcessQueueAsync:114` — unexplained `await Task.Delay(500)`**  
```csharp
if (context.CtblStateModified) { _stateStore.SaveDbState(stateToSave); await Task.Delay(500); // no comment }
```
No comment explains this pause. If it is a workaround for Cold Turkey needing time to pick up the updated database, it should be documented. If not needed, it adds 500 ms unnecessary latency per queue batch.  
*Source: code-review.md (7.5)*

**CS-48 — `WatchdogHeartbeat.cs:189` — dead ternary: both branches identical**  
```csharp
bool missingTarget = (currentEnginePid == 0 || otherWdPid == 0);
Task timeoutTask = missingTarget ? Task.Delay(5000, stoppingToken) : Task.Delay(5000, stoppingToken);
```
`missingTarget` is dead code — both branches produce the same result. The original intent was likely a shorter timeout when a target PID is unknown, but the two branches converged during editing.  
*Source: code-review.md (8.3) · code-review-findings.md (#13). Flagged by both C# sweepers.*

**CS-49 — `AppControlQueueHandler.HandleBulkRevoke:189` and `HandleBulkAllow:151` — N+1 repository calls**  
```csharp
foreach (var id in ids)
{
    var app = _repo.GetAllApps().FirstOrDefault(a => a.Id == id); // full SELECT per iteration
```
`GetAllApps()` runs a full table scan per loop iteration. For 20 apps, that is 20 queries in both handlers. Fix: call `GetAllApps()` once before the loop and build a `Dictionary<string, AppRegistryEntry>` keyed by `Id`.  
*Source: code-review.md (8.6)*

**CS-50 — `"Phase X"` comments are the only changelog across the codebase**  
Refactoring history is encoded purely as inline comments: *"Phase 1 fix retained"*, *"Phase 2 fix"*, *"Phase 06: IntegrityVerificationService re-enabled"*. These appear in `DpapiHmacProvider.cs`, `Program.cs`, and elsewhere. The phase numbering is inconsistent (Phase 3, Phase 06) and there is no external document mapping a phase number to what changed and why.  
*Source: holistic-review-2026-07-05.md*

---

## HTML / JS Frontend

### Critical Severity

**FE-01 — `TemplateLoader.appendComponentSync` uses `innerHTML +=` — destroys all existing jQuery event listeners**  
**File:** `utils/TemplateLoader.js:33`  
The `+=` operator serializes the entire existing DOM subtree to a string, concatenates new HTML, then re-parses and replaces the whole content. Every DOM node that previously existed is destroyed and recreated. Any jQuery event listeners bound to those nodes are silently lost because jQuery listeners live on the JS object, not in the serialized string. At startup, six modals are appended in sequence; each call destroys the listeners registered by all previous ones. This works only because each modal re-registers its own listeners at open time — an invisible invariant easy to break. Fix: replace `el.innerHTML += responseText` with `el.insertAdjacentHTML('beforeend', responseText)`.  
*Source: frontend-code-review.md (§01) · frontend-ui-review.md ([1.Critical]). Flagged by both frontend sweepers.*

**FE-02 — `utils/formatString.js` — `shortenOverviewBlockName` references three undeclared variables — live `ReferenceError`**  
```js
export function shortenOverviewBlockName(e) {
  var u = Math.floor(width / 10) - prefix.length - suffix.length;
  return u > 3 ? prefix + e + suffix : prefix + "This Block" + suffix;
}
```
`width`, `prefix`, and `suffix` are not parameters, not imports, and not declared anywhere in the file. This throws `ReferenceError: width is not defined` unless called from a context where those names happen to exist as globals. This is either dead code or a bug masked by implicit globals. Fix: add as parameters if in use, or delete.  
*Source: frontend-code-review.md (§05)*

**FE-03 — `styles/base.css` contains a verbatim duplicate of its first ~200 lines — drift has already begun**  
`base.css` declares global rules twice; the second block begins at approximately line 247. They have already diverged: the first block has `.no-select`, `.hidden`, `.bold`, `.green`, `.red`, and several utility classes the second block lacks. A future edit to only one copy silently has no effect on the other. Fix: delete the duplicate block (lines ~247–365).  
*Source: frontend-ui-review.md ([4.Critical])*

**FE-04 — `pages/SettingsPage/SettingsPage.js` committed partially minified**  
The first line is correctly formatted. Lines 2 onward are a single continuous minified string — no line breaks, no indentation, all variable names shortened. The full `updateSettings()` function, already the most complex in the codebase, cannot be read or debugged in this form. The file is 31.8 KB of nominally "source" that is functionally bytecode. Fix: replace with the unminified form; check git history for the last readable version. Configure the build to never write output back into `Raw/`.  
*Source: frontend-ui-review.md ([5.Critical])*

**FE-05 — `app.js:66` — `save()` calls `window.external` with no null guard — crashes in any non-WebView2 context**  
```js
export function save() {
    window.external.GetSettings(JSON.stringify(settings));
}
```
If `window.external` is `undefined` (browser DevTools, a test harness, any non-WebView2 environment), this throws a `TypeError` immediately. Every caller of `save()` across the codebase is equally unguarded. Fix: guard with `if (!window.external?.GetSettings)` before the call.  
*Source: frontend-ui-review.md ([6.Critical])*

**FE-06 — `styles/base.css:218` — `a:focus { outline: 0 }` removes the focus ring from every link**  
```css
a:focus, a:hover, a:active { outline: 0; }
```
This removes the browser's default focus indicator from every anchor tag. Keyboard navigation via Tab is functional but the user receives no visual feedback about which element is focused. Fix: use `:focus-visible` to preserve the focus ring for keyboard navigation while suppressing it for mouse clicks: `a:focus:not(:focus-visible) { outline: 0; } a:focus-visible { outline: 2px solid var(--color-accent); }`.  
*Source: frontend-ui-review.md ([7.Critical])*

**FE-07 — Three files exceed 100 KB of static HTML/template-string content**  
| File | Size |
|---|---|
| `BlockModal.html` | 104.7 KB |
| `SettingsPage.template.js` | 43.1 KB |
| `SettingsPage.html` | 37.8 KB |
| `OverviewRenderers.js` | 36.9 KB |
| `BreakEditorPage.js` | 35.0 KB |
| `LockEditorPage.js` | 33.2 KB |

`BlockModal.html` defines the entire block editing UI as a single file. No individual developer can hold 104 KB of HTML markup in working memory. Fix for `BlockModal.html`: split by tab — each tab in the block editor is a logical boundary; extract each tab's HTML into its own file and assemble via `TemplateLoader`.  
*Source: frontend-ui-review.md ([8.Critical])*

**FE-08 — `store/AppState.js:18–30` — moment-based dates initialized once at module load, permanently stale**  
```js
export const AppState = {
    statsBlockedWebStart: moment().startOf("week"), // frozen at startup
    statsBlockedWebEnd:   moment().endOf("week"),   // frozen at startup
    // ... 6 more moment() calls ...
};
```
These run exactly once — when the module is first imported. If the application is open at 11:59 PM Sunday and the user checks stats after midnight, these ranges point to the previous week with no error. Fix: initialize to `null` and compute lazily, or refresh when the user navigates to the Stats page.  
*Source: frontend-code-review.md (§03) · frontend-ui-review.md ([3.Critical]). Flagged by both frontend sweepers.*

### High Severity

**FE-09 — `components/Sidebar/Sidebar.html` — inline `onclick` calls globals that must exist at parse time**  
Buttons like `onclick="showUpgradeModal();"` evaluate against `window` at click time. The functions are assigned to `window.*` in `app.js` after the bundle runs. If the bundle errors before those assignments, every sidebar button throws with no visible feedback. Fix: remove inline handlers and bind in JS after `initRouter()`.  
*Source: frontend-code-review.md (§02)*

**FE-10 — `components/Toggle/Toggle.css` and `Modal.css` fully duplicated**  
`Toggle.css` is 103 lines, then the exact same 103 lines repeated verbatim. `Modal.css` has the same problem for the `.ui-dialog-titlebar`, `.ui-widget-overlay`, and `.noTitleModal` rule groups. A future edit to only the first copy has no effect. Fix: diff the two halves, confirm they are identical, delete one.  
*Source: frontend-code-review.md (§04)*

**FE-11 — No CSS color tokens — hardcoded hex values scattered across all files**  
The active-green (`#65a30d`) appears in `Toggle.css` seven times. The near-black (`#27272A`) appears four times. Theme files (`dark.css`, `light.css`) exist but component files ignore them and use raw hex instead. Adding a third theme requires creating a third 19 KB copy-paste. Fix: define custom properties on `:root` (`--color-active`, `--color-active-hover`, `--color-danger`, `--color-ink`, `--color-surface`) and reference them in component CSS.  
*Source: frontend-code-review.md (§04) · frontend-ui-review.md ([4.Medium]). Flagged by both frontend sweepers.*

**FE-12 — `utils/formatString.js` — `String.prototype` mutated in four places**  
```js
String.prototype.trimEnd = function() { ... };
String.prototype.normalizeOnlyHiddenChars = function() { ... };
String.prototype.normalizePassword = function() { ... };
String.prototype.normalizeCustomText = function() { ... };
```
The `trimEnd` override replaces the native ES2019 method. Any vendor library (jQuery, Moment) that calls `.trimEnd()` will silently get this replacement. Fix: remove all four prototype additions; convert to named utility exports.  
*Source: frontend-code-review.md (§05)*

**FE-13 — Four distinct communication channels between JS and C# — no shared error handling**  
1. Sync `window.external.*` COM calls
2. C# → JS script injection via `ExecuteScriptAsync`
3. Sync XHR to `http://localhost:58123/Raw/…` (template loading)
4. Async JSONP to `http://127.0.0.1:58123/api` (all API operations)

None share error handling or logging. Fix: document this map; create a single `bridge.js` that re-exports all `window.external.*` calls as named functions to make the surface area visible and testable.  
*Source: frontend-code-review.md (§06)*

**FE-14 — `services/CtblApiClient.js` — all API mutations use JSONP GET — state changes are cacheable and URL-length-limited**  
`dataType: "jsonp"` is used for every call including mutations like `toggleQueuedDelay`, `allowApp`, `revokeApp`, `enqueueBlockConfigChange`. JSONP forces GET. Consequences: requests can be cached by any HTTP proxy or browser cache; subject to URL length limits (`enqueueBlockConfigChange` sends `encodeURIComponent(JSON.stringify(payload))` in a query string, potentially exceeding 2000 characters for large block configs); DevTools shows them as script loads, not network calls. Fix: replace JSONP with standard `fetch()` POST calls.  
*Source: frontend-code-review.md (§06)*

**FE-15 — `services/CtblApiClient.js` — inconsistent URL encoding**  
Some calls use `encodeURIComponent(blockName)`, others do not. `bulkAllowApps` uses a pipe separator that is not encoded: if any ID contains `&`, `=`, or `+`, those parameters will be silently misread on the server side. Fix: encode consistently (or switch to POST + JSON body, which eliminates this entirely).  
*Source: frontend-code-review.md (§06)*

**FE-16 — `components/Sidebar/Sidebar.html` — no `<nav>`, no `aria-current`, no visible focus styles**  
Sidebar is `<div class="page-sidebar">` wrapping a `<ul>` — no `<nav>` landmark. Screen reader users navigating by landmarks cannot find the navigation. Active item has class `active` but no `aria-current="page"`. No visible focus styles are defined in reviewed CSS — native browser outline likely suppressed by Bootstrap. Fix (each a one-liner): wrap the `<ul>` in `<nav aria-label="Main navigation">`; in `navigateTo()`, set `aria-current="page"` on the active element; add `:focus-visible { outline: 2px solid var(--color-active); }` to `base.css`.  
*Source: frontend-code-review.md (§07) · frontend-ui-review.md ([7.Medium]). Flagged by both frontend sweepers.*

**FE-17 — `components/Modal/Modal.css` — dialog close button hidden from keyboard users**  
```css
.ui-dialog-titlebar-close { display: none; }
```
jQuery UI generates a close button in every dialog's title bar. `display: none` removes it from the tab order and the accessibility tree. If a user navigates into a dialog by keyboard, there is no tab-accessible escape path except the Escape key — which may or may not be wired. Fix: bind Escape in every dialog's `open` callback.  
*Source: frontend-code-review.md (§07)*

**FE-18 — `pages/BlocksPage/BlocksPage.js` — full DOM teardown every second — no diffing**  
`pollingService` calls `updateBlocks(false)` every second. `updateBlocks` calls `$('#blocks-list').empty()` then iterates all blocks, calls `calculateBlockState` (200+ line function) and `BlockCard` (600-char string builder) for each, and appends them all. At 10 blocks: rebuilding 6,000+ characters of HTML every tick; at 20 blocks: the browser destroys and recreates 40+ DOM nodes per second. Any focused element or open dropdown inside a block card is destroyed. Fix: compute a lightweight state key and skip the render if nothing changed.  
*Source: frontend-code-review.md (§08)*

**FE-19 — `components/BlockCard/BlockCard.js` — manual `toHtml()` escaping is the only XSS guard**  
Protection relies on calling `toHtml()` at each insertion point — inconsistently applied. Some attributes use the full chain `toHtml(e.replace(/'/g, ...)).replace(/"/g, ...)`, others use just `toHtml(e)`, others insert data directly into `data-*` attributes without escaping. Block names are user-provided and can contain characters that corrupt HTML structure. Fix: the tagged template literal helper (see FE-20) provides automatic escaping at every interpolation site.  
*Source: frontend-code-review.md (§08)*

### Medium Severity

**FE-20 — `components/BlockCard/BlockCard.js` — 600-character string template, unmaintainable**  
`BlockCard` is a single `return '<div...>'` statement with the entire card HTML as a concatenated string. Attributes are escaped manually with four separate `.replace()` chains. Adding a new column or fixing a typo means editing 600-character character soup. Fix: a tagged template literal helper centralizes escaping and makes the structure readable.  
*Source: frontend-code-review.md (§01)*

**FE-21 — Three DOM strategies coexist without a consistent rule for when to use each**  
The codebase builds DOM via: (1) template HTML files loaded via XHR and injected at startup; (2) jQuery helpers `.empty()`, `.append()`, `.text()`, `.html()` for targeted updates; (3) string concatenation → append, as in `OverviewPage.js`. None is wrong in itself, but mixing creates confusion. New code gets added to the nearest existing pattern. Recommended rule: static structural markup in HTML files; dynamic list content in template-literal functions; targeted scalar updates via jQuery `.text()/.val()/.prop()`.  
*Source: frontend-ui-review.md ([1.Medium])*

**FE-22 — `app.js` — six raw `window`/`document` bindings with no teardown**  
`$(document).keydown`, `$(window).bind("mousewheel DOMMouseScroll")`, `$(window).bind("mousedown")`, `$(document).on("contextmenu")`, `$(".no-typing").bind("keydown")`, `$(window).resize` — all added at startup with no cleanup path. Fix: group in `initGlobalEvents()`; use namespaced events (`"keydown.ctbl"`) so they can be selectively removed.  
*Source: frontend-code-review.md (§02)*

**FE-23 — `services/pollingService.js` swallows all exceptions silently**  
```js
try { updateOverview(); ... } catch (intervalError) {}
```
A JS error thrown anywhere inside `updateOverview()` or `updateBlocks()` disappears without trace. The polling continues every second and the user sees a frozen UI with no indication of what happened. Fix: at minimum, `console.error("[pollingService] Unhandled error:", intervalError)`.  
*Source: frontend-ui-review.md ([2.Medium]) · holistic-review-2026-07-05.md (§1 Note). Flagged by two sweepers.*

**FE-24 — `updateSettings()` cascades a full event-rebind of ~50 elements on every call from the poll loop**  
`updateSettings()` calls `bindBooleanSetting()` for every settings checkbox; each call does `.off("change").on("change", ...)`. In total, `updateSettings(true)` performs roughly 50 DOM queries and event registrations. It is called from the poll loop when the settings page is active — every second. Fix: separate the event-binding phase from the value-update phase; run `initSettingsEvents()` once on init.  
*Source: frontend-ui-review.md ([2.Medium])*

**FE-25 — `refreshQueuedDelayState` fires two sequential `updateBlocks()` calls with no coordination**  
`getQueuedDelays()` and `getConfiguredQueuedDelays()` both call `updateBlocks(true)` in their success handlers. If both succeed quickly, the blocks panel re-renders twice in rapid succession. Fix: use `$.when(...)` to fetch both, then render once.  
*Source: frontend-ui-review.md ([2.Medium])*

**FE-26 — `components/SecurityModal/SecurityModal.js`, `pages/BlocksPage/BlocksPage.js` — unlock state stored as composite string keys**  
`AppState.unlockedBlocks` stores entries as `"blockName\\lockType\\randomTextLength\\password"`. Membership is checked by constructing the same key inline at at least three independent call sites. If a block name contains a backslash, the key silently fails to match. Fix: encapsulate in `makeUnlockKey(name, block)` and `isUnlocked(name, block)` functions using a null-byte delimiter (`\x00`) to prevent field injection.  
*Source: frontend-code-review.md (§03)*

**FE-27 — `window.settings` global accessed directly at hundreds of call sites — no abstraction layer**  
The entire C# data model is exposed as a mutable global: `settings.blocks[blockId].lock`, `settings.settings.passwordStrict`, etc. Any rename or reshape of a field in the C# backend requires a grep-replace across the entire codebase. The `AppState.js` store already exists as the correct centralization point.  
*Source: frontend-ui-review.md ([3.Medium])*

**FE-28 — Boolean settings stored as strings `"true"/"false"` — over 100 fragile comparisons**  
```js
if (settings.blocks[blockId].enabled == "false") { ... }
if ("true" == settings.settings.statsEnabled) { ... }
```
An `undefined` field silently passes `!= "false"` as truthy. A JS `false` boolean also passes `!= "false"` as truthy (since `false != "false"` is `true`). Fix: add one helper `function isTrue(val) { return val === "true" || val === true; }` and use it everywhere.  
*Source: frontend-ui-review.md ([3.Medium])*

**FE-29 — `BlockCard.css` — `!important` used for standard spacing overrides**  
```css
.block-card { margin-bottom: 15px !important; margin-top: 15px !important; ... }
```
These fight Bootstrap's `.form-group` margin. Every `!important` in a component file is a specificity conflict that will worsen as new components are added. Fix: scope the override as `.blocks-list .block-card { margin: 15px 0; }`, which beats Bootstrap's `.form-group` at equal specificity via the parent selector — no `!important` needed.  
*Source: frontend-code-review.md (§04)*

**FE-30 — `utils/blockStateCalculator.js` and `components/SecurityModal/SecurityModal.js` — god files**  
`calculateBlockState` is a 200+ line function that imports from 15 modules, computes lock state, determines display text, decides which HTML strings to use for the toggle and autostart button, and handles 10+ distinct lock type branches inline. `SecurityModal.js` owns: the password dialog UI, the lock/unlock action dispatch table, the settings password flow, the block password flow, and three separate confirmation dialogs. Fix: split `calculateBlockState` into a pure state-computation function and a separate template layer; move `executeAction` and `requestUnlock` into a `lockActionDispatcher.js`.  
*Source: frontend-code-review.md (§05)*

**FE-31 — `app.js` — ~20 functions pinned to `window` for C# callbacks**  
`window.save`, `window.ForceSettingsUpdate`, `window.focusLost`, `window.getMaxZ`, `window.getBreakText`, `window.removeDate`, `window.editBreak`, `window.stats`, `window.showUpgradeModal`, and more. Any name collision with a vendor library or browser global is silent. The C#↔JS contract is invisible. Fix: single namespace object `window.CTBL = { save, ForceSettingsUpdate, ... }`.  
*Source: frontend-code-review.md (§05)*

**FE-32 — `index.html` — `window.onerror` shows a raw `alert()` in production with full stack trace**  
```js
window.onerror = function(message, source, lineno, colno, error) {
  alert("JS Error: " + message + "\nSource: " + source + "...");
};
```
Displays unhandled errors as blocking dialogs. Halts all JS execution until dismissed. If errors recur from the poll loop, the user receives a new alert every second. Exposes implementation details (file paths, stack traces) to end users. Fix: log to the existing `utils/errorTracker.js`; suppress the alert except for catastrophic initialization failures.  
*Source: frontend-code-review.md (§06) · frontend-ui-review.md ([7.Low]). Flagged by both frontend sweepers.*

**FE-33 — `updateBlocks()` empties and rebuilds list silently — no `aria-live` region**  
A screen reader user has no way to know the list has changed after `updateBlocks()` empties and rebuilds `#blocks-list` every second. Fix: add a visually-hidden `<div id="status-announcer" aria-live="polite" class="sr-only">` and update its text content when `updateBlocks()` detects a meaningful state change.  
*Source: frontend-code-review.md (§07)*

**FE-34 — `save()` sends the entire settings object on every change — no debouncing**  
`window.save()` calls `window.external.GetSettings(JSON.stringify(settings))`. Every mutation — toggling a block, renaming a list, changing a single preference — serializes and transmits the entire settings object. Rapid changes (typing in a text field) trigger multiple full serializations per second. Fix: debounce `save()` with a ~200–300 ms delay.  
*Source: frontend-code-review.md (§08) · frontend-ui-review.md ([6.Medium]). Flagged by both frontend sweepers.*

**FE-35 — Two separate bridge mechanisms for the same C# backend (`window.external` COM + JSONP localhost)**  
The codebase talks to C# in two different ways with different error handling, timeout behavior, and semantics. A developer reading the code cannot easily tell which bridge to use for a new feature, so both keep growing. Recommendation: decide on one bridge and migrate toward it; the REST API over localhost is the better long-term choice — async, testable without WebView2, and extensible.  
*Source: frontend-ui-review.md ([6.Medium])*

**FE-36 — `CtblApiClient` JSONP allows port-race injection**  
JSONP works by injecting a `<script>` tag pointed at the server and trusting it to call a global callback unconditionally. Any other process that binds to port 58123 before CTBL++ can inject code into the WebView. Error responses from the server are silently ignored (the callback is never called, not called with an error). JSONP does not support POST, which forces mutations like `enqueueBlockConfigChange` to be sent as GETs.  
*Source: frontend-ui-review.md ([6.Medium])*

**FE-37 — `base.css:12` — `user-select: none` on the body prevents copying block names and URLs**  
`user-select: none` is set on the entire body. This prevents selecting text anywhere in the application — including block names in the list, URLs in the exceptions list, and error messages. Fix: keep `user-select: none` on interactive controls (buttons, navigation items); remove it from the body.  
*Source: frontend-ui-review.md ([7.Medium])*

**FE-38 — `app.js` — `Object.defineProperty` bridge for `window.settings` is opaque and non-configurable**  
```js
Object.defineProperty(window, 'settings', { get: () => AppState.settings, set: e => AppState.settings = e });
```
Clever: C#'s `ForceSettingsUpdate` writes `window.settings` and it propagates into `AppState`. But it is completely undocumented, and the property is non-configurable by default. Any future attempt to override it will silently fail. Fix: add a comment explaining the chain — why `window.settings` is used, and how C# triggers `ForceSettingsUpdate`.  
*Source: frontend-code-review.md (§03)*

**FE-39 — Circular imports between pages and components — webpack resolves them now, but load-order shifts will break**  
`BlockModalDialogs.js` imports from `OverviewPage`, `SettingsPage`, `BlocksPage`, and `ScheduleEditorPage`. All four of those pages import from `BlockModalDialogs`. Webpack resolves this by making one side of each cycle receive an empty object at first evaluation, then filling it in later. When initialization order shifts, you get "X is not a function" with no obvious cause. Fix: move shared callbacks out of pages into a dedicated event module.  
*Source: frontend-ui-review.md ([5.Medium])*

**FE-40 — `coldTurkeyAPI.js` deprecated — `window.external` calls now scattered across component tree with no inventory**  
`coldTurkeyAPI.js` is the entire file: `// Deprecated. We now call window.external directly for perfect COM interop.` The native bridge is now called from scattered call sites throughout the component tree. There is no inventory of which `window.external` methods the UI depends on, no abstraction layer, and no documentation of what Cold Turkey's COM interface exposes. If Cold Turkey updates its WebView2 integration or changes a method name, every call site breaks independently.  
*Source: holistic-review-2026-07-05.md (§3 Gap) · skill-library-review.md*

### Low Severity

**FE-41 — DOM used as state for sort order**  
**Files:** `components/BlockCard/BlockCard.js`, `pages/BlocksPage/BlocksPage.js`  
`BlockCard` writes `data-alphabeticalOrder` onto each card element. `updateBlocks` then sorts on the jQuery collection of rendered strings by that attribute. The sort cannot happen until the HTML is built, and changing sort logic requires understanding the string format of the attribute. Fix: sort the data first, then render — the `settings.blocks` keys are available before rendering.  
*Source: frontend-code-review.md (§01)*

**FE-42 — `services/pollingService.js` — interval handle not stored, interval can never be stopped**  
`window.setInterval(fn, 1000)` with no handle stored. If the backend is briefly unavailable, the interval keeps firing and queueing network requests. Fix: store the interval handle in `AppState`; add a guard flag so that if the previous tick's update hasn't finished, the current tick is skipped.  
*Source: frontend-code-review.md (§02)*

**FE-43 — `OverviewPage.js:265` and `OverviewRenderers.js` — large HTML strings embedded in JS invisible to tooling**  
`OverviewRenderers.js` (36.9 KB) contains blocks of multi-hundred-character HTML strings built via string concatenation. Not syntax-highlighted, not linted as HTML, not reformattable by an HTML formatter. Fix: extract into named template functions using multi-line template literals.  
*Source: frontend-ui-review.md ([1.Low])*

**FE-44 — `app.js:199–203` — deprecated jQuery APIs: `.bind()`, `DOMMouseScroll`**  
`.bind()` was removed in jQuery 3.0. `DOMMouseScroll` is a Firefox-only legacy event. Fix: replace all `.bind()` with `.on()`; replace the wheel event with `"wheel"`.  
*Source: frontend-ui-review.md ([2.Low])*

**FE-45 — `AppState.lastRefreshedMinute` is written by three separate modules with no single owner**  
`AppState.lastRefreshedMinute = moment().minutes()` appears in `updateOverview()`, `updateSettings()`, and is read in the polling service. This should be a write-once property managed by the polling service, with a reset called explicitly.  
*Source: frontend-ui-review.md ([3.Low])*

**FE-46 — `MainLayout.css` and `index.html` — IE8 rules and manual cache-busting strings**  
`MainLayout.css` contains a `.ie8` block (WebView2 is Chromium — this rule is dead). `index.html` has `?v=2` appended to several CSS links as a manual cache-buster that will not be incremented consistently. Fix: remove the IE8 block; rely on the bundler for content-hash cache-busting.  
*Source: frontend-code-review.md (§04)*

**FE-47 — `services/CtblApiClient.js` and `utils/TemplateLoader.js` — port 58123 hardcoded in two files with inconsistent form**  
`CtblApiClient.js:7` uses `http://127.0.0.1:58123`; `TemplateLoader.js:4` uses `http://localhost:58123`. If the port changes, it must be updated in both places. Fix: define once as `export const API_BASE = "http://127.0.0.1:58123"` and import in both consumers.  
*Source: frontend-ui-review.md ([6.Low])*

**FE-48 — `base.css` — `font-size: 14px !important` on body overrides user's browser zoom preference**  
The comment indicates this was added for an IE text-in-textbox rendering bug. WebView2 (Chromium) does not have this bug. The override prevents browser zoom from scaling text correctly for users who have set a larger default font size. Fix: remove `!important` (or the rule entirely since IE is no longer a target).  
*Source: frontend-ui-review.md ([7.Low])*

**FE-49 — `utils/TemplateLoader.js` — synchronous XHR blocks the main thread at startup**  
`xhr.open("GET", url, false)` — the `false` argument means synchronous. 11–13 template loads at startup, each blocking the main thread until the local server responds. Synchronous XHR is deprecated in browsers and produces a console warning. Fix: batch all template fetches as concurrent async requests via `Promise.all(...)`, then inject in order before running any component initialization.  
*Source: frontend-code-review.md (§08) · frontend-ui-review.md ([8.Medium]). Flagged by both frontend sweepers.*

**FE-50 — `styles/` — global utility class names collide with Bootstrap: `.center`, `.right`, `.bold`, `.green`, `.red`**  
These occupy names Bootstrap might use in future versions. `.green` has no meaning if the design changes. Fix: rename to intent-based names (`.text-success`, `.text-error`) or prefix them (`.ctbl-center`).  
*Source: frontend-ui-review.md ([4.Low])*

---

## Build / CI / Scripting

**BC-01 — No GitHub Actions CI pipeline — zero automated build verification**  
The `.github/` entries visible in the file tree are all inside `node_modules`. There is no `.github/workflows/` directory at the project root. There is no automated build verification, no PR gate, no artifact publication. A contributor can push broken code and nothing catches it until someone runs `ctbl.bat` manually. `ctbl.bat` is an interactive menu-driven script with no non-interactive mode and cannot be wired into a CI runner as-is. Additionally, no CI pipeline means no automated verification that the `Bundled/bundle.js` in the repo matches the current state of `Raw/`, or that the C# solution builds cleanly after a frontend change.  
*Source: build-system-review.md (§1) · ci-build-review-2026-07-05.md (implied by BLD-03/04) · holistic-review-2026-07-05.md (§6 Gap). Flagged by three sweepers.*

**BC-02 — `InstallationOrchestrator.cs:438` — hardcoded admin password `"123"`**  
```csharp
private const string CtblAccountName = "CTBLAdmin";
private const string CtblInitialPassword = "123";
RunCmd("net", $"user \"{CtblAccountName}\" {CtblInitialPassword} /add");
```
The installer creates a local Windows administrator account named `CTBLAdmin` with password `123`. During the window between account creation and password change, a known local admin credential exists. If setup is interrupted or the user skips the change step, a permanent local admin backdoor exists with a trivially guessable password. The password is plaintext in source and readable via PE resource inspection. Fix: generate a cryptographically random password at install time using `RandomNumberGenerator`; display it once and then force-expire it.  
*Source: build-system-review.md (§6 Critical)*

**BC-03 — `ctbl.bat:42–63` — Debug binaries shipped in Release installer — no Release build path**  
Every `dotnet publish` for Engine, Wd1, and Wd2 passes `-c Debug`. These become `Payload.zip`, which the Installer embeds as an `EmbeddedResource`. When a contributor runs `[4] Publish single-file installer`, they get a Release-configured WPF wrapper around Debug service binaries — larger files, no JIT optimizations, PDB paths baked into assemblies. There is no supported path to a fully Release installer without manually editing the bat file.  
*Source: build-system-review.md (§3 High) · ci-build-review-2026-07-05.md (BLD-02). Flagged by both build sweepers.*

**BC-04 — `ctbl.bat` — `_payload\` directory never cleaned before a build — stale binaries coexist with fresh ones**  
If Engine publishes but Wd2 fails, `_payload\` is left on disk. The next `[1] Build` publishes into it without clearing it first — stale binaries from the failed run coexist with fresh ones. `Payload.zip` is then built from this mixed state and embedded into the Installer. Fix: add `if exist "%ROOT%_payload" rmdir /s /q "%ROOT%_payload"` at the top of `:build`, before any `dotnet publish`.  
*Source: ci-build-review-2026-07-05.md (BLD-01)*

**BC-05 — `CONTRIBUTING.md:62` documents a non-existent menu option — destructive on first try**  
The guide tells authorized contributors to run `[5] Split / Combine → [2] Combine`. Option `[5]` in the current `ctbl.bat` is "Clean project for GitHub" — a destructive operation that deletes build outputs. A contributor following those instructions would nuke their build artifacts on their first interaction with the build system.  
*Source: build-system-review.md (§3 Medium) · ci-build-review-2026-07-05.md (BLD-03). Flagged by both build sweepers.*

**BC-06 — Services not self-contained; .NET 10 not installed by the installer**  
`ctbl.bat` calls `dotnet publish` without `--self-contained true`. On a clean machine without .NET 10, all three services fail to start with a cryptic "host not found" error. `InstallationOrchestrator.cs` has no step to check for or install .NET 10. Fix: add `--self-contained -r win-x64` to service publish commands, or add a .NET runtime detection/installation step.  
*Source: build-system-review.md (§5 High)*

**BC-07 — `ctbl.bat` — `Publish` step does not rebuild the payload — ships stale binaries silently**  
`ctbl.bat:172`: `dotnet publish` on the Installer embeds whatever `Payload.zip` and `WebPayload.zip` currently exist on disk. If they are stale or built with a previous version, the published exe silently ships wrong binaries. The comment "Run `[1] Build` first" is the only guard. Fix: detect missing/stale zips and abort with an error, or make the publish step always rebuild the payload.  
*Source: build-system-review.md (§3 Medium)*

**BC-08 — Fresh clone fails on Installer build — `Payload.zip` and `WebPayload.zip` don't exist yet**  
Both zip files are declared as `<EmbeddedResource>` in `CtblPlusPlus.Installer.csproj:23–27` but are generated by `ctbl.bat` before the Installer builds. On a fresh clone, neither exists. A contributor who runs `dotnet build CtblPlusPlus.Installer` directly gets either an MSBuild missing-file error or a silently broken installer. Fix: add a `BeforeBuild` target that emits a clear diagnostic if the zip files are absent.  
*Source: ci-build-review-2026-07-05.md (BLD-05)*

**BC-09 — `Installer/WebPayload.zip` can silently diverge from `Deploy.ps1` output**  
Two mechanisms deploy the patched UI: `Deploy.ps1` (dev workflow) and `Installer/WebPayload.zip` (end-user workflow). If a developer runs `Deploy.ps1` but does not rebuild the Installer project, installed end-users and the developer's own machine run different UI versions. No hash check, no manifest comparison, and no build step enforces they are in sync.  
*Source: holistic-review-2026-07-05.md (§3 Gap)*

**BC-10 — `Deploy.ps1` exits with code 0 on all failure paths**  
Lines 19–24, 31–34, 41–44 all call `exit` on failure. In PowerShell, `exit` without a code exits with `0`. Any calling script that checks `$LASTEXITCODE` sees success even when deployment failed. Fix: replace all failure-path `exit` calls with `exit 1`.  
*Source: build-system-review.md (§4 Medium)*

**BC-11 — `Deploy.ps1:54,58,62` — no `-ErrorAction Stop` — cmdlet failures continue silently**  
The three critical file operations — `Copy-Item` (backup), `Remove-Item` (wipe target), `Copy-Item` (install new files) — all run without `-ErrorAction Stop`. If the backup fails (disk full, locked file), the script proceeds to delete the target directory anyway. If `Remove-Item` fails partway through because Cold Turkey has a file open, the partial wipe is followed by a partial copy, leaving the web directory in a broken intermediate state with no error surfaced. Fix: add `-ErrorAction Stop` to all three operations and wrap the sequence in a `try/catch`.  
*Source: ci-build-review-2026-07-05.md (PS-01)*

**BC-12 — `Deploy.ps1:52` — backup directories grow unboundedly**  
Every run creates a timestamped backup (`web.bak_YYYYMMDD_HHMMSS`). No pruning logic. Frequent deployments accumulate backups in `C:\Program Files\Cold Turkey` indefinitely. Fix: keep a maximum of N backups (e.g., 5), deleting the oldest when the limit is exceeded.  
*Source: build-system-review.md (§4 Medium)*

**BC-13 — `Deploy.ps1:10` — self-elevation re-launches with `-ExecutionPolicy Bypass`**  
The elevated re-launch circumvents whatever execution policy the user or their organization has configured. For a tamper-resistance tool, bypassing the machine's execution policy in its own deployment script sets a poor precedent. Fix: use `-ExecutionPolicy RemoteSigned` or sign the script.  
*Source: build-system-review.md (§4 Medium) · ci-build-review-2026-07-05.md (PS-02). Flagged by both build sweepers.*

**BC-14 — `Deploy.ps1` — `Read-Host` and `pause` block unattended execution**  
Line 37: if the target directory is not found, the script blocks waiting for keyboard input. Lines 21, 32, 42, 64 use `pause` (a `cmd.exe` internal). Both block indefinitely if invoked from a CI step, scheduled task, or another script. Fix: add a `-NonInteractive` switch; replace `pause` with `Read-Host -Prompt "Press Enter to continue"`.  
*Source: build-system-review.md (§4 Low) · ci-build-review-2026-07-05.md (PS-03). Flagged by both build sweepers.*

**BC-15 — `InstallationOrchestrator.cs:365–378` — `RunCmd` ignores all exit codes**  
```csharp
private void RunCmd(string cmd, string args)
{
    using var process = Process.Start(psi);
    process?.WaitForExit();  // exit code never read
}
```
Every `sc create`, `sc start`, `icacls`, `net user`, and `powershell` call goes through this method. A failed service registration, failed ACL hardening, or failed account creation is silently swallowed. The installer reports success and the user is left with a broken installation. Fix: check `process.ExitCode` after `WaitForExit()` and throw or surface an error for non-zero exits.  
*Source: build-system-review.md (§6 Medium)*

**BC-16 — `InstallationOrchestrator.cs:237–243` — `GenerateSystemKey()` shells out to PowerShell unnecessarily**  
The installer spawns a PowerShell subprocess with `-ExecutionPolicy Bypass` to generate the DPAPI key, even though `ProtectedData.Protect()` is available directly in C#. `DpapiHmacProvider.InitializeCryptoKey()` already does this correctly in pure C# and could simply be called instead. Because `RunCmd` ignores exit codes (BC-15), a PowerShell failure here is silently ignored and the services will crash at startup with `DPAPI could not unprotect system.key`. Fix: call `DpapiHmacProvider.InitializeCryptoKey()` directly from the installer.  
*Source: build-system-review.md (§6 Medium)*

**BC-17 — Nullable reference warnings silenced globally in Application and Domain**  
`CtblPlusPlus.Application.csproj:7` and `CtblPlusPlus.Domain.csproj:6`:
```xml
<NoWarn>CS8600;CS8604;CS8618;CS8625</NoWarn>
```
`CS8600` (null assigned to non-nullable) and `CS8604` (null passed to non-nullable parameter) hide real null-dereference risk across the two most business-critical layers. This defeats the safety goal of enabling nullable reference types. Fix: address warnings individually with `#pragma warning disable` at specific call sites.  
*Source: build-system-review.md (§5 Medium) · ci-build-review-2026-07-05.md (CFG-03). Flagged by both build sweepers.*

**BC-18 — `webpack.config.js:14` — webpack targeting IE 11 when the host browser is Chromium (WebView2)**  
`targets: { ie: '11' }` causes Babel to rewrite `async/await` as generator state machines and emit ES5-compatible output. Cold Turkey's embedded browser is WebView2 (Chromium), which supports ES2021+ natively. The IE 11 target produces a larger bundle, eliminates async stack traces in the debugger, and may cause unexpected behavior from prototype-patching polyfills. Fix: switch to `targets: { chrome: '90' }` or `"last 2 Chrome versions"`.  
*Source: ci-build-review-2026-07-05.md (CFG-04)*

**BC-19 — Comment-Driven Access Control (GitHub Actions) — four edge cases unaddressed**  
The GitHub Actions workflow described in `CONTRIBUTING.md` does not exist in the repo. The documented system has four unaddressed edge cases:  
- **ACC-01:** A user who edits their request comment (even a typo fix) could restart their countdown if the workflow triggers on both `created` and `edited` events. GitHub may also internally touch a comment (link-preview expansion), producing a spurious `edited` event mid-countdown.  
- **ACC-02:** A user who posts a request and immediately deletes it may not cancel the countdown (the `deleted` action type is not fired by `issue_comment: [created]`). CONTRIBUTING.md currently requires posting a separate cancellation comment — only possible if the user remembers they made the request.  
- **ACC-03:** A manually re-triggered scheduled scan could evaluate the same request twice — potentially sending duplicate invitations or conflicting with a just-posted `Access Granted` comment.  
- **ACC-04:** The `[Username]::Access Granted [Date]` comment is the only user-facing signal; it does not confirm that the GitHub collaborator invitation API call succeeded or that the user has accepted the invitation.  
*Source: build-system-review.md (§2) · ci-build-review-2026-07-05.md (ACC-01–04). Flagged by both build sweepers.*

**BC-20 — `ctbl.bat` — `-v quiet` swallows all build diagnostics**  
Lines 42, 50, 58, and 120 all pass `--nologo -v quiet` to `dotnet`. When a build fails, the error output is invisible; only `FAILED: Engine` is printed. Fix: remove `quiet` verbosity or redirect output to a log file: `>> "%ROOT%build.log" 2>&1`.  
*Source: build-system-review.md (§3 Medium)*

**BC-21 — `InstallationOrchestrator.cs:470, 516` — `C:\Users\Public\Desktop` hardcoded for shortcut path**  
The installer uses a hardcoded literal `C:\Users\Public\Desktop\Continue CTBL++ Setup.lnk` instead of `Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory)`. This breaks on non-C: system drives.  
*Source: build-system-review.md (§7)*

**BC-22 — `ctbl.bat:2` — `setlocal enabledelayedexpansion` declared but never used**  
The `!var!` delayed-expansion syntax never appears in the file. Harmless, but indicates the script was edited without cleanup.  
*Source: build-system-review.md (§3 Low)*

**BC-23 — `ctbl.bat` — no admin rights check before elevation-required operations**  
Several test-time operations (service management, `sc` commands) require elevation. The bat silently fails with access-denied errors rather than detecting and prompting.  
*Source: build-system-review.md (§3 Low)*

---

## Cross-Cutting

**CC-01 — CORS wildcard + JSONP on the enforcement API create a complete bypass vector**  
**Files:** `LocalWebServerService.cs:72–78, 145–162`  
The engine sets `Access-Control-Allow-Origin: *` on every response unconditionally. Separately, any endpoint accepts a `?callback=` parameter and returns a JSONP-wrapped response with `Content-Type: application/javascript`. JSONP loads via `<script src="…">` and is not subject to CORS at all — it bypasses even a correctly restricted `Access-Control-Allow-Origin` header. Fixing CORS without removing JSONP leaves the JSONP path fully open. JSONP was introduced for Cold Turkey's IE-era `XDomainRequest` needs; the current patched UI uses WebView2 and `fetch()`. Fix: remove JSONP support entirely; restrict CORS to the Cold Turkey web root or `null` (file:/// origin).  
*Source: ci-build-review-2026-07-05.md (SEC-01, SEC-02) · build-system-review.md (§9) · code-review.md (8.5) · code-review-findings.md (#3) · cross-component-review.md (§3 Medium). Flagged by five sweepers.*

**CC-02 — HMAC comparison timing-safe in the queue but plain string equality in the pipe protocol**  
`QueueSecurityValidator.cs` correctly uses `CryptographicOperations.FixedTimeEquals`. `PidBroker.cs` uses `_hmac.ComputeHmac(payload) != providedSig` (plain string equality). `WatchdogHeartbeat.cs` uses `_hmac.ComputeHmac(receivedPayload) == receivedSig` (plain string equality). The same HMAC key is used to sign both channels but verification is implemented at different security levels. The inconsistency will confuse future reviewers who expect uniform treatment. Fix: extract a single `IHmacProvider.VerifyHmac(payload, sig)` method that always uses `FixedTimeEquals`.  
*Source: code-review.md (8.2) · code-review-findings.md (#9) · cross-component-review.md (§1 High) · holistic-review-2026-07-05.md (§2 Critical). Flagged by four sweepers.*

**CC-03 — Cold Turkey install path hardcoded independently in four locations — non-default installs silently break**  
| File | Line | Hardcoded value |
|---|---|---|
| `LocalWebServerService.cs` | 32 | `C:\Program Files\Cold Turkey\web` |
| `CtblCliClient.cs` | 11 | `C:\Program Files\Cold Turkey\Cold Turkey Blocker.exe` |
| `InstallationOrchestrator.cs` | 284 | `C:\Program Files\Cold Turkey\Cold Turkey Blocker.exe` |
| `InstallationOrchestrator.cs` | 310–311 | `C:\Program Files\Cold Turkey\web` and `web.ctbl-orig` |
| `Deploy.ps1` | — | `C:\Program Files\Cold Turkey\web` |
| `DatabaseClient.cs` | — | `%ProgramData%\Cold Turkey\data-app.db` |

`SystemPathGuard.cs` correctly uses `Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles)`. Fix: resolve the Cold Turkey install path once from the registry; store in a shared constant; reference everywhere.  
*Source: build-system-review.md (§7) · ci-build-review-2026-07-05.md (CFG-01) · cross-component-review.md (§2 Medium) · holistic-review-2026-07-05.md (§2 Risk). Flagged by four sweepers.*

**CC-04 — `CTBL_QUEUED_DELAY` magic string couples JS and C# with no shared constant**  
`queuedDelay.js` returns `{lock: "password", password: "CTBL_QUEUED_DELAY"}` from its `onSave()` handler. Cold Turkey stores this verbatim in its block config. When a queued delay fires, `QueueRequestKinds.Classify()` matches on `targetUrl == "CTBL_QUEUED_DELAY"` to route the entry. The contract is a bare string with no shared definition, no documentation, and no compile-time check. The string also appears in `describeLockType()` in the same JS file — three load points that must stay in sync. Any change to the JS return value causes all queued delays to misclassify silently. Additionally, the sentinel is publicly readable in the open-source repo — a user can bypass their configured delay by typing it directly into Cold Turkey's UI.  
*Source: cross-component-review.md (§3 High) · ci-build-review-2026-07-05.md (SEC-03) · holistic-review-2026-07-05.md (§3 Risk). Flagged by three sweepers.*

**CC-05 — `system.key` is the single root of all HMAC trust with no backup path**  
`DpapiHmacProvider` loads or generates a 256-bit key stored at `%ProgramData%\CtblPlusPlus\system.key`, protected with `DataProtectionScope.LocalMachine`. Every queue HMAC signature is derived from this key. If `system.key` is deleted, regenerated, or becomes unreadable, all previously signed queue entries fail validation — the entire pending queue becomes inaccessible permanently. `triad.vault` backs up binaries only; the key has no export, no escrow, and no recovery path. An OS reinstall or Windows repair that regenerates DPAPI keys breaks all queued operations with no user-visible explanation. Key deletion falls through to generating a new random key — silently invalidating all pending requests.  
*Source: cross-component-review.md (§4 High) · holistic-review-2026-07-05.md (§4 Risk). Flagged by two sweepers.*

**CC-06 — Cold Turkey's database encoding is reverse-engineered with no version detection before write**  
**File:** `DatabaseClient.cs`  
`DatabaseClient` reads and writes Cold Turkey's private `data-app.db` using: prefix `"CTB17"`, byte offset `17`. This was reverse-engineered and is undocumented. The constants have no comment explaining what CT version introduced them or what the detection strategy is if the format changes. A CT update that modifies the encoding causes `GetDbState()` to throw `InvalidDataException("Settings value does not start with the expected prefix.")`. This is the only guard. There is no fallback, no version check before a write, and no way to distinguish "Cold Turkey updated" from "database corrupted." The error propagates unhandled into the queue dispatcher.  
*Source: cross-component-review.md (§7 High) · holistic-review-2026-07-05.md (§3 Critical). Flagged by two sweepers.*

**CC-07 — Cold Turkey version unverified at runtime — silent breakage on any CT update**  
CTBL++ was developed against a specific Cold Turkey version. No runtime check verifies CT's version before operating on its database, killing its process, or patching its web directory. CT updates that rename the process, move the install directory, restructure the web UI, or add a database write lock would break CTBL++ silently and in different ways depending on which component is involved. `Deploy.ps1` replaces the entire CT web directory on each deploy — a CT update that adds new web UI files has those files permanently overwritten. There is no compatibility matrix and no documented minimum/maximum CT version.  
*Source: cross-component-review.md (§7 High) · holistic-review-2026-07-05.md (§7 Risk). Flagged by two sweepers.*

**CC-08 — No test projects exist anywhere in the solution**  
The solution contains no unit tests, no integration tests, and no end-to-end tests. No JavaScript test runner. Every behavior — HMAC validation, DPAPI key management, CT database encoding, queue dispatch, lockdown triggering, process kill/restart — is verified only by running the installed system. This is a system that modifies `System32`, kills Windows processes, writes to a private third-party database using a reverse-engineered format, and can trigger an irrecoverable lockdown state. Every bug is discovered in production, by users.  
*Source: cross-component-review.md (§5 Critical) · holistic-review-2026-07-05.md (§5 Gap). Flagged by two sweepers.*

**CC-09 — Three irreversible paths with no test coverage — highest consequence first**  
1. **DPAPI round-trip** (`DpapiHmacProvider.cs`): if the protect/unprotect cycle has a bug, every HMAC computed after key generation will fail verification on the next startup — silently, permanently.  
2. **Kill–Write–Restart** (`ColdTurkeyInjector.cs KillWriteRestart()`): a targeting or sequencing bug leaves CT dead; the method's retry logic (5× 500ms on initial read) is not tested; no test verifies behavior on write failure.  
3. **ScorchedEarth targeting** (`ScorchedEarthPurgeService.cs`): `takeown.exe` and `icacls.exe` are executed against files in System32 and WinSxS based on suffix matching against `LockdownConstants.TargetBinaries`; a match-pattern bug could target wrong files; no test exercises the matching logic.  
Also: `TimeEnforcer`'s lockdown trigger path — the `ITimeSource` interface is injected, making a mock straightforward, but neither the "should trigger" nor "should not trigger" case has a test.  
*Source: cross-component-review.md (§5 Critical, High)*

**CC-10 — `ScorchedEarthPurgeService` permanently deletes system tools — undisclosed in user documentation**  
Every 60 seconds, the Engine permanently deletes `bcdedit.exe`, `reagentc.exe`, `msconfig.exe`, `SystemPropertiesAdvanced.exe`, and `SystemPropertiesProtection.exe` from System32 and WinSxS, taking ownership from TrustedInstaller first. These are irreversible deletions. The README describes CTBL++ as an add-on that "provides queued delay locks" and "watchdog enforcement." It contains no mention of System32 modification, no list of removed binaries, and no guidance on what users should expect after uninstalling. A user who installs CTBL++, blocks themselves, and later wants to use system recovery tools will find them gone with no documentation explaining why.  
*Source: cross-component-review.md (§6 High)*

**CC-11 — WinSxS deletion may corrupt the Windows component store silently**  
`ScorchedEarthPurgeService` recursively searches WinSxS and deletes any file matching the target binary list. WinSxS holds multiple versioned copies of system components for use by the Windows Update servicing stack. Deleting a WinSxS copy removes that specific component version's instance. The component store's metadata (CBS, `TrustedInstaller` manifests) may still reference the deleted file, corrupting the store's integrity without any immediate error. Future Windows updates or repair operations may fail silently weeks or months after installation.  
*Source: cross-component-review.md (§7 Low)*

**CC-12 — Pipe protocol between Engine and Watchdogs is positional with no versioning**  
The named-pipe protocol (`CtblPlusPlusPidBroker`) is implemented as bare string messages parsed by index — e.g., `parts[4]` for Wd1 health, `parts[5]` for Wd2 health in the `GET_PIDS` response. The protocol is defined implicitly across two files with no shared constant class, no schema, and no version field. Adding a field to the `PIDS` response requires updating both files simultaneously with no compile-time enforcement. A mismatch silently produces wrong PID values and incorrect health booleans.  
*Source: holistic-review-2026-07-05.md (§3 Risk)*

**CC-13 — Cold Turkey's `data-app.db` is a shared write target with no retry on lock, and backup files accumulate in CT's folder**  
`DatabaseClient.cs` opens `data-app.db` in `ReadWrite` mode without WAL. On `SqliteErrorCode 5 or 6` (busy/locked), a `DatabaseLockedException` is thrown — with no retry, no backoff, and no queue for the failed write to be retried later. Backup files (`data-app.db.bak.yyyyMMddHHmmss`) accumulate in Cold Turkey's data folder, pruned to 5 copies, but that folder is not cleaned on CTBL++ uninstall. A user who uninstalls CTBL++ is left with up to 5 stale backup files in a third-party application's data directory.  
*Source: holistic-review-2026-07-05.md (§4 Risk)*

**CC-14 — Six parallel logging mechanisms with no common thread — incomplete `EngineLogger` migration**  
The backend uses: `ILogger<T>` (DI-injected, used in `LocalWebServerService.cs`), `EngineLogger.Log()` (static, no lock, used in `AppControlStateManager.cs`/`DatabaseClient.cs`), `StartupLog.Write()` (static, lock-guarded, crash-path diagnostics), `LockdownLogger.Log()` (static, used throughout watchdog/lockdown code), `Console.WriteLine()` (used directly in `WatchdogHeartbeat.cs`), and private `Log()` methods in six enforcer classes (see CS-41). Both `EngineLogger` and `StartupLog` write to `%ProgramData%\CtblPlusPlus\process_log.txt` with different timestamp formats. `ILogger` messages go to the Windows Event Log, not this file. A developer tailing the log file sees only a subset of what the system is doing.  
*Source: cross-component-review.md (§1 Medium) · holistic-review-2026-07-05.md (§1 Note). Flagged by two sweepers.*

**CC-15 — DPAPI `LocalMachine` scope unexplained — broader attack surface than `CurrentUser`**  
`DpapiHmacProvider` uses `DataProtectionScope.LocalMachine`, which means any process running as a local administrator can unprotect `system.key`. `DataProtectionScope.CurrentUser` would restrict decryption to the service account's identity. The choice of `LocalMachine` may be deliberate (the Engine runs as a Windows service under `LocalSystem`, and current-user DPAPI in that context has documented edge cases) — but no comment records this reasoning. A future maintainer has no basis to evaluate whether this was a considered tradeoff.  
*Source: cross-component-review.md (§6 Medium)*

**CC-16 — Three load-bearing architectural decisions have no recorded rationale**  
- **Port 58123:** hardcoded in `LocalWebServerService` with no comment. Is it a registered port? Does it avoid known conflicts with CT's own ports?  
- **`0x1F` (ASCII Unit Separator) as HMAC delimiter:** `QueueSignaturePayload.BuildV2` joins payload fields with `(char)0x1F`. This is a good choice — it cannot appear in normal text and prevents field injection — but there is no comment explaining why this specific character was chosen.  
- **V1 signature format retained alongside V2:** `BuildV1` concatenates fields without delimiters; `MigrateSignaturesToV2()` exists in `SqliteQueueRepository`. It is not documented whether V1 signatures are still accepted at runtime, how long the migration window is expected to last, or whether old entries that fail V2 verification fall back to V1.  
*Source: cross-component-review.md (§6 Low)*

**CC-17 — CTB17 encoding constants are unexplained — `DatabaseClient.cs` context**  
`const string PREFIX = "CTB17"` and `const int OFFSET = 17` have no comment. Missing context: which version of Cold Turkey introduced this format, whether the format has changed historically, whether `"CTB17"` encodes a version number, and what a future developer should do if the prefix check fails at runtime. The `Classify()` backfill method in `QueueRequestKinds.cs` encodes legacy dispatch rules with no explanation of when or why these rules existed before the `Kind` column was added.  
*Source: cross-component-review.md (§6 Low) · holistic-review-2026-07-05.md (§6 Gap). Flagged by two sweepers.*

**CC-18 — Vendored JS libraries have no version manifest or update mechanism**  
The `vendor/` directory inside `Raw/` contains copies of jQuery, Bootstrap, bootstrap-datetimepicker, and Flot. These are not managed by npm (no entry in the Scripts `package.json`) and have no version-pinning manifest. A security issue in the vendored jQuery would require a manual file replacement with no tooling to discover that an update is needed.  
*Source: holistic-review-2026-07-05.md (§7 Note)*

**CC-19 — `amazon-vm-ie-webview-fix.md` misattributes `http://localhost:58123` to Cold Turkey's web serving**  
The document says port 58123 is Cold Turkey's local HTTP server. It is actually CTBL++'s Engine REST API port. The document also references `app.js line 218` as the opacity flip location — `Bundled/app.js` is webpack output and line numbers change on every build. These errors will misdirect anyone (human or agent) following the document to diagnose a gray-screen issue.  
*Source: skill-library-review.md*

---

## Block Type Architecture

**BT-01 — Extension lock types parasitize Cold Turkey's `password` field via sentinel passwords**  
CTBL++'s "Queued Delay" lock type is implemented by setting `lock = "password"` and `password = "CTBL_QUEUED_DELAY"`. CT can legitimately change password validation, add a reserved-strings check, or alter unlock behavior for password-type locks — and all CTBL++ extension types break silently. The sentinel string is not namespaced. There is currently only one entry in `EXTENSION_TYPES`; the mechanism scales poorly as more extension types are added, since each must claim a unique sentinel on the same `password` host type.  
*Source: block-type-system-review.md (§01)*

**BT-02 — Extension type identity lives in `AppState`, not config — lost on process restart or settings clear**  
Whether a block is a "Queued Delay" block is not stored in Cold Turkey's config file. It is inferred at runtime from `AppState.configuredQueuedDelays` (in-memory, persisted via a CTBL++ settings key) and the sentinel `password === "CTBL_QUEUED_DELAY"`. If `AppState` is lost (process restart, crash, clearing CTBL++ settings), a Queued Delay block appears as a regular password-locked block — because from Cold Turkey's perspective, it is one. The extension type identity is not self-describing in the config.  
*Source: block-type-system-review.md (§07)*

**BT-03 — Block categories identified by name prefix at 4+ independent call sites — no registry**  
The `"Frozen Turkey,"` and `"Focused Turkey,"` prefix checks appear independently in:  
| File | Line | Check |
|------|------|-------|
| `OverviewRenderers.js` | 19 | `blockName == "Frozen Turkey" \|\| blockName.indexOf("Frozen Turkey,") == 0` |
| `blockStateCalculator.js` | 54 | same check |
| `LockEditorPage.js` | 58 | `blockName.indexOf("Frozen Turkey") == 0` |
| `LockEditorPage.js` | 63 | `blockName.indexOf("Focused Turkey,") == 0` |

If CT ever introduces a block with a name starting with "Frozen Turkey," CTBL++ misclassifies it. There is no shared `isFrozenBlock(blockName)` utility.  
*Source: block-type-system-review.md (§01)*

**BT-04 — No registry for block categories — adding a new block category requires 11+ file edits**  
Hypothetical: adding a "Process Block" (a block that restricts by process name rather than URL/exe path) requires edits to at minimum: `CtblModels.cs`, `CtblStateEnforcer.cs`, `ScheduleChangeQueueHandler.cs:84–93`, `OverviewRenderers.js getBlockMetadata()`, `blockStateCalculator.js` (three independent branches), `LockEditorPage.js`, `BlockModal.html`, `extensionTypes.js`, `lockTypes/index.js`, `lockTypes/processBlock.js` (new file), and likely `BlocksPage.js`/`BlockCard.js`. This 11-file floor does not count unique enforcement behavior, break behavior, or autostart behavior. For comparison, adding a new *lock type* via the existing registry takes 1 new file + 1 import line + 1 entry in `EXTENSION_TYPES`.  
*Source: block-type-system-review.md (§03)*

**BT-05 — No registry for scheduling types (`"continuous"`, `"scheduled"`) — closed list in 4+ files**  
The two scheduling types are compared by literal string in:  
| File | Lines | Context |
|---|---|---|
| `ScheduleChangeQueueHandler.cs` | 84–93 | Backend side-effects on type switch |
| `blockStateCalculator.js` | 24–51 | Active state calculation |
| `OverviewPage.js` | 68, 125 | Timeline rendering |
| `ScheduleEditorPage.js` | 298 | Toggle logic |

A third scheduling type requires coordinated changes across both C# and JS layers with no registry mechanism.  
*Source: block-type-system-review.md (§05)*

**BT-06 — `getContinuousBreakText()` and `getScheduledBreakText()` in `OverviewRenderers.js` are ~190-line near-duplicates**  
| Function | Lines | Length |
|---|---|---|
| `getContinuousBreakText()` | 192–385 | ~190 lines |
| `getScheduledBreakText()` | 387–564 | ~175 lines |

The only structural difference is that the scheduled version uses a `schedItem` parameter instead of `blockData`, and suffixes variable names with `2`. Every break type (`allowance`, `reward`, `randomText`, `delay`, `sessions`, `pomodoro`) is handled twice. Adding or changing any break type requires two parallel edits.  
*Source: block-type-system-review.md (§04)*

**BT-07 — Parallel lock display chains in `blockStateCalculator.js` and `OverviewRenderers.getLockText()` — partial hook coverage**  
Both files contain `if-else` chains over the same native CT lock type strings. Both have a `findLockType()` hook inserted for the `password` case — which is the right pattern — but it covers only one of eight lock types. The remaining seven (randomText, delay, window, schedule, restart, timer, and spassword) have no hook point. Major chain sizes:  
| Chain | File | Approx. lines |
|---|---|---|
| `getContinuousBreakText()` | `OverviewRenderers.js:192` | ~190 |
| `getScheduledBreakText()` — near-duplicate | `OverviewRenderers.js:387` | ~175 |
| Lock display chain | `blockStateCalculator.js:151` | ~148 |
| `getLockText()` | `OverviewRenderers.js` | ~142 |
| `_onSave()` switch | `LockEditorPage.js:485` | ~135 |
*Source: block-type-system-review.md (§04, §06)*

**BT-08 — Lock type descriptor interface not formally declared — no validation on `registerLockType()`**  
The interface exists only as the shape of `queuedDelayLockType` in `queuedDelay.js:291–307`. There is no JSDoc `@typedef`, no validation function called inside `registerLockType()`, and no documentation of which methods are optional. A new descriptor that omits a required method fails silently at the call site, not at registration.  
*Source: block-type-system-review.md (§02)*

**BT-09 — `LockEditorPage._parseState()` still has a hardcoded `else if` branch at line 260**  
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
The descriptor pattern partially replaces this but doesn't fully eliminate it. A second registered lock type would require a second hardcoded `else if` here, defeating the registry's purpose.  
*Source: block-type-system-review.md (§05)*

**BT-10 — `CtblBlock.Extension` field is defined, serialized, but read or written by no file in the codebase**  
```csharp
[JsonPropertyName("extension")]
public string Extension { get; set; } = "";
```
This field is a ready-made home for CTBL++-owned type metadata. It could carry the extension type identifier (`"queuedDelay"`, etc.) and free the sentinel-password mechanism from its structural constraints. The extension type identity would then be self-describing in the config, surviving process restarts without relying on `AppState.configuredQueuedDelays`.  
*Source: block-type-system-review.md (§07)*

**BT-11 — `BlockModal.html` dialog structure has no component model — a new block category requires a new hardcoded `<div>`**  
`BlockModal.html` contains static HTML for all possible dialog states. The "Edit Block" dialog (line 219) has four fixed tabs hardcoded for the website/app block category. A new block category requires: (1) a new `<div id="dialog-edit-X">` element with its own hardcoded tab structure; (2) wiring into `BlocksPage.js` alongside existing dialog routing logic. There is no component model or data-driven rendering path for block categories.  
*Source: block-type-system-review.md (§06)*

---

## Agent Skills (.agents)

### Coverage Gaps — Missing Skills

**AS-01 — No cross-stack feature skill — every CTBL++ feature spans C# Engine API and WebUI simultaneously**  
Adding an endpoint requires coordinated placement decisions in both stacks simultaneously. No skill covers this end-to-end path. A model using C# Architect for the backend half and HTML Architect for the frontend half receives two isolated sets of prose with no mechanism to consume one's output in the other. The skills are parallel, not composable for this case.  
*Source: agent-skill-review.md (§4 Critical) · skill-library-review.md (§4)*

**AS-02 — No CTBL++-specific architecture skill — four project types absent from both skills**  
The `csharp-architect` skill models four layers (Domain/Application/Infrastructure/API). CTBL++ has seven projects: `CtblPlusPlus.Domain`, `CtblPlusPlus.Application`, `CtblPlusPlus.Infrastructure`, `CtblPlusPlus.Engine`, `CtblPlusPlus.Installer`, `CtblPlusPlus.Wd1`, `CtblPlusPlus.Wd2`. Engine, Installer, Wd1, and Wd2 don't map to any step in the placement decision sequence. Code belonging in these projects is either forced into the wrong layer or reaches Step 5 ("Still unclear — split it") incorrectly.  
*Source: agent-skill-review.md (§4 Critical, §5) · skill-library-review.md (§2, §7)*

**AS-03 — No `Naming Reviewer` skill — explicitly referenced in `Skill_Html_Architect.md` "When NOT to use" section, does not exist**  
`Skill_Html_Architect.md`'s "When NOT to use" says naming belongs to the "Naming Reviewer." Step 4 of that same skill then defines a complete naming rule system. The skill contradicts its own boundary, and the referenced skill is absent.  
*Source: agent-skill-review.md (§3, §4 High)*

**AS-04 — No Security skill for CTBL++'s DPAPI / HMAC / queue integrity layer**  
CTBL++ has explicit `Domain/Security/` and `Infrastructure/Security/` layers. No skill governs when to use DPAPI vs. plain storage, where security concerns live in the hierarchy, or what the security invariants of the queue system are.  
*Source: agent-skill-review.md (§4 High)*

**AS-05 — No `webui-build-boundary` skill — the `Raw/` vs. `Bundled/` distinction is the most likely agent mistake**  
The actual editable source is `CtblPlusPlus.WebUI\web\Raw\`. The output at `Bundled\` is webpack output and must never be edited directly. A model triggered by "something feels like it's in the wrong place" in the HTML Architect skill could apply structural guidance to `Bundled\` files and produce work that is overwritten on the next build. The existing WebUI README is entirely devoted to warning AI agents about this; the warning exists because the mistake is evidently common.  
*Source: agent-skill-review.md (§4) · skill-library-review.md (§4 — highest priority action)*

**AS-06 — No `engine-api-contract` skill — no guidance for adding or modifying REST endpoints at port 58123**  
`CtblApiClient.js` and C# route handlers share a string-contract API surface. `CtblApiClient.js` calls `/blocks/enqueue-queued-delay`; the handler matches `"api/blocks/enqueue-queued-delay"`. These are implicit string contracts with no compile-time verification. No skill governs how to keep the HTTP contract consistent across both sides.  
*Source: skill-library-review.md (§4)*

**AS-07 — No `queue-mutation-rules` skill — the core CTBL++ feature has HMAC-signed invariants not covered generically**  
The `QueueDispatcher`, `QueueSecurityValidator`, and `QueueBatchContext` have their own security-sensitive invariants (HMAC signing, tamper validation, batch sequencing). The C# skill covers layer placement generically. The core feature deserves dedicated guidance.  
*Source: skill-library-review.md (§4)*

**AS-08 — No `csharp-behavior-reviewer` skill — logic correctness review entirely uncovered**  
`csharp-architect` explicitly excludes behavioral review (correct scope discipline). No companion skill exists to review logic correctness, error handling, race conditions, or correctness of the type of issues found in this review.  
*Source: skill-library-review.md (§4)*

**AS-09 — No `watchdog-constraints` skill — Wd1/Wd2 architecture rules completely absent from both skills**  
Watchdogs must reference only Domain, must mark themselves as critical processes, and must implement mutual monitoring. None of these constraints appear anywhere in the existing skills.  
*Source: skill-library-review.md (§4)*

**AS-10 — No Testing skill — no guidance on test file placement, strategy, or what is expected to be unit- vs. integration-tested**  
*Source: agent-skill-review.md (§4 Medium)*

**AS-11 — No Build/deployment skill — no guidance on when to run which target or how the Webpack bundle connects to C#**  
`ctbl.bat` and `Deploy.ps1` are complex orchestration scripts with non-obvious sequencing requirements. No skill explains the deployment sequence or the relationship between `Raw/`, `Bundled/`, `Payload.zip`, and `WebPayload.zip`.  
*Source: agent-skill-review.md (§4 Medium)*

**AS-12 — `amazon-vm-ie-webview-fix.md` is an orphaned reference doc — neither humans nor agents can reliably invoke it**  
Stored in `.agents/Docs/` alongside skills but has no frontmatter, no trigger, and gives no behavioral instructions to an agent. It contains critical WebUI development constraints (COM bridge requirements, zone settings, LMZ lockdown) that a model executing HTML Architect has no mechanism to pull in. Options: (a) move to a `docs/` folder in the main project where humans find it, or (b) convert into an actual skill with a trigger like "use when Cold Turkey shows a gray screen on a server OS or VM."  
*Source: agent-skill-review.md (§4) · skill-library-review.md (§4)*

### Internal Consistency Issues

**AS-13 — Both skills reference `ARCHITECTURE.md` in their verification checklists — file does not exist**  
*(See also F-11.)* Architecture documentation is in `README.md`. This verification step silently fails every run of either skill.  
*Source: agent-skill-review.md (§5) · skill-library-review.md (§5)*

**AS-14 — `Skill_Html_Architect.md` references `styles/tokens.css` — file does not exist**  
CTBL++ has no `tokens.css`. The `styles/` folder contains `base.css` and `utilities.css`. This check will always produce a false finding on a clean codebase.  
*Source: agent-skill-review.md (§9) · skill-library-review.md (§9)*

**AS-15 — `Skill_Html_Architect.md` standard folder pattern is incomplete — missing `routes/` and `store/`**  
The reference structure lists `components/`, `pages/`, `layouts/`, `services/`, `utils/`, `constants/`, `styles/`, `assets/`. CTBL++'s WebUI also has `routes/` (`router.js`) and `store/` (`AppState.js`). New developers using the skill won't know where routing or state management code belongs.  
*Source: agent-skill-review.md (§5)*

**AS-16 — `Skill_Html_Architect.md` self-contradicts on naming scope**  
"When NOT to use" section defers naming to a "Naming Reviewer" skill. Step 4 then defines a complete naming rule system. Both cannot be correct.  
*Source: agent-skill-review.md (§3, §5)*

### Trigger and Activation Issues

**AS-17 — Neither skill has a formal `trigger` field in frontmatter — activation must be inferred from prose**  
Both skills bury activation conditions in a "When to Use" section. A model cannot match an event against a trigger if none is declared as a structured field.  
*Source: agent-skill-review.md (§8)*

**AS-18 — Several trigger clauses are too vague or permanently stale**  
In `csharp-architect`: "when Infrastructure, Application, or Domain concerns have started bleeding into each other" (metaphorical, unactionable); "when onboarding to a codebase" (fires any time someone new looks at the repo). In `html-architect`: "when setting up a new project and choosing the initial folder layout" (CTBL++ is an established project — permanently stale); "after a fast-paced feature sprint that may have broken structural discipline" (matches every sprint; no threshold).  
*Source: agent-skill-review.md (§2)*

**AS-19 — `Skill_Html_Architect.md` can misfire on `Bundled/` directory files**  
A model triggered by "something feels like it's in the wrong place" in `Bundled\` would apply structural guidance to webpack output and produce work overwritten on next build.  
*Source: skill-library-review.md (§2)*

### Saturation and Output Quality Issues

**AS-20 — `Skill_Csharp_Architect.md` is instrumentally biased toward finding violations on clean codebases**  
- The "Common Rationalizations" section presents six strawman arguments with detailed rebuttals, priming the model to find violations those arguments would apply to.  
- "Red Flags" section heading and 8-item list is formatted as "things you will encounter," not "things to check for." No instruction says "if none are present, state that explicitly and stop."  
- "Scan for these patterns" (Step 2) is open-ended with no defined scan boundary; a model that finds nothing often generates a marginal finding to justify having scanned.  
Fix: add to Step 2 and the Red Flags section: "If none of the above patterns are present in the files under review, write 'No violations found' and proceed directly to the verification checklist."  
*Source: agent-skill-review.md (§11) · skill-library-review.md (§11)*

**AS-21 — `Skill_Html_Architect.md` cannot produce a clean "no findings" result**  
- Step 1 presupposes misplaced files: "Find any files that are already misplaced — note them, don't fix them yet."  
- "Any 'yes' answer is a blocker" implies yes answers are expected; the complementary "if all answers are 'no', the structure is sound — report that and stop" is missing.  
- Principle 5: "Before creating a new file, the correct question is: 'Does something that handles this already exist?'" implicitly asks the model to evaluate all existing files for overlap — guaranteeing output even when nothing overlaps.  
Fix: add an explicit clean-result exit path at the top of the Architecture Process.  
*Source: agent-skill-review.md (§11) · skill-library-review.md (§11). Flagged by both agent sweepers.*

### Composability and Format Issues

**AS-22 — Neither skill defines a structured output format — multi-skill chaining is broken**  
Both produce prose only. Running C# Architect first produces prose; HTML Architect has no way to consume it. C# Architect ends with "Document decisions in `ARCHITECTURE.md`." HTML Architect has no documentation step. After running both skills, no canonical record of cross-stack placement decisions exists.  
*Source: agent-skill-review.md (§6) · skill-library-review.md (§6)*

**AS-23 — Both skills ask the model to perform checks that are deterministic and should be run by scripts**  
Examples from `csharp-architect`: "Does Domain.csproj compile with zero external project references?" → one `dotnet list reference` call. "Does Application.csproj reference only Domain?" → same. "DbContext appearing in Application or Domain namespaces" → `grep -r "DbContext"`. Examples from `html-architect`: "Does any lower-layer file import from a higher layer?" → `dependency-cruiser` with a rules config. "Is the same logic present in more than one place?" → `jscpd`. Recommended pattern: add a "Pre-check script results" step at the top; instruct the model to read confirmed violations rather than hunt for them speculatively.  
*Source: agent-skill-review.md (§10) · skill-library-review.md (§10). Flagged by both agent sweepers.*

**AS-24 — Frontmatter fields `inputs`, `output-format`, and `version`/`last-updated` are absent from both skills**  
No definition of what the skill expects to receive (a diff? a file path? a class description?). No defined output structure, making skill chaining impossible. No way to detect or communicate staleness.  
*Source: agent-skill-review.md (§8)*

**AS-25 — Filename vs. frontmatter name mismatch**  
Filenames use `Skill_Csharp_Architect.md` (PascalCase with `Skill_` prefix). Frontmatter `name` fields use `csharp-architect` (kebab-case, no prefix). Two naming systems disagree.  
*Source: agent-skill-review.md (§8)*

---

## Commonly Recommended Next Steps (Already Considered)

The following ordered fix sequences appear across sweepers and represent their collective prioritization. They are recorded here so they are not lost in the merge.

**From code-review-findings.md — Priority order:**  
1. CS-01 (ACE accumulation — production failure within hours of uptime)  
2. CS-02 (watchdog resurrection — healing feature silently broken)  
3. CS-03 (JSONP injection — exploitable by any webpage open while engine runs)

**From ci-build-review-2026-07-05.md — Recommended action order:**  
1. CC-01 (SEC-01 + SEC-02 together — CORS and JSONP, one coherent change)  
2. BC-05 (BLD-03 — fix CONTRIBUTING.md Split/Combine reference)  
3. F-04 / F-07 (BLD-04 — add .gitignore)  
4. BC-11 (PS-01 — -ErrorAction Stop in Deploy.ps1)  
5. BC-04 (BLD-01 — clean _payload before each build)  
6. BC-03 (BLD-02 — make Release payload path explicit or warn)  
7. CC-03 (CFG-01 — read Cold Turkey install path from registry)

**From holistic-review-2026-07-05.md — Priority action list:**  
1. CS-02 (wrong exe launched on engine death)  
2. CC-02 (HMAC comparison inconsistency)  
3. CC-06 (CTB17 encoding — no version detection before write)  
4. FE-40 (coldTurkeyAPI.js stub — window.external calls undocumented)  
5. BC-09 (WebPayload.zip vs. Deploy.ps1 silent divergence)  
6. CC-08 (no tests for DatabaseClient round-trip or HMAC validation)

**From frontend-code-review.md — Do First / Next Batch / Later:**  
Do First: FE-10 (duplicate Toggle/Modal CSS), FE-12 (String.prototype mutations), FE-02 (shortenOverviewBlockName), FE-34 (debounce save()), FE-18 (render-skip guard in updateBlocks).  
Next Batch: FE-11 (CSS custom properties), FE-31 (CTBL namespace), FE-09 (inline onclick), FE-26 (unlock key encapsulation), FE-16/FE-17 (accessibility).  
Later: FE-14 (replace JSONP with fetch), FE-20 (tagged template literal), FE-30 (split blockStateCalculator/SecurityModal), FE-49 (async template loading).

**From skill-library-review.md — Priority-ordered actions:**  
1. AS-05 (webui-build-boundary skill — add before next agent session touches UI)  
2. AS-13 (fix csharp-architect ARCHITECTURE.md reference)  
3. AS-12 (move or convert amazon-vm-ie-webview-fix.md)  
4. AS-02 (expand csharp-architect to acknowledge Wd1/Wd2/Engine/Installer)  
5. AS-21 (add clean-result exit path to html-architect)  
6. AS-06 (engine-api-contract skill)  
7. AS-08 (csharp-behavior-reviewer skill)  
8. AS-07 (queue-mutation-rules skill)  
9. AS-09 (watchdog-constraints skill)

---

## Merge Audit

### Finding Count by Sweeper

| Sweeper | Raw Findings Claimed / Counted |
|---|---|
| `code-review.md` | 36 (per summary table) |
| `code-review-findings.md` | 20 (per summary table) |
| `frontend-code-review.md` | ~28 actionable (excluding ✅ Good items) |
| `frontend-ui-review.md` | 24 (per file header) |
| `build-system-review.md` | 18 (per summary table) |
| `ci-build-review-2026-07-05.md` | 20 (per severity summary) |
| `cross-component-review.md` | 21 (per opening) |
| `holistic-review-2026-07-05.md` | 17 (per summary: 3 Critical + 4 Risk + 6 Gap + 4 Note) |
| `block-type-system-review.md` | ~11 distinct problem findings (excluding ✅ Good items) |
| `agent-skill-review.md` | ~25 distinct findings |
| `skill-library-review.md` | ~15 distinct findings |
| **Total raw** | **~235** |

### Merged Output Count

| Section | Items |
|---|---|
| File / Folder Structure | 12 |
| C# Backend | 50 |
| HTML / JS Frontend | 50 |
| Build / CI / Scripting | 23 |
| Cross-Cutting | 19 |
| Block Type Architecture | 11 |
| Agent Skills (.agents) | 25 |
| **Total in merged output** | **190** |

The raw count (235) exceeds the merged count (190) primarily due to deduplication: approximately 45 findings appeared in 2–5 sweepers simultaneously and were merged into single entries. The most heavily duplicated findings were CS-02 (wrong binary for Engine resurrection, caught by 5 sweepers), CC-01 (CORS + JSONP, caught by 5 sweepers), CS-04 (fire-and-forget monitor, caught by 2), CS-02 (wrong binary, caught by 5), CC-02 (HMAC timing, caught by 4), and CS-41 (private Log() methods, caught by 4).

### Categorization Uncertainties

1. **CS-32 / CS-33 / CS-34 / CS-35 (Kill-Write-Restart, port conflict, clock/network, locale):** These are C# behavioral issues visible only when tracing cross-component interactions. They were placed in C# Backend because they have a primary file locus, but they could also legitimately live in Cross-Cutting. The cross-component implications are noted in the Cross-Cutting section under CC-07 and CC-06 where relevant.

2. **CC-19 (`amazon-vm-ie-webview-fix.md` port misattribution):** Placed in Cross-Cutting rather than Agent Skills because the error is a factual claim about the system's architecture (which port belongs to which service), not just a skill-quality issue. It is also called out in AS-12 from the agent skills angle.

3. **FE-40 (`coldTurkeyAPI.js` stub and scattered `window.external`):** This appears in holistic-review as a cross-component contract gap and in skill-library-review as an agent skill context gap. Placed in HTML/JS Frontend (FE-40) as the primary locus is in the WebUI code, with a note in CC-19 area about the undocumented contract dimension.

4. **BC-19 (Comment-Driven Access Control edge cases):** The underlying GitHub Actions workflow does not exist in the repo. These findings describe a documented-but-unimplemented feature. They were placed in Build/CI as the closest fit; they could also be interpreted as documentation gaps. The mismatch is noted.

5. **BT-11 (`BlockModal.html` dialog structure):** This is a UI/HTML finding (`BlockModal.html` is a static HTML file in the frontend) that is also an architectural finding about block type extensibility. Placed in Block Type Architecture because the architectural implication (new categories require new hardcoded `<div>` elements) is the actionable concern.
