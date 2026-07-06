# Security Review Findings

I've traced the core flows end to end. Here is what the prior reviews missed.

## TL;DR

The single most important gap: the two files that authorize an unlock — the HMAC key system.key and the queue database ctblplusplus.db — sit in a directory that nothing in the anti-tamper layer protects, and the queue's own migration code will mint a valid signature over an attacker-supplied row. The result is that the queue's HMAC integrity — the mechanism the whole product rests on — is defeatable by the admin user the product exists to resist, with no clock tampering and no lockdown. Everything else below is secondary to that.

## Severity ranking (new findings only):

- A — Queue integrity is bypassable three independent ways (Critical, high confidence)
- B — App Control allow/disable bypasses the delay entirely and is unauthenticated (Critical, high confidence)
- C — Asymmetric trust boundary: signed pipe vs. wide-open HTTP control plane (High, high confidence)
- D — AppControlEnabled has two writers that fight every 45 s (High, medium confidence on impact)
- E — the native/custom block-type boundary is a UI-only abstraction (High, architectural)
- F — the vanilla pain is one specific bug class: clock-driven full re-render (Medium, with a non-framework fix)
- G — what's missing (key/DB ACLs, API auth, served-UI integrity, offline lockdown recovery)
- Two secondary latent bugs (fail-open HMAC default; schedule→continuous silent unlock)

## 1 & 4. Latent bugs and process-boundary design (Findings A, B, C, D)

### A. The queue's HMAC integrity is defeatable three ways — none in the Known Issues

The queue HMAC is the last line of defense: the design intent is "even if someone writes to the DB, they can't forge a valid unlock without the key." That intent fails on three counts that compound.

**A1 — The key and the queue DB live in an un-hardened directory.** system.key (DpapiHmacProvider.cs:17-22) and ctblplusplus.db (SqliteBaseRepository.cs:13-18) both sit in %ProgramData%\CtblPlusPlus\. The two ACL enforcers only ever harden installDir and the vault subfolder — never this root:

- PersistenceEnforcer.cs:72-88 hardens installDir, vault, and %ProgramData%\Cold Turkey (delete-guard only).
- VaultAclEnforcementService.cs:51-64 hardens installDir and vault.

Default %ProgramData% inheritance gives Users read on both files and Administrators full control. So an admin can write ctblplusplus.db directly.

**A2 — The key is recoverable even by a non-admin.** It's DPAPI LocalMachine scope (DpapiHmacProvider.cs:53,79). LocalMachine means any local process that can read the file can Unprotect it with no elevation. And HardenVault/DenyAdminWrite only deny write, never read (AclHelper.cs:27-111) — confidentiality of the key is enforced nowhere. So the key that signs both the queue and the watchdog pipe is readable by the adversary. (This is distinct from Known CC-15, which frames it as DPAPI-scope breadth and "admin only"; the actionable point is the missing file ACL, and the reach is any user, not just admin.)

**A3 — BackfillKinds is a signing oracle.** This is the sharpest one. CtblPlusPlus.Infrastructure/Persistence/Repositories/SqliteQueueRepository.cs (lines 33-88) selects every row WHERE Kind = '' OR Kind IS NULL, reclassifies it, and re-signs with a fresh V2 signature — without ever reading or verifying the row's existing signature (it doesn't even SELECT Signature). Execution path:

1. Adversary (admin, via A1) INSERTs a row: Kind='', Status='Pending', UnlockAt=\<past\>, BlockName='\<a real locked block\>', TargetUrl='CTBL_QUEUED_DELAY', Signature='anything'.
2. Engine restarts (frequent, given watchdog resurrection). Repo constructor runs BackfillKinds() → Classify() → ComputeHmac(BuildV2(row)) → UPDATE … SET Signature=…. The forged row now carries a valid signature.
3. MigrateSignaturesToV2() sees Signature == v2 → continue (line 137).
4. CtblPlusPlus.Application/Queue/QueueDispatcher.cs line 96: VerifyHmac passes → QueuedDelayQueueHandler unlocks the block.

