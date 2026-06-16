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

| Feature | Description |
|---|---|
| **Accountability partner lock** | Requires a second person to approve changes via code, link, or paired device |
| **Escalating delay lock** | Consecutive unlock attempts increase the wait (e.g. 1h → 4h → 24h) |
| **Commitment contract lock** | Ties block-breaking to a financial penalty via Beeminder, StickK, etc. |

### Enforcement

| Feature | Description |
|---|---|
| **VPN / DNS enforcement** | Detect and block bypass attempts through VPNs, DoH, or custom DNS |
| **Virtual machine detection** | Detect if the user spun up a VM or sandbox to circumvent blocking |
| **Safe mode enforcement** | Prevent or recover from booting into Safe Mode to disable services |

### App Control

| Feature | Description |
|---|---|
| **Portable app blocking** | Detect and block executables that run without installation |
| **Browser profile enforcement** | Detect and block new browser profiles that bypass extension-based blocking |

### UI

| Feature | Description |
|---|---|
| **Queue history / audit log viewer** | Full history of queued actions, completions, cancellations, and tamper rollbacks |
| **CTBL++ dashboard** | Enforcer status, watchdog health, queue depth, and last integrity check at a glance |

---

## Planned

Acknowledged and on the roadmap, but not yet shipped.

### AI

| Feature | Description | Status |
|---|---|---|
| **Local AI categorization** | Local LLM auto-categorizes sites, searches, and apps against your goals. Candidates: TurboQuant, Gemma 4 E2B, Lfm2.5 1.2B, Gemma 3 1B | Designing |

### Codebase

| Feature | Description | Status |
|---|---|---|
| **Bug fixes & dead code removal** | Clean up known bugs and remove dead code from earlier iterations | In progress |
| **Simplify over-complex areas** | Reduce unnecessary abstraction where the architecture outgrew the problem | In progress |

---

## Shipped

Everything below is built, functional, and included in the current release.

### Lock Type

| Feature | Description |
|---|---|
| **Queued Delay** | Queue changes instead of unlocking first — no vulnerability window, no instant access for impulse |

### Tamper Resistance

| Feature | Description |
|---|---|
| **Engine + dual-watchdog** | Engine backed by Wd1/Wd2 — they cross-monitor, restart on death, and mark themselves critical (kill = BSOD) |
| **HMAC-signed queue** | Every queue request is signed with HMAC-SHA256; the Engine validates before executing |
| **DPAPI vault sealing** | HMAC key protected by Windows DPAPI (machine-scope, SYSTEM-only) + NTFS ACLs |
| **NTFS ACL enforcement** | Periodically re-applies restrictive ACLs on install directory and vault, stripping all access except SYSTEM |
| **Binary file locking** | Holds open file handles on all core binaries, preventing modification or deletion while running |
| **SHA-256 integrity verification** | Periodically verifies binaries against a sealed hash manifest; tampered files auto-restore from vault |
| **File system watchdog** | Real-time monitoring of high-risk directories; immediately deletes side-loaded target binaries |
| **Scorched earth purge** | Scans System32/WinSxS for prohibited binaries, takes ownership from TrustedInstaller, and removes them |
| **Website tamper remediation** | Detects queue entries injected directly into the DB (bypassing HMAC) and rolls them back |

### Enforcement

| Feature | Description |
|---|---|
| **Time enforcer** | Verifies system time against NTP, detects clock jumps, strips `SeSystemtimePrivilege` from non-system accounts |
| **Factory reset enforcer** | Blocks Factory Reset and Advanced Startup via Group Policy registry keys and `reagentc.exe` disablement |
| **Task manager enforcer** | Blocks Taskmgr, Process Explorer, Process Hacker, Resource Monitor, Regedit via IFEO hijacking |
| **Account enforcer** | Blocks Windows Account Settings panels via Registry Policy + Settings app process termination |
| **Privilege enforcer** | Strips `SeSystemtimePrivilege` from non-system accounts via `secedit` |
| **Uninstaller enforcer** | Hides CTBL++ and Cold Turkey from Add/Remove Programs by removing uninstall registry keys |
| **Persistence enforcer** | Self-healing — monitors installation state and auto-restores from vault on tamper |
| **Browser enforcer** | Enforces extension install policies via registry for Chrome, Edge, and Brave |

### Queue System

| Feature | Description |
|---|---|
| **Queued delay unlock** | Queue a full block unlock with a configurable delay; block stays active until timer expires |
| **Global delay** | System-wide delay for all queued ops; decreasing it is itself a queued operation |
| **List action queue** | Add/remove websites and apps from a block's list through the delay queue |
| **App control queue** | Allow, revoke, and toggle app control through the queue with delay protections |
| **Queue security validation** | HMAC signature verification, replay attack checks, and structure validation before dispatch |
| **Audit logging** | Every queue action recorded in a persistent SQLite audit log |

### App Control

| Feature | Description |
|---|---|
| **Application whitelist** | Dedicated block that discovers apps and lets you allow/block them; Queued Delay routes allows through the queue |
| **App discovery service** | Real-time detection via `FileSystemWatcher` + 2-minute polling fallback; Engine/Wd1/Wd2 auto-allowed |
| **Bulk operations** | Allow or revoke multiple applications at once |

### UI

| Feature | Description |
|---|---|
| **Patched Cold Turkey interface** | No separate window — patches CT's own web front-end via webpack with timestamped backups |
| **Queued Delay in lock editor** | Dedicated tab with pending unlock timers, list action countdowns, and cancel options |
| **Enforcer toggles** | Per-enforcer switches in Settings; can't disable during a locked block without confirmation |
| **Global delay config** | Hours/minutes inputs, pending-decrease countdown with ETA, and cancel button |
| **Queue entries viewer** | Each block's modal shows pending actions with time remaining and cancel options |
| **App whitelist tab** | Discovered apps with status dots, inline allow/revoke, and bulk operations |

### Installer

| Feature | Description |
|---|---|
| **WPF + WebView2 setup wizard** | Graphical installer handling service registration, payload extraction, and CT detection |
| **Single-file self-contained release** | No .NET runtime needed; prebuilt download on the Releases page |
| **Build menu** | Interactive `ctbl.bat` for building, launching, publishing, and cleaning |

### Infrastructure

| Feature | Description |
|---|---|
| **Local REST API** | Engine hosts HTTP on `127.0.0.1:58123` with JSONP; the patched UI talks exclusively through this |
| **SQLite persistence** | Queue, settings, app registry, and audit log via dedicated repositories with DB lock retry |
| **PID broker** | Inter-process identity resolution between Engine and watchdogs |
| **Watchdog heartbeat** | Periodic health signal for fast failure detection |
| **Internet time source** | NTP-based ground truth for clock tampering detection |
| **Clean architecture** | Four-layer separation: Domain → Application → Infrastructure → Engine |
