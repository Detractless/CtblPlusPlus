<p align="center"> <img src="assets/banner.svg" alt="CTBL++ — Cold Turkey Blocker, extended" width="100%"> </p> <p align="center"> <b>A community-built add-on for <a href="https://getcoldturkey.com/">Cold Turkey Blocker</a> that adds features the official app doesn't have.</b> </p> <p align="center">
  <img src="https://img.shields.io/badge/platform-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Platform: Windows">
  <img src="https://img.shields.io/badge/.NET-10-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt=".NET 10">
  <img src="https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=csharp&logoColor=white" alt="C#">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/status-beta-8B5CF6?style=for-the-badge" alt="Status: beta">
  <img src="https://img.shields.io/badge/requires-Cold%20Turkey%20Pro-DC2626?style=for-the-badge" alt="Requires Cold Turkey Pro">
  <img src="https://img.shields.io/badge/license-MIT-22C55E?style=for-the-badge" alt="License: MIT">
  <img src="https://img.shields.io/badge/stars-2-eac54f?style=for-the-badge&logo=github&logoColor=white" alt="Stars">
</p>

---

## Requested

Features the community has asked for. Vote on these by reacting to the linked issue, or [open a new one](https://github.com/Detractless/CtblPlusPlus/issues).

### Lock Type

| Feature | Description |
|---|---|
| **Accountability partner lock** | A lock that requires a second person to approve changes via a code, link, or paired device — not just a password you set yourself. |
| **Escalating delay lock** | A queued delay variant where consecutive unlock attempts increase the wait time (e.g. 1h → 4h → 24h), making repeated impulse-driven attempts progressively harder. |
| **Commitment contract lock** | Integrates with a commitment platform (e.g. Beeminder, StickK) so breaking a block has a real financial penalty attached. |

### Enforcement

| Feature | Description |
|---|---|
| **VPN / DNS enforcement** | Detect and block attempts to bypass site blocking through VPN apps, DNS-over-HTTPS, or custom DNS servers. |
| **Virtual machine detection** | Detect if the user is running a VM or sandbox to circumvent the blocked environment. |
| **Safe mode enforcement** | Prevent or recover from the user booting into Windows Safe Mode to disable services. |

### App Control

| Feature | Description |
|---|---|
| **Portable app blocking** | Detect and block apps that run without installation (portable executables launched from USB, Downloads, etc.). |
| **Browser profile enforcement** | Detect and block the creation of new browser profiles that bypass extension-based blocking. |

### UI

| Feature | Description |
|---|---|
| **Queue history / audit log viewer** | A page in the UI showing a full history of queued actions, completions, cancellations, and tamper rollbacks. |
| **Dashboard with block status overview** | A CTBL++-specific dashboard showing active enforcer status, watchdog health, queue depth, and last integrity check time. |

---

## Planned

Features that are acknowledged and on the roadmap but not yet shipped. These are being actively considered or designed.

### AI

| Feature | Description | Status |
|---|---|---|
| **Local AI categorization** | A local LLM that automatically categorizes sites, searches, and apps against your stated goals and adds them to the right blocklist — no manual management needed. Candidate models: TurboQuant, Gemma 4 E2B, Lfm2.5 1.2B, Gemma 3 1B. | Designing |

### Codebase

| Feature | Description | Status |
|---|---|---|
| **Bug fixes & dead code removal** | Clean up known bugs and remove dead/unreachable code paths left over from earlier architecture iterations. | In progress |
| **Simplify over-complex areas** | Reduce unnecessary abstraction and consolidate areas where the architecture outgrew the problem. | In progress |

---

## Shipped

Everything below is built, functional, and included in the current release.

### Lock Type

| Feature | Description |
|---|---|
| **Queued Delay** | A new lock type that removes the most vulnerable moment in Cold Turkey's workflow. Instead of unlocking a block to change it (when you're most exposed to relapse), you *queue* the change and it executes after a delay you chose in advance. There's nothing to re-lock and no instant access for an impulse to act on. Implemented as a lock-type extension (`password = CTBL_QUEUED_DELAY`) with full UI integration in the lock editor. |

### Tamper Resistance

