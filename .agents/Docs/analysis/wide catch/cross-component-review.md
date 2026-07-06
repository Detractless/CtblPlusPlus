# CTBL++ Cross-Component Review

**21 findings across 7 architectural dimensions.**  
Findings that are only visible when looking at the connections between components — not any single file in isolation.

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 8 |
| Medium | 7 |
| Low | 3 |
| **Total** | **21** |

---

## 1. Inconsistent Conventions

*Naming, error handling, logging, and security primitives that differ between components without reason.*

---

### [HIGH] HMAC comparison uses timing-safe equality in one layer, string equality in two others

`QueueSecurityValidator` uses `CryptographicOperations.FixedTimeEquals` — the correct approach for HMAC comparison, which prevents timing side-channels from revealing how many bytes matched before a mismatch. This pattern establishes a clear intent in the queue layer.

`PidBroker` and `WatchdogHeartbeat` both use plain string `!=` to compare the HMAC against the provided signature. The validator pattern is never applied to either. Neither file is obscure — both are in the same Infrastructure layer. The inconsistency is only visible when reading all three files together.

The practical risk depends on whether the named pipe (`CtblPlusPlusPidBroker`) is accessible to unprivileged processes. On a well-configured machine it may not be, but the security model assumes it and the code does not enforce it.

**Locus:** `QueueSecurityValidator.cs` · `PidBroker.cs` · `WatchdogHeartbeat.cs`

---

### [MEDIUM] Six parallel logging mechanisms — migration to EngineLogger never completed

The project runs six distinct logging approaches simultaneously: DI-injected `ILogger<T>` in services that receive it, the static `EngineLogger` writing to `process_log.txt`, the static `LockdownLogger` writing to `security_log.txt`, and private `Log()` methods in `TimeEnforcer`, `InternetTimeSource`, and `VaultRecoveryService` that each append directly to `process_log.txt` with their own timestamp format.

`EngineLogger`'s own docstring explicitly states it "replaces the 8+ private Log() methods scattered across individual services." The private methods it was meant to replace are still there. An operator tailing `process_log.txt` sees output from three different formatters interleaved, with no consistent component tagging.

**Locus:** `EngineLogger.cs` · `TimeEnforcer.cs` · `InternetTimeSource.cs` · `VaultRecoveryService.cs`

---

## 2. Duplicated Logic

*The same concept implemented differently in two places.*

---

### [MEDIUM] Cold Turkey file paths hardcoded independently in three locations

`C:\Program Files\Cold Turkey\web` appears as a literal string in `LocalWebServerService.cs` (serving the web root) and independently in `Deploy.ps1` (backing up and replacing the web directory). `%ProgramData%\Cold Turkey\data-app.db` appears in `DatabaseClient.cs`. There is no shared constant, no configuration key, and no single source of truth for CT's install location.

A CT installer that moves to a version-suffixed directory (e.g. `Cold Turkey Blocker` instead of `Cold Turkey`) would require the developer to find and update three separate strings. The deploy script and the runtime code can silently diverge — the script deploys to the correct location while the service still reads from the old one.

**Locus:** `LocalWebServerService.cs` · `Deploy.ps1` · `DatabaseClient.cs`

---

## 3. Implicit Contracts

*Places where component A assumes something about component B that is not enforced or documented.*

---

### [CRITICAL] Watchdog resurrection is broken — the wrong binary is relaunched on engine death

`WatchdogHeartbeat.HandleDeathAsync()` computes the resurrection path as `Process.GetCurrentProcess().MainModule?.FileName` — the running watchdog's own executable — then passes it `Arguments = "--engine"`, `"--watchdog1"`, or `"--watchdog2"` depending on what died.

`Wd1/Program.cs` has no argument parsing. It hardcodes `const string wdName = "Wd1"` and registers as Watchdog Primary unconditionally. When `HandleDeathAsync()` attempts to resurrect the Engine by launching itself with `--engine`, it instead starts another instance of Wd1 — which immediately exits because the mutex (`Global\CtblPlusPlus_Wd1_Mutex`) is already held.

The architecture assumes a single multi-role binary that accepts `--engine`/`--watchdog1`/`--watchdog2` flags. The actual binaries are separate, single-role executables. Engine death is therefore irrecoverable from the watchdog layer. This is only visible by reading `WatchdogHeartbeat.cs` and `Wd1/Program.cs` together.

**Locus:** `WatchdogHeartbeat.cs HandleDeathAsync()` · `Wd1/Program.cs` · `Wd2/Program.cs`

---

### [HIGH] `CTBL_QUEUED_DELAY` magic string couples JS and C# with no shared constant

