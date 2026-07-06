# CTBL++ Build System & CI Review

**Reviewed:** 2026-07-05  
**Scope:** GitHub Actions workflows, PowerShell scripts, `ctbl.bat`, MSBuild/csproj configuration, Split/Combine workflow, secrets and credentials, hardcoded paths, clean-clone reliability.

---

## Summary

This project has **no CI pipeline** — the GitHub Actions described in `CONTRIBUTING.md` do not exist in this repo snapshot, and every build step is manual. The build tooling that does exist has several reliability and security issues, ranging from a hardcoded admin password (Critical) to a broken watchdog restart path (High) to Debug binaries silently shipping in Release installers (Medium).

---

## Severity Reference

| Label | Meaning |
|---|---|
| **Critical** | Exploitable or causes data loss without user awareness |
| **High** | Breaks core functionality or creates a significant bypass vector |
| **Medium** | Reliability or security gap that requires a deliberate workaround |
| **Low** | Friction, inconsistency, or technical debt with low immediate impact |

---

## 1. CI Reliability

**There are no GitHub Actions workflows in this repository.** The `.github/` entries visible in the file tree are all inside `node_modules` (third-party packages). There is no `.github/workflows/` directory at the project root.

Consequence: there is no automated build verification, no PR gate, no artifact publication. A contributor can push broken code and nothing catches it until someone runs `ctbl.bat` manually.

`ctbl.bat` is an interactive menu-driven batch script with no non-interactive mode. It cannot be wired into a CI runner as-is.

---

## 2. The Comment-Driven Access Control System

The system described in `CONTRIBUTING.md` (7-day countdown, `[Username]::Request Full Access` comments, scheduled scans every 2 hours) is plausible as a GitHub Actions workflow, but the YAML implementing it **does not exist in this repo snapshot**. The following edge cases are unaddressed by the documentation.

| Scenario | Gap |
|---|---|
| User posts `Request Full Access`, then **deletes the comment** before the scan | Countdown entry disappears; no state is stored anywhere except the thread. The countdown is silently lost. |
| User **edits** the comment (e.g., typo-fixes the username) | The workflow presumably re-reads comment text. Whether it treats the edit as a new command or ignores it is undefined. |
| **Force-push** closes or locks the access issue | The comment thread is gone. All pending countdowns are silently dropped. |
| **Workflow re-run** on the scheduled job | If the workflow posts a `Countdown Started` reply without checking whether one was already posted, it double-posts and the thread becomes unreadable. |
| GitHub username contains **whitespace or special characters** | The identity check (`login == text`) breaks on any username where characters collide with the `::` delimiter. |
| Access granted while **private repo is offline or renamed** | The grant comment is posted but repo access is not actually provisioned. No rollback or error path is described. |

The 2-hour scheduled scan means grants slip up to 2 hours past the 7-day mark — fine by design, but worth documenting so users do not file "access is late" issues.

---

## 3. `ctbl.bat` Quality

### [High] Debug binaries embedded in Release installer

`ctbl.bat` lines 42–63 publish all three services with `-c Debug`:

```bat
dotnet publish CtblPlusPlus.Engine\... -c Debug -o "%ROOT%_payload"
```

These become `Payload.zip`, which the Installer embeds as an `EmbeddedResource`. When a user then runs `[4] Publish single-file installer`, they get a Release-configured WPF wrapper around Debug service binaries. There is no supported path to a fully Release installer without editing the bat file manually.

**Fix:** Add a `-c Release` variant to the build step, or make the configuration a parameter. The publish step should use Release for all projects.

### [Medium] `-v quiet` swallows build diagnostics

Lines 42, 50, 58, and 120 all pass `--nologo -v quiet` to `dotnet`. When a build fails, the error output is invisible. The `if %errorlevel% neq 0` check catches the failure but prints only `FAILED: Engine` — no actionable information.

**Fix:** Remove `quiet` verbosity or redirect output to a log file: `>> "%ROOT%build.log" 2>&1`.

### [Medium] `Publish` step does not rebuild the payload

`ctbl.bat:172`: `dotnet publish` on the Installer embeds whatever `Payload.zip` and `WebPayload.zip` currently exist on disk. If they are stale or were built with a previous version, the published exe silently ships wrong binaries. The comment "Run `[1] Build` first" is the only guard.

**Fix:** Either detect missing/stale zips and abort with an error, or make the publish step always rebuild the payload before publishing.

### [Medium] CONTRIBUTING.md references a non-existent menu option

`CONTRIBUTING.md:62` tells authorized contributors to run:

> `[5] Split / Combine → [2] Combine`