| Feature | Description |
|---|---|
| **Engine + dual-watchdog architecture** | A background Engine service (does all real work) backed by two watchdog services (Wd1 / Wd2). The watchdogs monitor the Engine and each other, restart on death, and mark themselves as Windows critical processes — killing one triggers a BSOD, making the enforcement layer extremely hard to simply terminate. |
| **HMAC-signed queue** | Every queue request is cryptographically signed with HMAC-SHA256. The Engine validates signatures before executing any queued action, preventing direct database tampering from bypassing the delay. |
| **DPAPI vault sealing** | The HMAC key material is protected by Windows DPAPI (machine-scope), meaning it can only be decrypted on the same machine by the SYSTEM account. The key file is further protected by NTFS ACLs. |
| **NTFS ACL enforcement** | The `VaultAclEnforcementService` periodically re-applies restrictive NTFS ACLs on the install directory and secure vault, stripping all access except SYSTEM. Combats ownership-takeover attacks. Uses in-process ACL API (no child-process overhead). |
| **Binary file locking** | The `BinaryFileLockService` holds open `FileStream` handles on all core binaries in the install directory while the Engine is running. This prevents any process — including Admin and SYSTEM — from modifying, renaming, or deleting the files. |
| **SHA-256 integrity verification** | The `IntegrityVerificationService` periodically verifies SHA-256 hashes of all installed binaries against a sealed manifest. Tampered files are auto-restored from the vault. |
| **File system watchdog** | The `FileSystemWatchdogService` monitors high-risk directories in real time via `FileSystemWatcher` and immediately deletes any side-loaded target binaries (bcdedit, reagentc, msconfig, etc.). |
| **Scorched earth purge** | The `ScorchedEarthPurgeService` periodically scans System32 and WinSxS for prohibited binaries, takes ownership from TrustedInstaller, and removes them — eliminating tools that could be used to bypass enforcement. |
| **Website tamper remediation** | The `WebsiteTamperRemediator` detects queue entries that were injected directly into the database (bypassing HMAC signing) and rolls them back automatically. |

### Enforcement

| Feature | Description |
|---|---|
| **Time enforcer** | Prevents clock manipulation by verifying system time against an internet time source (NTP). Detects forward/backward jumps beyond a 3-minute tolerance. Strips `SeSystemtimePrivilege` from non-system accounts via the Privilege enforcer to block manual clock changes at the OS level. |
| **Factory reset enforcer** | Blocks Windows Factory Reset and Advanced Startup Options via Group Policy registry keys, Explorer policy restrictions, and `reagentc.exe` (WinRE) disablement. |
| **Task manager enforcer** | Blocks task manager and process inspection tools (Taskmgr, Process Explorer, Process Hacker, Resource Monitor, Regedit) using Image File Execution Options (IFEO) debugger key hijacking. |
| **Account enforcer** | Prevents access to Windows Account Control panels (Settings → Accounts and all sub-pages) by combining Registry Policy manipulation with aggressive process termination of Settings app when navigating to blocked URIs. |
| **Privilege enforcer** | Enforces User Rights Assignment policies via `secedit`, specifically stripping `SeSystemtimePrivilege` from non-system accounts to prevent manual clock manipulation. |
| **Uninstaller enforcer** | Hides CTBL++ and Cold Turkey entries from the Windows Add/Remove Programs list by removing their `Uninstall` registry keys, making casual uninstallation harder to find. |
| **Persistence enforcer** | Self-healing service that monitors the Engine's installation state and auto-restores from vault if files are tampered with. Ensures services remain registered and running. |
| **Browser enforcer** | Enforces browser extension installation policies via registry (Chrome/Edge/Brave), ensuring blocking extensions remain installed and can't be removed by the user while a lock is active. |

### Queue System

| Feature | Description |
|---|---|
| **Queued delay unlock** | Queue a full block unlock with a configurable delay. The block stays active until the timer expires — no window of vulnerability. |
| **Global delay setting** | A system-wide delay (in hours/minutes) applied to all queued operations. Decreasing the global delay is itself a queued operation subject to the current delay, preventing impulsive reduction. |
| **List action queue** | Add or remove websites and apps from a block's list through the delay queue. Changes take effect only after the configured delay, so you can't impulsively whitelist a site. Supports `REMOVE\|`, `REMOVE_APP\|`, and standard website exception entries. |
| **App control queue** | Allow, revoke, and toggle app control through the queue system with the same delay protections. Supports `APP_ALLOW`, `APP_REVOKE`, `APP_REVOKE_PATH`, `APP_ENABLE_CONTROL`, and `APP_DISABLE_CONTROL` operations. |
| **Queue security validation** | All queue requests pass through `QueueSecurityValidator` which verifies HMAC signatures, checks for replay attacks, and validates request structure before any action is dispatched. |
| **Audit logging** | Every queue action (enqueue, execute, cancel, fail, tamper rollback) is recorded in a persistent audit log via `SqliteAuditRepository`. |

