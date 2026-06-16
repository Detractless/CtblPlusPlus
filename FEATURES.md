<p align="center"> <img src="assets/banner.svg" alt="CTBL++. Cold Turkey Blocker, extended" width="100%"> </p> <p align="center"> <b>A community-built add-on for <a href="https://getcoldturkey.com/">Cold Turkey Blocker</a> that adds features the official app doesn't have.</b> </p> <p align="center">
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
| | |

### Enforcement

| Feature | Description |
|---|---|
| | |

### App Control

| Feature | Description |
|---|---|
| | |

### UI

| Feature | Description |
|---|---|
| | |

---

## Planned

Acknowledged and on the roadmap, but not yet shipped.

### AI

| Feature | Description | Status |
|---|---|---|
| **Local AI categorization** | Local LLM auto-categorizes sites, searches, and apps against your goals and adds them to the right blocklist | Designing |

### Codebase

| Feature | Description | Status |
|---|---|---|
| **Bug fixes & dead code removal** | Clean up known bugs and remove leftover dead code | In progress |
| **Simplify over-complex areas** | Reduce unnecessary abstraction in areas that outgrew the problem | In progress |

### Enforcement

| Feature | Description | Status |
|---|---|---|
| **Forced DNS** | Lock the system to a chosen DNS provider with prebuilt options (CleanBrowsing, OpenDNS FamilyShield, etc.) or a custom one. Prevents switching to an unfiltered DNS to bypass blocking | Planned |

### UI

| Feature | Description | Status |
|---|---|---|
| **Block folders** | Organize your blocks into folders and subfolders instead of a flat list. Group related blocks however you want | Planned |
| **Help tab** | A new tab between Blocks and Statistics with common Q&A and video tutorials to help new users get started | Planned |

---

## Shipped

Everything below is built, functional, and included in the current release.

### Lock Type

| Feature | Description |
|---|---|
| **Queued Delay** | Queue changes to a block instead of unlocking it first. No vulnerability window, no instant access for an impulse to act on |

### Queue System

| Feature | Description |
|---|---|
| **Global delay** | A system-wide delay applied to all queued operations. Decreasing it is itself a queued operation, so you can't impulsively lower it |
| **List action queue** | Add or remove websites and apps from a block's list through the delay queue instead of instantly |
| **App control queue** | Allow, revoke, and toggle app control through the queue with the same delay protections |
| **Tamper-proof queue** | Queue requests are cryptographically signed. Editing the database directly won't bypass the delay. Injected entries are detected and rolled back automatically |

### Tamper Resistance

| Feature | Description |
|---|---|
| **Dual-watchdog enforcement** | Two watchdog services monitor the Engine and each other, restart on death, and mark themselves as critical processes. Killing one triggers a BSOD |
| **File integrity protection** | Installed binaries are locked while running, verified against sealed hashes on a loop, and auto-restored from a secure vault if tampered with |
| **System binary removal** | Tools that could be used to bypass enforcement (bcdedit, reagentc, msconfig, etc.) are monitored and removed from the system |

### Enforcement

| Feature | Description |
|---|---|
| **Clock manipulation protection** | Verifies system time against NTP servers and detects clock jumps. Strips the time-change privilege from your account so you can't adjust the clock manually |
| **Factory reset protection** | Blocks Windows Factory Reset and Advanced Startup Options so you can't wipe the machine to escape a block |
| **Task manager protection** | Blocks Task Manager, Process Explorer, Process Hacker, Resource Monitor, and Registry Editor while enforcement is active |
| **Account settings protection** | Blocks access to the Windows Account Settings panels so you can't create or switch to another user to get around blocks |
| **Uninstall protection** | Hides CTBL++ and Cold Turkey from Add/Remove Programs |
| **Self-healing** | If enforcement files are tampered with, they auto-restore from a secure vault |
| **Browser extension enforcement** | Prevents removal of blocking browser extensions for Chrome, Edge, and Brave while a lock is active |

### App Control

| Feature | Description |
|---|---|
| **Application whitelist** | Discovers installed apps automatically and lets you allow or block them. When locked with Queued Delay, allowing a new app goes through the delay queue |
| **Auto-discovery** | New applications are detected in real time as they're installed or launched. No manual registration |
| **Bulk allow / revoke** | Allow or revoke multiple applications at once |

### UI

| Feature | Description |
|---|---|
| **Native Cold Turkey integration** | No separate window. CTBL++ features appear directly inside Cold Turkey's own interface |
| **Queued Delay lock editor** | Dedicated tab in the lock editor with pending unlock timers, list action countdowns, and cancel options |
| **Enforcer toggles** | Per-enforcer on/off switches in Settings. Can't disable while a locked block is active without confirmation |
| **Global delay controls** | Set the delay in hours and minutes, see pending decreases with a countdown, and cancel if needed |
| **Pending actions viewer** | Each block shows its pending queued actions with time remaining and a cancel option |

### Installer

| Feature | Description |
|---|---|
| **One-click setup** | Single-file installer. Download, run, done. No .NET runtime or dependencies needed |
| **Prebuilt releases** | Grab the latest build from the [Releases](https://github.com/Detractless/CtblPlusPlus/releases) page without compiling anything |
