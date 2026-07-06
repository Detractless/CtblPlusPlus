# Fix: Gray Screen on Amazon EC2 Windows Server 2022 VM

## Summary

Cold Turkey's UI was rendering as a blank gray screen on an Amazon EC2 instance running Windows Server 2022. The root cause was a chain of IE WebBrowser control restrictions that Windows Server imposes by default — specifically, a combination of IE Security Zone misclassification, missing browser emulation mode, and Local Machine Zone lockdown flags — all of which blocked the `window.external` COM bridge that Cold Turkey injects into the embedded browser. Without that bridge, CTBL++'s JavaScript crashed before it could make the container visible.

---

## Architecture Background

Cold Turkey's UI is rendered inside a **legacy IE WebBrowser control** (a WinForms/WPF embedded browser, not WebView2). Cold Turkey's C# host injects a COM-scriptable object into the browser and exposes it as `window.external`. CTBL++ calls `window.external.SendSettings()` on startup to load the user's block configuration. This call happens inside `jQuery(document).ready` in `app.js`.

The container `<div>` starts at `opacity: 0`. The only code that makes the UI visible is:

```javascript
// app.js line 218
$(".container").css("opacity", "1");
```

If anything throws an unhandled exception before line 218, execution stops and the screen stays gray permanently.

---

## Why the Amazon VM Broke It

### 1. Windows Server vs. Windows Desktop IE Security Defaults

On **Windows Desktop** (10/11), IE treats `localhost` as a trusted Local Intranet site (Zone 1). Zone 1 allows scripting of WebBrowser controls and COM interop by default.

On **Windows Server**, `localhost` is classified as an **Internet site (Zone 3)** unless the machine is domain-joined. Zone 3 has much stricter defaults inherited from Internet Explorer Enhanced Security Configuration (IE ESC). Even after turning off IE ESC in Server Manager, the underlying Zone 3 security settings remain at their restrictive defaults — IE ESC only adjusts the UI defaults, not all registry values.

### 2. `window.external` Requires Zone Setting 1206

IE security setting `1206` controls **"Allow scripting of Internet Explorer WebBrowser control"**. By default on Windows Server:

- Zone 1 (Local Intranet): enabled
- Zone 3 (Internet): **disabled**

Since `localhost` was in Zone 3, setting 1206 was disabled, which silently blocked the `window.external` COM object from being scriptable. From JavaScript's perspective, `window.external.SendSettings` was not a function — it threw a TypeError, which crashed `document.ready` before the opacity flip.

### 3. Missing FEATURE_BROWSER_EMULATION

When a process embeds the IE WebBrowser control, it defaults to **IE 7 compatibility mode** unless a registry entry explicitly sets the emulation level. IE 7 mode has additional restrictions on COM interop and scripting that are not present in IE 11 mode. Cold Turkey's installer normally sets this key on user machines, but on this VM it was absent.

### 4. FEATURE_LOCALMACHINE_LOCKDOWN and FEATURE_BLOCK_LMZ_SCRIPT

On Windows Server, two additional IE FeatureControl flags are active by default:

- `FEATURE_LOCALMACHINE_LOCKDOWN` — prevents scripts running in the Local Machine Zone (Zone 0) from accessing system resources
- `FEATURE_BLOCK_LMZ_SCRIPT` — blocks JavaScript execution for content loaded from the local file system

When these are enabled for a specific process (or globally), even pages served via `localhost` can be caught by the lockdown when the content is ultimately loaded from `C:\Program Files\Cold Turkey\web`. Both flags interfere with the `window.external` COM bridge on Server SKUs.

---

## What Was Applied

Six registry changes were written to `HKEY_CURRENT_USER`:

### 1. Force IE11 Emulation Mode for Cold Turkey

```
HKCU\SOFTWARE\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_BROWSER_EMULATION
  "Cold Turkey Blocker.exe" = DWORD 0x2AF8  (11000 decimal)
```

`0x2AF8` = 11000 = IE11 edge mode (standards-compliant). This prevents Cold Turkey's WebBrowser control from falling back to IE7 quirks mode, which resolves several secondary COM scripting restrictions.

### 2. Disable Local Machine Zone Lockdown

```
HKCU\SOFTWARE\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_LOCALMACHINE_LOCKDOWN
  "Cold Turkey Blocker.exe" = DWORD 0
```

Setting this to `0` for the specific executable disables the lockdown only for Cold Turkey's process, without affecting the rest of the system.

### 3. Allow Local Machine Zone Scripts

```
HKCU\SOFTWARE\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_BLOCK_LMZ_SCRIPT
  "Cold Turkey Blocker.exe" = DWORD 0
```

Same per-process override — allows JavaScript to run for content originating from the local machine zone.

### 4. Map localhost to Local Intranet Zone

```
HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\localhost
  "http" = DWORD 1
```

Zone `1` = Local Intranet. This tells IE's zone resolver that `http://localhost` is a trusted intranet address. This is the core fix for the Zone 3 misclassification: CTBL++'s engine serves everything from `http://localhost:58123`, so reclassifying localhost fixes the zone for all requests.