### App Control

| Feature | Description |
|---|---|
| **Application whitelist** | A dedicated block (`CTBL ++ Application Whitelist`) that discovers installed applications and lets you allow or block them. When locked with Queued Delay, allowing a new app goes through the delay queue — you can't impulsively whitelist something. |
| **App discovery service** | Real-time application discovery using `FileSystemWatcher` on common install directories, backed by a 2-minute fallback polling loop that scans running processes. New apps are detected and registered automatically. Self-preservation logic ensures Engine/Wd1/Wd2 are always marked Allowed. |
| **Bulk operations** | Allow or revoke multiple applications at once through bulk-allow and bulk-revoke API endpoints. |

### UI

| Feature | Description |
|---|---|
| **Patched Cold Turkey interface** | CTBL++ delivers its UI by patching Cold Turkey's own web front-end — there is no separate window. A webpack build (`Deploy.ps1`) replaces the `web` folder in Cold Turkey's install directory, with a timestamped backup for rollback. All CTBL++ features appear natively inside Cold Turkey. |
| **Queued Delay in lock editor** | The lock editor page includes a dedicated "Queued Delay" tab. Selecting it sets the block's lock type and registers it with the Engine. The UI shows pending unlock timers, list action countdowns, and a cancel option. |
| **Enforcer toggles in settings** | The Settings page includes toggles for each CTBL++ enforcer (Time, Factory Reset, Task Manager, Account, Privilege). Enforcers cannot be disabled while a locked block is active — the toggle is grayed out with a warning. Enabling an enforcer while a block is locked requires an explicit confirmation dialog. |
| **Global delay configuration** | The Settings page includes hours/minutes inputs for the global delay, a button to apply changes, pending-decrease status with countdown and ETA, and a cancel button for pending decreases. |
| **Queue entries viewer** | Each block's management modal shows a live list of pending queued actions (unlocks and list additions/removals) with time remaining, entry type, and a cancel option. |
| **App whitelist tab** | A dedicated tab in the block editor showing all discovered applications with green/red status dots (Allowed/Blocked), inline allow/revoke buttons, and bulk operations. When the whitelist block is locked with Queued Delay, individual allow operations route through the delay queue. |

### Installer

| Feature | Description |
|---|---|
| **WPF + WebView2 setup wizard** | A graphical installer built with WPF and WebView2 that handles service registration, payload extraction, and Cold Turkey detection. Ships the Cold Turkey installer for convenience. |
| **Single-file self-contained release** | Published as a single-file, self-contained executable (no .NET runtime required on the target machine). Available as a prebuilt download from the [Releases](https://github.com/Detractless/CtblPlusPlus/releases) page. |
| **Build menu** | An interactive `ctbl.bat` build menu that handles building all projects, launching the installer, running the Engine in console mode, publishing a release build, and cleaning for GitHub. |

### Infrastructure

| Feature | Description |
|---|---|
| **Local REST API** | The Engine hosts a local HTTP server on `127.0.0.1:58123` with JSONP support, exposing all queue, settings, enforcer, and app control operations. The patched UI communicates exclusively through this API. |
| **SQLite persistence** | All state (queue, settings, app registry, audit log) is stored in SQLite via dedicated repositories (`SqliteQueueRepository`, `SqliteSettingsRepository`, `SqliteAppControlRepository`, `SqliteAuditRepository`). Database locking is handled gracefully with retry logic. |
| **PID broker** | Inter-process communication between Engine and watchdogs uses a `PidBroker` for process identity resolution — each service can locate and verify the others. |
| **Watchdog heartbeat** | The `WatchdogHeartbeat` system provides a periodic health signal between the Engine and watchdog services, enabling fast detection of service failure. |
| **Internet time source** | The `InternetTimeSource` fetches authoritative time from NTP servers, providing the ground truth the Time enforcer uses to detect clock tampering. |
| **Clean architecture** | Four-layer separation: `Domain` (models, interfaces, rules) → `Application` (queue service, handlers, state management) → `Infrastructure` (persistence, security, system integration) → `Engine` (hosting, API). Each project references only Core. |