`queuedDelay.js` returns `{lock: "password", password: "CTBL_QUEUED_DELAY"}` from its `onSave()` handler. Cold Turkey stores this verbatim in its block config. When a queued delay fires, the C# `QueueRequestKinds.Classify()` matches on `targetUrl == "CTBL_QUEUED_DELAY"` to route the entry to the correct handler.

The contract is a bare string with no shared definition, no documentation, no compile-time check, and no runtime assertion. Any change to the JS return value — a rename, a minifier collision, a CT config schema change that encodes the password differently — would cause all queued delays to misclassify silently. The queue entry would still be created and dispatched; it would simply fail to match and be treated as an unknown kind.

The string also appears in `describeLockType()` in the same JS file, where it's matched to display "Queued delay" to the user — a third load point that must stay in sync.

**Locus:** `queuedDelay.js onSave()` · `QueueRequestKinds.cs Classify()`

---

### [HIGH] Vault subfolder contract has three callers passing three different values

`VaultRecoveryService.RestoreTarget(targetSubfolder, destinationDir)` extracts entries from `triad.vault` whose path begins with the given prefix. Three callers use three different values: `""` extracts root-level entries, `"CtblPlusPlus"` extracts shared component entries, and `"CtblPlusPlus.Wd1"` extracts Wd1-specific entries.

The inconsistency: `WatchdogHeartbeat` calls `RestoreTarget("CtblPlusPlus", ...)` when restoring a watchdog binary, but `PidBroker` calls `RestoreTarget(Path.GetFileNameWithoutExtension(wdExeName), ...)` — which resolves to `"CtblPlusPlus.Wd1"` — for the same binary. One of them extracts the wrong set of files. There is no documentation of the vault's internal directory structure to determine which caller is correct.

**Locus:** `VaultRecoveryService.cs` · `PidBroker.cs ResurrectProcess()` · `WatchdogHeartbeat.cs HandleDeathAsync()`

---

### [MEDIUM] JSONP support assumes Cold Turkey's web UI is always loaded from `file://`

`LocalWebServerService` adds `Access-Control-Allow-Origin: *` to every response and detects `?callback=` to serve JSONP. These choices exist because Cold Turkey's web UI loads from a `file://` origin, which cannot use standard CORS with `localhost` as the target.

This architecture is never documented. A CT update that serves the web UI over a local HTTP server (or a Chromium-based frame with relaxed restrictions) would change the origin model, and JSONP would no longer be needed — or might conflict with CT's own CSP. The `Access-Control-Allow-Origin: *` header is also an ambient widening of the attack surface that no comment explains.

**Locus:** `LocalWebServerService.cs`

---

## 4. Single Points of Failure

*Files, config values, and processes whose corruption would cascade across the whole system.*

---

### [HIGH] `system.key` is the single root of all HMAC trust with no backup path

`DpapiHmacProvider` loads or generates a 256-bit key stored at `%ProgramData%\CtblPlusPlus\system.key`, protected with `DataProtectionScope.LocalMachine`. Every queue HMAC signature is derived from this key. `QueueSecurityValidator`, `PidBroker`, and `WatchdogHeartbeat` all call `IHmacProvider`, which resolves to the same provider reading the same file.

If `system.key` is deleted, regenerated, or becomes unreadable, all previously signed queue entries fail validation. The entire pending queue becomes inaccessible — not corrupted, just permanently unverifiable. There is no key rotation mechanism and no backup path: `triad.vault` backs up binaries only.

DPAPI `LocalMachine` scope also ties the key to the current machine's state. A Windows reinstall on the same hardware (which can preserve the machine SID and succeed at DPAPI decryption) is not guaranteed across all configurations. No documentation addresses recovery.

**Locus:** `DpapiHmacProvider.cs` · `SqliteQueueRepository.cs` · `triad.vault` (backup scope)

---

### [MEDIUM] Port 58123 conflict is silently treated as normal shutdown

`LocalWebServerService` binds exclusively to `127.0.0.1:58123`. Its exception handler catches `HttpListenerException` and logs "port conflict or normal shutdown" — then exits the listen loop without retrying, without alerting, and without attempting an alternative port.

If another process has taken port 58123 at service start, the entire REST API goes silent. The Engine process continues running (all other hosted services are unaffected), but the WebUI and any queued delay dispatches that go through the API receive no response. There is no fallback port and no health-check endpoint that would surface this to the watchdogs.

**Locus:** `LocalWebServerService.cs`

---

### [MEDIUM] Kill–Write–Restart leaves Cold Turkey dead if the DB write fails

`ColdTurkeyInjector.KillWriteRestart()` follows a three-step sequence: kill CT, write to `data-app.db`, restart CT. CT is killed before any write attempt. If the DB write fails — permission error, file locked, SQLITE_BUSY — the method returns without restarting CT.

