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

Features the community has asked for. Vote by reacting to the linked issue, or [open a new one](https://github.com/Detractless/CtblPlusPlus/issues).

### Lock Type

- **Accountability partner lock** — requires a second person to approve changes via code, link, or paired device
- **Escalating delay lock** — consecutive unlock attempts increase the wait time (e.g. 1h → 4h → 24h)
- **Commitment contract lock** — ties block-breaking to a real financial penalty via Beeminder, StickK, etc.

### Enforcement

- **VPN / DNS enforcement** — detect and block bypass attempts through VPNs, DoH, or custom DNS
- **Virtual machine detection** — detect if the user spun up a VM or sandbox to circumvent blocking
- **Safe mode enforcement** — prevent or recover from booting into Windows Safe Mode to disable services

### App Control

- **Portable app blocking** — detect and block executables that run without installation (USB, Downloads, etc.)
- **Browser profile enforcement** — detect and block new browser profiles that bypass extension-based blocking

### UI

- **Queue history / audit log viewer** — a page showing the full history of queued actions, completions, cancellations, and tamper rollbacks
- **CTBL++ dashboard** — active enforcer status, watchdog health, queue depth, and last integrity check time at a glance

---

## Planned

Acknowledged and on the roadmap, but not yet shipped.

### AI

- **Local AI categorization** — a local LLM that auto-categorizes sites, searches, and apps against your stated goals and adds them to the right blocklist. Candidate models: TurboQuant, Gemma 4 E2B, Lfm2.5 1.2B, Gemma 3 1B.

### Codebase

- **Bug fixes & dead code removal** — clean up known bugs and remove dead code paths from earlier iterations
- **Simplify over-complex areas** — reduce unnecessary abstraction where the architecture outgrew the problem

---

## Shipped

Everything below is built, functional, and included in the current release.

### Lock Type

- **Queued Delay** — queue changes to a block instead of unlocking it first. The block stays active while the timer runs — no window of vulnerability, no instant access for an impulse to act on. Full UI integration in the lock editor.

### Tamper Resistance

- **Engine + dual-watchdog architecture** — background Engine service backed by Wd1 and Wd2. They monitor the Engine and each other, restart on death, and mark themselves as Windows critical processes (kill = BSOD).
- **HMAC-signed queue** — every queue request is signed with HMAC-SHA256. The Engine validates signatures before executing, preventing direct DB tampering.
- **DPAPI vault sealing** — HMAC key material protected by Windows DPAPI (machine-scope, SYSTEM-only). Further locked down by NTFS ACLs.
- **NTFS ACL enforcement** — `VaultAclEnforcementService` periodically re-applies restrictive ACLs on the install directory and vault, stripping all access except SYSTEM.
- **Binary file locking** — `BinaryFileLockService` holds open file handles on all core binaries, preventing modification or deletion while the Engine runs.
- **SHA-256 integrity verification** — `IntegrityVerificationService` periodically verifies installed binaries against a sealed hash manifest. Tampered files auto-restore from vault.
- **File system watchdog** — `FileSystemWatchdogService` monitors high-risk directories in real time and deletes any side-loaded target binaries (bcdedit, reagentc, msconfig, etc.).
- **Scorched earth purge** — `ScorchedEarthPurgeService` scans System32 and WinSxS for prohibited binaries, takes ownership from TrustedInstaller, and removes them.
- **Website tamper remediation** — `WebsiteTamperRemediator` detects queue entries injected directly into the database (bypassing HMAC) and rolls them back.

### Enforcement

- **Time enforcer** — verifies system time against NTP, detects clock jumps beyond a 3-minute tolerance, strips `SeSystemtimePrivilege` from non-system accounts.
- **Factory reset enforcer** — blocks Windows Factory Reset and Advanced Startup via Group Policy registry keys and `reagentc.exe` disablement.
- **Task manager enforcer** — blocks Taskmgr, Process Explorer, Process Hacker, Resource Monitor, and Regedit via IFEO debugger key hijacking.
- **Account enforcer** — blocks Windows Account Settings panels via Registry Policy manipulation and process termination of the Settings app.
- **Privilege enforcer** — strips `SeSystemtimePrivilege` from non-system accounts via `secedit` to prevent manual clock changes.
- **Uninstaller enforcer** — hides CTBL++ and Cold Turkey from Add/Remove Programs by removing their uninstall registry keys.
- **Persistence enforcer** — self-healing service that monitors installation state and auto-restores from vault if files are tampered with.
- **Browser enforcer** — enforces browser extension install policies via registry for Chrome, Edge, and Brave, preventing removal of blocking extensions.

### Queue System

- **Queued delay unlock** — queue a full block unlock with a configurable delay. The block stays active until the timer expires.
- **Global delay** — a system-wide delay applied to all queued operations. Decreasing it is itself a queued operation subject to the current delay.
- **List action queue** — add or remove websites and apps from a block's list through the delay queue. Supports `REMOVE|`, `REMOVE_APP|`, and standard exception entries.
- **App control queue** — allow, revoke, and toggle app control through the queue with the same delay protections.
- **Queue security validation** — HMAC signature verification, replay attack checks, and request structure validation before dispatch.
- **Audit logging** — every queue action (enqueue, execute, cancel, fail, tamper rollback) is recorded in a persistent SQLite audit log.

### App Control

- **Application whitelist** — a dedicated block that discovers installed apps and lets you allow or block them. When locked with Queued Delay, allowing a new app goes through the delay queue.
- **App discovery service** — real-time detection via `FileSystemWatcher` on common install directories + a 2-minute polling fallback scanning running processes. Engine/Wd1/Wd2 are always auto-allowed.
- **Bulk operations** — allow or revoke multiple applications at once.

### UI

- **Patched Cold Turkey interface** — no separate window. CTBL++ patches Cold Turkey's own web front-end via webpack. `Deploy.ps1` handles the build with timestamped backups.
- **Queued Delay in lock editor** — dedicated tab in the lock editor with pending unlock timers, list action countdowns, and cancel options.
- **Enforcer toggles** — per-enforcer on/off switches in Settings. Can't disable while a locked block is active; enabling during a lock requires confirmation.
- **Global delay config** — hours/minutes inputs, pending-decrease status with countdown and ETA, and cancel button.
- **Queue entries viewer** — each block's modal shows a live list of pending actions with time remaining and cancel options.
- **App whitelist tab** — shows all discovered apps with status dots (green/red), inline allow/revoke, and bulk operations. Queued Delay routes allows through the delay queue.

### Installer

- **WPF + WebView2 setup wizard** — graphical installer handling service registration, payload extraction, and Cold Turkey detection.
- **Single-file self-contained release** — no .NET runtime needed. Prebuilt download on the [Releases](https://github.com/Detractless/CtblPlusPlus/releases) page.
- **Build menu** — interactive `ctbl.bat` for building all projects, launching the installer, console mode, publishing, and cleaning.

### Infrastructure

- **Local REST API** — Engine hosts HTTP on `127.0.0.1:58123` with JSONP. The patched UI communicates exclusively through this.
- **SQLite persistence** — queue, settings, app registry, and audit log stored via dedicated repositories with retry logic for DB locking.
- **PID broker** — inter-process identity resolution between Engine and watchdogs.
- **Watchdog heartbeat** — periodic health signal between Engine and watchdogs for fast failure detection.
- **Internet time source** — NTP-based ground truth for the Time enforcer's clock tampering detection.
- **Clean architecture** — four-layer separation: Domain → Application → Infrastructure → Engine. Each project references only Core.