Option `[5]` in the current `ctbl.bat` is **"Clean project for GitHub (remove bin/obj)"** — a destructive operation that deletes build outputs. A contributor following those instructions would nuke their build artifacts. The Split/Combine workflow needs to either be added to the bat or the documentation updated.

### [Low] `setlocal enabledelayedexpansion` declared but never used

Line 2 enables delayed expansion for `!var!` syntax that never appears in the file. Harmless but indicates the script was edited after the fact.

### [Low] No admin rights check

Several test-time operations (service management, `sc` commands) require elevation. The bat silently fails with access-denied errors rather than detecting and prompting.

---

## 4. `Deploy.ps1` Quality

### [Medium] `exit` without a code on all failure paths

`Deploy.ps1` lines 19–24, 31–34, 41–44 all call `exit` on failure. In PowerShell, `exit` without a code exits with `0`. Any calling script that checks `$LASTEXITCODE` after running `Deploy.ps1` sees success even when deployment failed.

**Fix:** Replace all `exit` failure calls with `exit 1`.

### [Medium] Backup directories grow unboundedly

Line 52 creates a timestamped backup on every run (`web.bak_YYYYMMDD_HHMMSS`). There is no pruning logic. Frequent deployments during development accumulate backups in `C:\Program Files\Cold Turkey` indefinitely.

**Fix:** Keep a maximum of N backups (e.g., 5), deleting the oldest when the limit is exceeded.

### [Medium] `-ExecutionPolicy Bypass` in self-elevation

Line 10 restarts the script elevated using `-ExecutionPolicy Bypass`. For a tamper-resistance tool, bypassing the machine's execution policy in its own deployment script sets a poor precedent and could be used as a template by an attacker.

**Fix:** Use `-ExecutionPolicy RemoteSigned` or `Unrestricted` rather than `Bypass`, or sign the script.

### [Low] `Read-Host` blocks unattended execution

Line 37: if the target directory is not found, the script blocks waiting for keyboard input. This hangs any automation that calls `Deploy.ps1`.

### [Low] `pause` in a PowerShell script

Lines 22, 32, 42, 64 use `pause`, which is a `cmd.exe` internal. It works because PowerShell shells out to cmd, but it is fragile and inconsistent. Use `Read-Host -Prompt "Press Enter to continue"` instead.

---

## 5. Build Configuration

### [High] Services are not self-contained; .NET 10 is not installed by the installer

`ctbl.bat` calls `dotnet publish` without `--self-contained true`. The published services in `Payload.zip` are framework-dependent — they require .NET 10 to be installed on the target machine. `InstallationOrchestrator.cs` has no step to check for or install .NET 10. On a clean machine without .NET 10, all three services fail to start after installation with a cryptic "host not found" error.

**Fix:** Either add `--self-contained -r win-x64` to the service publish commands, or add a .NET runtime detection/installation step to the installer.

### [Medium] Nullable warnings silenced globally in Application and Domain

`CtblPlusPlus.Application.csproj:7` and `CtblPlusPlus.Domain.csproj:6`:

```xml
<NoWarn>CS8600;CS8604;CS8618;CS8625</NoWarn>
```

These four warnings are the core outputs of `<Nullable>enable</Nullable>`. Suppressing them globally means the compiler emits no warnings for null dereferences, null assignments to non-nullable fields, or null arguments. This defeats the safety goal of enabling nullable reference types and hides latent `NullReferenceException` paths.

**Fix:** Address warnings individually with `#pragma warning disable` at the specific call sites that genuinely need it, rather than silencing them project-wide.

### [Low] No `Directory.Build.props`

Each `.csproj` independently declares `<Nullable>enable</Nullable>`, `<ImplicitUsings>enable</ImplicitUsings>`, and `<TargetFramework>net10.0-windows</TargetFramework>`. A shared `Directory.Build.props` at the root would centralize these and prevent drift. Of note: `CtblPlusPlus.Infrastructure.csproj` enables `UseWindowsForms` and `UseWPF` without explaining why a headless infrastructure library needs the WPF/WinForms SDK surface.

### [Low] No `.sln` file

Visual Studio cannot open the solution as a unit, IDE refactoring across projects is broken, and there is no solution-level `dotnet build` command. `ctbl.bat` works around this for building, but it is a real friction point for contributors using IDEs.

---

## 6. Secret and Credential Management

### [Critical] Hardcoded admin password `"123"`

`InstallationOrchestrator.cs:438-462`:

```csharp
private const string CtblAccountName = "CTBLAdmin";
private const string CtblInitialPassword = "123";
...
RunCmd("net", $"user \"{CtblAccountName}\" {CtblInitialPassword} /add");
```