Cold Turkey remains dead. No blocking is active. No automated recovery restarts it, and no error is surfaced to the user through the UI. The caller receives a return value indicating failure, but the watchdog layer monitors CT's process state, not write-path outcomes, so the dead CT is not a condition the watchdogs detect or recover from.

**Locus:** `ColdTurkeyInjector.cs KillWriteRestart()`

---

### [MEDIUM] Network outage at boot is indistinguishable from clock tampering — both trigger lockdown

`TimeEnforcer` sets `_isDirtyFlag = true` on startup, cleared only on clean stop. At startup, it calls `InternetTimeSource.GetUtcTime()`, which tries up to 5 of 9 hardcoded public endpoints and requires two sources to agree within 10 seconds.

If all contacted sources are unreachable (complete network outage, captive portal, corporate firewall) and the dirty flag is set, `_enforcement.TriggerLockdown()` fires. A user who was blocked yesterday, had their machine crash overnight, and boots this morning on a flaky network connection is locked down by the same code path as an actual clock manipulation attempt. The two scenarios are not distinguished.

**Locus:** `TimeEnforcer.cs` · `InternetTimeSource.cs`

---

## 5. Testing Gaps

*What is tested, what is not, and what is most dangerous to leave uncovered.*

---

### [CRITICAL] No test projects exist anywhere in the solution

The solution contains no unit tests, no integration tests, and no end-to-end tests. Every behavior — HMAC validation, DPAPI key management, CT database encoding, queue dispatch, lockdown triggering, process kill/restart — is verified only by running the installed system.

This is a system that modifies `System32`, kills Windows processes, writes to a private third-party database using a reverse-engineered format, and can trigger an irrecoverable lockdown state. The complete absence of a test harness means every bug is discovered in production, by users.

**Locus:** Solution root — no `*.Tests.csproj` found

---

### [CRITICAL] Three paths with irreversible consequences have no test coverage

**DPAPI round-trip.** `DpapiHmacProvider` generates and stores `system.key` using `DataProtectionScope.LocalMachine`. If the protect/unprotect cycle has a bug, every HMAC computed after key generation will fail verification on the next startup — silently, permanently. No test exercises this path.

**Kill–Write–Restart.** `ColdTurkeyInjector.KillWriteRestart()` is the write path for all CT configuration changes. A targeting or sequencing bug leaves CT dead. The method's retry logic (5× 500ms on the initial read) is not tested. No test verifies what happens on write failure.

**ScorchedEarth targeting.** `ScorchedEarthPurgeService` executes `takeown.exe` and `icacls.exe` against files in System32 and WinSxS based on suffix matching against `LockdownConstants.TargetBinaries`. A match-pattern bug could target wrong files. No test exercises the matching logic, the `IFileDeleter` integration, or the `IProcessInvoker` invocations.

**Locus:** `DpapiHmacProvider.cs` · `ColdTurkeyInjector.cs` · `ScorchedEarthPurgeService.cs`

---

### [HIGH] TimeEnforcer's lockdown trigger is the primary safety mechanism and has no test boundary

The dirty-flag + null-sync = `TriggerLockdown()` path is the system's primary defense against clock manipulation. It is also the path most likely to fire incorrectly (see finding above on false lockdown). Without a test, there is no verified boundary between "intended to trigger" and "should not have triggered."

The dependency on `ITimeSource` exists (the interface is injected), which means a mock is possible. The test would be straightforward: inject a mock that returns null, set the dirty flag, assert lockdown fires; inject a mock that returns a valid time, assert it does not. Neither test exists.

**Locus:** `TimeEnforcer.cs` · `ITimeSource` interface

---

## 6. Documentation

*Load-bearing decisions that exist only in the developer's head.*

---

### [HIGH] `ScorchedEarthPurgeService` is not disclosed anywhere in user-facing documentation

Every 60 seconds, the Engine permanently deletes `bcdedit.exe`, `reagentc.exe`, `msconfig.exe`, `SystemPropertiesAdvanced.exe`, and `SystemPropertiesProtection.exe` from System32 and WinSxS, taking ownership from TrustedInstaller first. These are irreversible deletions of system tools.

The README describes CTBL++ as an add-on that "provides queued delay locks" and "watchdog enforcement." It contains no mention of System32 modification, no list of removed binaries, and no guidance on what users should expect after uninstalling. A user who installs CTBL++, blocks themselves, and later wants to use system recovery tools will find them gone — with no documentation explaining why or by what.

**Locus:** `ScorchedEarthPurgeService.cs` · `LockdownConstants.cs` · `README.md`

---

### [MEDIUM] DPAPI `LocalMachine` scope choice is architecturally significant and unexplained

`DpapiHmacProvider` uses `DataProtectionScope.LocalMachine`, which means any process running as a local administrator can unprotect `system.key`. `DataProtectionScope.CurrentUser` would restrict decryption to the service account's identity, significantly narrowing the attack surface.