The delay is bypassed with no key needed. The re-signing is load-bearing (it's what lets MigrateSignaturesToV2 skip the row), so it can't simply be deleted.

**Cost:** the queue's tamper resistance — the core feature — is void. Smallest fixes: (1) ACL the %ProgramData%\CtblPlusPlus root to SYSTEM-only (reuse HardenVault, but add a read deny for Admin/Users on system.key, or switch to CurrentUser DPAPI under the service identity) — this covers the key, the DB, and Anti-TM.txt at once; (2) in BackfillKinds, SELECT Signature, verify it against the legacy formula (BuildV1 with empty Kind) before re-signing, and set FailedSecurityViolation on mismatch. Confidence: high on all three code facts; the exploit assumes DB write, which is the realistic threat model for a self-binding tool whose user has admin.

---

### B. App Control allow/disable bypasses the delay and is unauthenticated

Every website/block-config/schedule/global-delay mutation is delay-gated server-side (UnlockAt computed from GlobalDelayHours in QueuedDelayService — correctly, the client can't backdate it). App Control is the exception. Path:

CtblApiClient.js allowApp/disableAppControl → GET /api/app-control?action=allow|disable → AppControlHandler.cs:47-62 → CtblPlusPlus.Application/AppControl/AppControlQueueHandler.cs (line 39: sets Allowed + RemoveApps immediately) / HandleDisable (line 124: AppControlEnabled=false + resets every blocked app). No delay, no lock check, no auth.

The tell that this is an oversight rather than intent: EnforcerSettingsHandler.cs:70 explicitly refuses to disable an enforcer while any block is locked (IsAnyBlockLocked()). Server-side gating is the established pattern — App Control simply lacks it, and the AppAllow/AppDisableControl kinds already exist in QueueRequestKinds for a delayed path that isn't wired up.

**Cost:** the App Control feature offers zero tamper resistance — GET http://127.0.0.1:58123/api/app-control?action=disable instantly disables it, reachable by any local process or (via CORS * + JSONP GET) any web page. Smallest fix: route allow/disable/bulk-allow through the delay queue, or at minimum apply the IsAnyBlockLocked guard. Confidence: high on the immediacy and the absence of auth (grep of the Engine confirms HMAC is used only for the pipe/queue, never the HTTP API).

---

### C. The trust boundary is drawn in the wrong place

The Engine has two control planes over the same enforcement state, with opposite trust assumptions:

- **Pipe (CtblPlusPlusPidBroker):** every message HMAC-signed and verified (PidBroker.cs:112, WatchdogHeartbeat.cs:68).
- **HTTP API (port 58123):** no signature, no token, nothing.

Fixing CORS/JSONP (Known CC-01) closes the browser vector but not a local non-browser process, which retains full unauthenticated access to enqueue, cancel, and (per B) instantly disable. And because of A2, the pipe's HMAC is itself forgeable by any local process that reads the key — so the real boundary the system enforces is "any local process," for both planes, not "signed callers." The pipe also trusts the PID inside REGISTER_WATCHDOG (PidBroker.cs:118-138) without verifying the sender is that binary, so a key-holding local process can register a bogus PID or spoof HEARTBEAT|Wd1 to suppress resurrection. Fix: once the key is protected (A), sign API mutations with it, or hand a per-boot token to the WebView2 host object and require it on mutating routes.

---

### D. AppControlEnabled has two uncoordinated writers

CtblStateEnforcer.cs:55-58 overwrites AppControlEnabled every 45 s from ReadBlockEnabled() (the whitelist block's Enabled flag). But EnsureBlockExists creates that block Enabled="false" (ColdTurkeyInjector.cs:219) and no C# path sets it to "true" (grep-confirmed). Meanwhile the API's HandleEnable writes AppControlEnabled=true directly. So:

1. User enables App Control → setting = true, apps injected.
2. Within 45 s, CtblStateEnforcer reads block.Enabled="false" → sets setting back to false.
3. SyncDetectedApps gate (AppControlStateManager.cs:36) now returns early; GetAppControlData reports enabled:false to a UI that just enabled it.

**Cost:** split-brain enable state; App Control silently self-disables unless the whitelist block is turned on through some other path. Fix: one source of truth — either have "enable" actually StartBlock the whitelist block and derive the setting solely from the block flag, or stop the enforcer clobbering an explicit enable. Confidence: high on the two-writer clobber; medium on end-user impact (a frontend block-enable path I did not fully trace could set Enabled via save()).

---

## 2. Architectural debt — the implicit assumptions that will bite

- **The anti-tamper layer assumes the binaries are the asset; the authorizing data is the asset.** The whole ACL/vault apparatus protects executables and provides binary recovery, but leaves the key, the queue DB, and the time high-water-mark (Anti-TM.txt, TimeEnforcer.cs:42, unsigned plaintext ticks in the same un-hardened root) writable by the adversary. This assumption is baked into two independent services and will silently constrain any future hardening that keeps following the "protect the install dir + vault" template.

- **Enforcement correctness is split across C# and JS with no shared contract.** EnforcerSettingsHandler.IsAnyBlockLocked() (C#, lines 81-174) re-implements the same lock-state machine that blockStateCalculator.js computes in the UI — parsing the same lock/autostart/timer date formats by hand. These must stay bit-identical or the server guard and the UI disagree about whether a block is locked. That's a permanent two-language coupling with no test tying them together.

- **Kind-string routing is a closed enum masquerading as extensibility.** Every dispatch decision keys off hardcoded QueueRequestKinds constants and TargetUrl prefix-matching (QueueRequestKinds.Classify). Adding a request type is a coordinated edit across Classify, a new handler, the sentinel/prefix constants, and the JS side — the registry pattern that exists in the UI (below) has no backend counterpart.

---

## 3. The vanilla HTML question

Vanilla is serving the project well in two places: the C#↔JS bridge (Object.defineProperty(window,'settings', …) at app.js:48 is a clean, debuggable seam) and the lock-type registry, which proves vanilla can express a plugin pattern without a framework. Don't touch those.

The cost is concentrated in one specific, recurring bug class: renders are triggered by the clock, not by state change, and there is no dirty-check between them. pollingService.js fires every second and calls updateBlocks/updateSettings, each of which does a full .empty()+rebuild or full event-rebind. Three independent instances of the same root cause are already in the code:

1. refreshQueuedDelayState (app.js:70-85) renders twice from two async callbacks that don't coordinate.
2. Every 1 s, any focus / open dropdown / scroll position inside a block card is destroyed.
3. ForceSettingsUpdate (app.js:87-95) replaces the entire settings object and re-renders three pages — a C# push arriving mid-edit clobbers unsaved UI state, because there's no reconciliation between "what C# thinks" and "what the user is typing."

That's a demonstrable recurring class, which is the bar you set. The fix is not a framework — it's two small vanilla patterns: (a) a dirty-key / render-on-change guard — compute a cheap signature of render-relevant state, store the last-rendered signature, skip the DOM rebuild when unchanged (generalize what FE-18 suggests for blocks to updateSettings/updateOverview too); and (b) a single mutation seam — route state changes through AppState setters that bump a version counter, and have the poll compare versions instead of blindly rebuilding. ~30-40 lines total, and it removes all three symptoms without abandoning vanilla. Keep vanilla; add the change-detection layer it's missing.

---

## 5. Block-type extensibility — abstraction or naming convention?

It's a genuine abstraction in the UI, a naming convention at the config boundary, and a hardcoded switch at enforcement — three layers, no shared contract.

- **UI layer (real):** registry.js + the 13-method descriptor in queuedDelay.js:291-307 is a legitimate self-registering plugin — but it covers only display and editing.
- **Config layer (convention):** at the Cold Turkey DB level a "Queued Delay" block is byte-identical to a password block with password="CTBL_QUEUED_DELAY". Its identity isn't in the config; matches() also requires AppState.configuredQueuedDelays (in-memory). The CtblBlock.Extension field — already defined and serialized — is the natural home for the type id but is written by nothing.
- **Enforcement layer (hardcoded):** at runtime, activation routes on request.Kind == QueueRequestKinds.QueuedDelayUnlock and a literal sentinel (QueuedDelayQueueHandler.cs:22,33). There is no C#-side registry or descriptor.

**Where the schema breaks for new types:** the sentinel scheme requires the host lock to be password and claims one sentinel on the shared password field. So (a) any extension type that must layer on a non-password lock has nowhere to store its identity, and (b) the discriminator collides with a real user password. It scales to N distinct blocks but not to N behaviors, and not at all onto non-password hosts.

**Can it evolve to a self-registering plugin model without a rewrite?** Yes — the config is already forward-compatible ([JsonExtensionData] on CtblRoot/CtblBlock/CtblAdditional preserves unknown fields across the read-modify-write, so new fields survive). The minimum structural change is three additive steps: (1) write the type id into CtblBlock.Extension on save (onSave already runs — queuedDelay.js:279-285); (2) make both Classify (C#) and matches (JS) read Extension first, sentinel as fallback; (3) introduce a C# IExtensionLockType registry mirroring the JS descriptor, injected into the dispatcher so routing / host-config / unlock become descriptor-driven. The backend descriptor layer is the missing half; nothing needs to be torn down to add it.

---

## 6. What is missing entirely

1. **ACLs on the two files that authorize unlocks (Finding A)** — the single biggest absent protection.
2. **Authentication on the control API (Finding C)** — the pipe has it; the HTTP plane governing the same state does not.
3. **Integrity verification of the served WebUI files.** LocalWebServerService serves from C:\Program Files\Cold Turkey\web (LocalWebServerService.cs:32), which none of the enforcers write-protect (they cover CTBL++'s own install dir and %ProgramData%\Cold Turkey, not Program Files\Cold Turkey\web). Because some flows depend on client-side gating (the API is unauthenticated), an admin editing the served JS silently subverts the UI barrier, and no manifest/hash covers the web root.
4. **An offline recovery path for a false-positive lockdown.** TimeEnforcer.TriggerLockdown clears only on a successful internet sync (TimeEnforcer.cs:153-158); the offline-unclean-shutdown path (lines 83-88) can trip it, and a permanently firewalled machine is then unrecoverable through the app. There is no manual override / fail-open safety valve for a tool that can lock a user out of their own machine.

---

## Secondary latent bugs (high confidence on the code, lower blast radius)

- **Fail-open HMAC default.** ComputeHmac returns "" when the key isn't loaded (line 90). PidBroker.cs:112 does ComputeHmac(payload) != providedSig → an attacker sending providedSig="" while the key is empty makes "" != "" false → accepted. The empty-key state is reachable via the mutex-timeout fall-through (Known CS-05); the fail-open comparison is the new point. Fix: throw (or return a never-matching sentinel) when _hmacKey is empty rather than "".

- **Schedule→continuous silently clears a schedule lock.** ScheduleChangeQueueHandler.cs:87-93: switching a block to continuous sets block.Lock = "none" if it was a schedule lock. It's delay-gated so not a straight bypass, but it means a schedule-locked block can be reduced to lockless via a single queued type change — worth documenting as an intentional-but-surprising side effect.