The installer creates a local Windows administrator account named `CTBLAdmin` with the password `123`. During the window between account creation and the user changing the password, a known local admin credential exists on the machine. If setup is interrupted or the user skips the password-change step, a permanent local admin backdoor exists with a trivially guessable password. The password is plaintext in source and in the compiled binary (readable with any PE resource inspector).

**Fix:** Generate a cryptographically random password at install time using `RandomNumberGenerator`. Display it once for the user to record, then either force-expire it (`net user CTBLAdmin /logonpasswordchg:yes`) or use `wmic useraccount ... set PasswordExpires=FALSE` after requiring the user to set their own password via `net user CTBLAdmin *`.

### [Medium] `RunCmd` ignores all exit codes

`InstallationOrchestrator.cs:365-378`:

```csharp
private void RunCmd(string cmd, string args)
{
    ...
    using var process = Process.Start(psi);
    process?.WaitForExit();  // exit code never read
}
```

Every `sc create`, `sc start`, `icacls`, `net user`, and `powershell` call goes through this method. A failed service registration, failed ACL hardening, or failed account creation is silently swallowed. The installer reports success and the user is left with a broken installation.

**Fix:** Check `process.ExitCode` after `WaitForExit()` and throw or surface an error for non-zero exits. At minimum, log the exit code.

### [Medium] `GenerateSystemKey()` spawns PowerShell unnecessarily

`InstallationOrchestrator.cs:237-243`: The installer spawns a PowerShell subprocess with `-ExecutionPolicy Bypass` to generate the DPAPI key, even though `ProtectedData.Protect()` is available directly in C# via `System.Security.Cryptography`. `DpapiHmacProvider.InitializeCryptoKey()` already does this correctly in pure C# and could simply be called instead. Because `RunCmd` ignores exit codes, a PowerShell failure here is silently ignored and the services will crash at startup with `DPAPI could not unprotect system.key`.

**Fix:** Call `DpapiHmacProvider.InitializeCryptoKey()` (or equivalent) directly from the installer rather than shelling out to PowerShell.

### [Low] Third-party binaries committed to the repository

`assets/ColdTurkey_Installer.exe` and `assets/MicrosoftEdgeWebView2Setup.exe` are committed as binary blobs.

- **Version lock:** Cold Turkey updates its installer. The committed copy goes stale silently.
- **License compliance:** Redistributing Cold Turkey's installer requires verifying their terms.
- **Supply chain:** A commit that replaces these binaries is easy to miss in a diff review.

**Fix:** Download at install time from official URLs and verify a pinned SHA-256 hash, rather than committing third-party binaries to source.

---

## 7. Hardcoded Paths

Cold Turkey's install path is hard-coded in at least **four separate locations** across three projects:

| File | Line | Hardcoded value |
|---|---|---|
| `CtblPlusPlus.Engine\LocalWebServerService.cs` | 32 | `C:\Program Files\Cold Turkey\web` |
| `CtblPlusPlus.Infrastructure\System\CtblCliClient.cs` | 11 | `C:\Program Files\Cold Turkey\Cold Turkey Blocker.exe` |
| `CtblPlusPlus.Installer\InstallationOrchestrator.cs` | 284 | `C:\Program Files\Cold Turkey\Cold Turkey Blocker.exe` |
| `CtblPlusPlus.Installer\InstallationOrchestrator.cs` | 310–311 | `C:\Program Files\Cold Turkey\web` and `web.ctbl-orig` |

Cold Turkey can be installed to a non-default drive. If it is, all four locations silently break with no error message.

**Fix:** Resolve the Cold Turkey install path once from the registry (Cold Turkey writes its path to `HKLM\SOFTWARE\` at install time), store it in a shared constant or configuration value, and reference it everywhere.

Additionally, `InstallationOrchestrator.cs:470` and `InstallationOrchestrator.cs:516` hardcode `C:\Users\Public\Desktop\Continue CTBL++ Setup.lnk` instead of using `Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory)`.

---

## 8. Things That Work Locally But Break on a Clean Clone

| Issue | Effect on a clean clone |
|---|---|
| `node_modules/` committed to repo | Platform-specific `.ps1`/`.cmd` shims from a Windows build machine are committed. Contributors on other machines or fresh clones get the original developer's node_modules. `npm install` is never reliably triggered; the committed copy may be stale relative to `package-lock.json`. |
| No `.gitignore` | `bin/`, `obj/`, `_payload/`, `Payload.zip`, `WebPayload.zip` are all committed after a build. `node_modules` is already committed as a consequence. `*.bak.*` database backup files could also be committed if a symlink exists. |
| Services are framework-dependent | A clean machine without .NET 10 gets services that fail to start post-installation. No error from the installer. |
| `Payload.zip` / `WebPayload.zip` not in `.gitignore` | If the files do not exist after a fresh clone or after running `[5] Clean`, the installer build fails with a resource-not-found error. Build order is documented but not enforced. |

---

## 9. Unauthenticated Local REST API

**[High] The Engine's REST API has no authentication and accepts wildcard CORS and JSONP.**

`LocalWebServerService.cs:72-75`:

```csharp
response.Headers.Add("Access-Control-Allow-Origin", "*");
...
// JSONP support — any ?callback= parameter wraps the response in a script tag
if (!string.IsNullOrEmpty(callback))
    jsonResponse = $"{callback}({jsonResponse});";