### 5. Enable WebBrowser Control Scripting in Zones 1 and 3

```
HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\1
  "1206" = DWORD 0   (0 = Enable)

HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\3
  "1206" = DWORD 0   (0 = Enable)
```

Setting `1206` to `0` enables "Allow scripting of Internet Explorer WebBrowser control" in both zones. Zone 1 is set as a belt-and-suspenders fix alongside the ZoneMap change; Zone 3 is set as a fallback in case any other content still resolves there.

### 6. Enable Active Scripting in Zone 3

```
HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\3
  "1400" = DWORD 0   (0 = Enable)
```

`1400` = Active Scripting (JavaScript execution). On Windows Server's default Zone 3, this can be disabled or set to Prompt. Setting it to `0` (Enable) ensures JavaScript runs unconditionally for any content that does land in Zone 3.

---

## Why These Are Per-User (HKCU), Not System-Wide (HKLM)

All fixes were applied to `HKEY_CURRENT_USER` rather than `HKEY_LOCAL_MACHINE`. This is intentional:

- `HKCU` changes are scoped to the logged-in user and take effect immediately without a reboot
- `HKLM` changes require administrator elevation and affect all users
- IE's FeatureControl and Zone settings in `HKCU` take precedence over `HKLM` defaults for the current user, so this is the correct and minimal-impact approach
- Group Policy (`HKLM\Software\Policies\...`) overrides both — a verification step confirmed no policy overrides were present on this VM

---

## How to Reproduce the Fix

Run the following PowerShell block **as the user who will be running Cold Turkey** (elevation is not required):

```powershell
# 1. Force IE11 mode for Cold Turkey's embedded browser
New-Item -Path "HKCU:\SOFTWARE\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_BROWSER_EMULATION" -Force -ErrorAction SilentlyContinue
New-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_BROWSER_EMULATION" -Name "Cold Turkey Blocker.exe" -Value 0x2AF8 -PropertyType DWord -Force

# 2. Disable Local Machine Zone lockdown for Cold Turkey
New-Item -Path "HKCU:\SOFTWARE\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_LOCALMACHINE_LOCKDOWN" -Force -ErrorAction SilentlyContinue
New-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_LOCALMACHINE_LOCKDOWN" -Name "Cold Turkey Blocker.exe" -Value 0 -PropertyType DWord -Force

# 3. Allow local machine zone scripts for Cold Turkey
New-Item -Path "HKCU:\SOFTWARE\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_BLOCK_LMZ_SCRIPT" -Force -ErrorAction SilentlyContinue
New-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_BLOCK_LMZ_SCRIPT" -Name "Cold Turkey Blocker.exe" -Value 0 -PropertyType DWord -Force

# 4. Map localhost to Local Intranet Zone (Zone 1)
New-Item -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\localhost" -Force -ErrorAction SilentlyContinue
New-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\localhost" -Name "http" -Value 1 -PropertyType DWord -Force

# 5. Enable WebBrowser control scripting in Zones 1 and 3
New-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\1" -Name "1206" -Value 0 -PropertyType DWord -Force
New-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\3" -Name "1206" -Value 0 -PropertyType DWord -Force

# 6. Enable Active Scripting in Zone 3
New-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\3" -Name "1400" -Value 0 -PropertyType DWord -Force
```

After running, **fully close and reopen Cold Turkey** (including from the system tray). The IE WebBrowser control only reads registry values on process start.

---

## Verification

To confirm the fix applied correctly:

```powershell
# Check browser emulation (should be 11000)
Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_BROWSER_EMULATION" | Select-Object "Cold Turkey Blocker.exe"

# Check localhost zone mapping (should be 1)
Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMap\Domains\localhost" | Select-Object http

# Check zone 3 settings (both should be 0)
(Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\3").1206
(Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\3").1400

# Check for Group Policy overrides (should return no output or "no match")
reg query "HKLM\Software\Policies\Microsoft\Windows\CurrentVersion\Internet Settings\Zones\3" /v 1206 2>$null
```

---

## Environments Affected

This fix is required when running CTBL++ on:

- Windows Server 2019 / 2022 (any edition)
- Amazon EC2 Windows instances
- Azure Windows VMs
- Any non-domain-joined Windows Server where `localhost` is not automatically assigned to the Local Intranet zone

It is generally **not** needed on:

- Windows 10 / 11 desktop machines
- Domain-joined servers (the domain controller typically pushes Zone settings that include localhost in the intranet zone)

---

## Root Cause Chain

```
Amazon EC2 Windows Server 2022
  └── localhost → Internet Zone (Zone 3)          [not domain-joined]
        └── Zone 3 setting 1206 disabled           [Server default]
              └── window.external not scriptable
                    └── SendSettings() throws TypeError
                          └── document.ready crashes at line 123
                                └── opacity flip never reached
                                      └── Gray screen
```