The choice of `LocalMachine` may be deliberate — the Engine runs as a Windows service under `LocalSystem`, and current-user DPAPI in that context has documented edge cases. But that reasoning is not in the code. A future maintainer has no basis to evaluate whether this was a considered tradeoff or a default that was never revisited.

**Locus:** `DpapiHmacProvider.cs` · `VaultRecoveryService.cs` (same scope used for vault)

---

### [LOW] `CTB17` prefix and offset=17 encoding are reverse-engineered with no annotation

`DatabaseClient` defines `PREFIX = "CTB17"` and `OFFSET = 17` and uses these to encode and decode Cold Turkey's private database format. No comment explains that these constants were reverse-engineered from CT's private binary, what "17" represents in CT's encoding scheme, or what symptoms would appear if CT changed the format.

Someone reading `DecodeHexWithOffset` in isolation has no way to know whether `17` is an arbitrary magic number, a version identifier, or an ASCII offset. The implicit knowledge required to maintain this code exists only outside the codebase.

**Locus:** `DatabaseClient.cs DecodeHexWithOffset()` / `EncodeBytesWithOffset()`

---

### [LOW] Three load-bearing architectural decisions have no recorded rationale

**Port 58123.** Hardcoded in `LocalWebServerService` with no comment. Is it a registered port? Does it avoid known conflicts with CT's own ports? Was it chosen to be memorable?

**`0x1F` (ASCII Unit Separator) as HMAC delimiter.** `QueueSignaturePayload.BuildV2` joins payload fields with `(char)0x1F`. This is a good choice — it cannot appear in normal text and prevents field injection — but there is no comment explaining why this specific character was chosen over, say, a newline or pipe.

**V1 signature format retained alongside V2.** `BuildV1` concatenates fields without delimiters; `MigrateSignaturesToV2()` exists in `SqliteQueueRepository`. It is not documented whether V1 signatures are still accepted at runtime, how long the migration window is expected to last, or whether old entries that fail V2 verification fall back to V1.

**Locus:** `LocalWebServerService.cs` · `QueueSignaturePayload.cs` · `SqliteQueueRepository.cs`

---

## 7. Dependency Risks

*Libraries, tools, and external services that could break, go unmaintained, or change behavior.*

---

### [HIGH] Cold Turkey's database encoding is reverse-engineered with no version guard

`DatabaseClient` reads and writes Cold Turkey's private `data-app.db` using a reverse-engineered format: the `CTB17` prefix identifies which JSON field maps to which CT block setting, and the offset-17 hex encoding transforms the stored bytes. This is not CT's documented API — it has no documented API.

A CT update that modifies the encoding (a version bump from CTB17 to CTB18, a change in the offset, a schema restructure) would cause `DatabaseClient` to silently read garbage or write corrupt data to CT's database. `DatabaseClient` creates timestamped backups before every write, but those backups contain data in the old encoding — unrecoverable without the prior version's decoder.

There is no runtime version assertion (e.g., reading a known field and verifying the decoded value matches an expected pattern) that would surface format incompatibility before a write.

**Locus:** `DatabaseClient.cs` · `CtblModels.cs`

---

### [HIGH] Cold Turkey version is unverified at runtime — silent breakage on any CT update

CTBL++ was developed against a specific Cold Turkey version. No runtime check verifies CT's version before operating on its database, killing its process, or patching its web directory. The CT process name used for kill/restart, the file paths used for the web root, and the database schema are all assumed to be stable.

CT updates that rename the process, move the install directory, restructure the web UI, or add a database write lock would break CTBL++ silently and in different ways depending on which component is involved. `Deploy.ps1` replaces the entire CT web directory with CTBL++ files on each deploy — a CT update that adds new web UI files would have those files permanently overwritten.

**Locus:** `ColdTurkeyInjector.cs` · `LocalWebServerService.cs` · `Deploy.ps1`

---

### [LOW] WinSxS deletion may corrupt the Windows component store silently

`ScorchedEarthPurgeService` recursively searches WinSxS — Windows' component store — and deletes any file matching the target binary list. WinSxS holds multiple versioned copies of system components for use by the Windows Update servicing stack.

Deleting a WinSxS copy of `bcdedit.exe` removes that specific component version's instance. The component store's metadata (CBS, `TrustedInstaller` manifests) may still reference the deleted file, which can corrupt the store's integrity without any immediate error. Future Windows updates or repair operations that rely on component-store consistency may fail silently weeks or months after installation.

The `DISM /CheckHealth` command would detect this corruption, but nothing in the system runs it or alerts on it.

**Locus:** `ScorchedEarthPurgeService.cs` · `LockdownConstants.cs`