```

Any web page a user visits can make requests to `http://127.0.0.1:58123/api/...` via `fetch` (CORS wildcard) or JSONP, and enqueue or cancel block changes without any token or authentication. For a tamper-resistance tool where circumventing the block is the entire threat model, an unauthenticated local API is a significant bypass vector.

**Fix:** Require a session token generated at Engine startup and injected into the Cold Turkey web page via a meta tag or cookie, so only pages served from `C:\Program Files\Cold Turkey\web` can make authenticated API calls. Alternatively, restrict CORS to the `null` origin (file:///) and remove JSONP support.

---

## 10. WatchdogHeartbeat Restart Bug

**[High] Watchdogs use their own exe path to restart the Engine.**

`WatchdogHeartbeat.cs:27` sets `_exePath = Process.GetCurrentProcess().MainModule?.FileName`, which is `Wd1.exe` (or `Wd2.exe`). When the watchdog detects that the Engine died, `HandleDeathAsync` (line 258) launches:

```csharp
string arg = targetName == "Engine" ? "--engine" : ...;
var psi = new ProcessStartInfo { FileName = _exePath, Arguments = arg, ... };
Process.Start(psi);
```

This starts another instance of the watchdog with an `--engine` argument, not the Engine itself. The Engine uses a separate binary (`CtblPlusPlus.Engine.exe`). `PidBroker.ResurrectProcess` in the Engine correctly constructs the watchdog exe path using `AppDomain.CurrentDomain.BaseDirectory`. `WatchdogHeartbeat.HandleDeathAsync` needs to do the same for the Engine.

**Fix:**

```csharp
string targetExeName = targetName == "Engine"
    ? "CtblPlusPlus.Engine.exe"
    : targetName == "Wd1" ? "CtblPlusPlus.Wd1.exe" : "CtblPlusPlus.Wd2.exe";
string targetExePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, targetExeName);
var psi = new ProcessStartInfo { FileName = targetExePath, ... };
```

---

## Summary Table

| Finding | Severity | Location |
|---|---|---|
| Hardcoded admin password `"123"` | **Critical** | `InstallationOrchestrator.cs:438` |
| Unauthenticated REST API + wildcard CORS/JSONP | **High** | `LocalWebServerService.cs:72` |
| Services not self-contained; .NET 10 not installed by installer | **High** | `ctbl.bat:42-58` |
| Watchdog uses own exe path to restart Engine | **High** | `WatchdogHeartbeat.cs:258` |
| `RunCmd` ignores all exit codes | **Medium** | `InstallationOrchestrator.cs:365` |
| Debug service binaries shipped in Release installer | **Medium** | `ctbl.bat:42-58` |
| Nullable warnings globally suppressed in Application/Domain | **Medium** | `*.Application.csproj:7`, `*.Domain.csproj:6` |
| Cold Turkey install path not resolved from registry (4 locations) | **Medium** | `LocalWebServerService.cs:32`, `CtblCliClient.cs:11`, `InstallationOrchestrator.cs:284,310` |
| `GenerateSystemKey` shells out to PowerShell unnecessarily | **Medium** | `InstallationOrchestrator.cs:237` |
| `Deploy.ps1` exits with code 0 on all failure paths | **Medium** | `Deploy.ps1:22,32,42` |
| `node_modules` committed to repo; no `.gitignore` | **Medium** | repo root |
| CONTRIBUTING.md references non-existent Split/Combine menu option | **Medium** | `CONTRIBUTING.md:62` |
| Third-party binaries committed to repo | **Low** | `assets/` |
| No CI pipeline | **Low** | repo root |
| Backup directories grow unboundedly on each `Deploy.ps1` run | **Low** | `Deploy.ps1:52` |
| No `.sln` file | **Low** | repo root |
| No `Directory.Build.props` | **Low** | repo root |
| `Public\Desktop` path hardcoded instead of using `SpecialFolder` | **Low** | `InstallationOrchestrator.cs:470,516` |
