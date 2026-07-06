---
name: github-ready-changelog
description: Produce a polished, human-facing GitHub changelog .md file from either a before/after codebase diff or the current conversation history. Use this skill whenever the user asks for a "changelog", "release notes", "what changed", "summarize this diff", or says anything like "write up what we did this session" or "generate a changelog from our conversation." Trigger even for vague requests like "log these changes" or "what should I put in CHANGELOG.md." Always use this skill before writing any changelog content.
---

# GitHub-Ready Changelog

Produce a release-level changelog `.md` file that a developer on GitHub can read in under 2 minutes and immediately understand what changed, what broke, and what is new — without having read any of the code.

---

## Step 1: Mode Selection

Choose a mode automatically based on available context. If both are available, use **Mode B** as the primary source and **Mode A** to fill gaps.

### Mode A — Codebase Diff Analysis
Triggered when the user provides a diff, two commits, or two versions of a codebase to compare. **Follow the full analysis pipeline in Step 2 before writing anything.**

### Mode B — Session Reconstruction
Triggered when the user asks for a changelog from the current conversation.

- Scan the session for: decisions made, problems solved, features added, bugs fixed, and behavior that changed
- Treat this as ephemeral: open with a clear prompt to capture notes now, since session context is gone once the conversation closes
- If session coverage is thin (the user jumped around, skipped details, or left large gaps), flag that **before** generating and ask what to fill in
- Skip to Step 3 (Classify) — the analysis pipeline below applies to Mode A only

---

## Step 2: Mode A Analysis Pipeline (mandatory, in order)

Never write changelog content directly from raw impressions of the two codebases. Work through these phases and produce a findings list first.

### Phase A0 — Mechanical diff (tool-driven, not eyeballs)

Use a diff tool to establish ground truth. `git diff --no-index` works on any two folders — no git repo required:

```
git diff --no-index -M --name-status <old> <new>    # authoritative changed-file list, with rename detection
git diff --no-index --stat <old> <new>              # magnitude of change per file
git diff --no-index <old>/<file> <new>/<file>       # exact hunks for one file
```

Rules:
- The `--name-status` output is the **single source of truth** for which files changed. Never conclude a file is changed or unchanged by reading it — only the tool decides. AI reading is reserved for interpreting *why* a hunk changed.
- Always pass `-M` so renames are detected mechanically instead of appearing as unrelated delete+add pairs.
- Filter vendored/generated noise from analysis (`node_modules`, `bin`, `obj`, lockfiles, minified bundles, `.map` files) — but note its presence; a dependency refresh may still deserve one Internal line.
- If the tree contains duplicated source (e.g., a `Raw/` and a `Bundled/Raw/` copy), analyze one copy and verify the other matches.

### Phase A1 — Read the meta-files first

Before interpreting any source diff, read build scripts, deploy scripts, project files, and READMEs that changed. These explain *workflow* changes that can reframe everything else — e.g., a script that moves files to a private repo means "deleted" files were actually relocated.

### Phase A2 — Interpret hunks, layer by layer

For every changed file in the tool's list, read the **diff hunks** (not the whole file pair) and record: added / removed / behavioral change / cosmetic-only, plus a one-line note of what the change does. For large codebases, divide by module or project and work through systematically — no spot-checking only the files that look interesting.

### Phase A3 — Cross-verify before classifying

- A "removed" file: is it still referenced anywhere (build script, project file, import)? If yes, it **moved** — find where, and never report it as removed.
- A "new" file or export: does existing code already reference it? If yes, this is likely **fixing a broken reference** (missing route, unexported function, dead call site), not a new feature.
- Do dependency changes, version strings, or config changes corroborate the code-level story?

### Phase A4 — Determine cause, not just category

For each finding, decide **why** it changed — this determines the section and the wording:

| Evidence | Cause | Section |
|---|---|---|
| Old behavior was broken: crash, error, dead code path, unhandled input | Bug fix | `Fixed` — state what the failure looked like to a user |
| Something was missing that the rest of the code assumed existed (unregistered route, unexported function, absent dependency) | Oversight | `Fixed` — state what failed because of the gap |
| Genuinely new capability with no prior broken reference to it | Intentional feature | `Added` |
| Behavior deliberately altered, renamed, or restructured | Intentional change | `Changed` |

**If the diff alone cannot distinguish a fix from a feature, ask the user before writing. Do not guess.** New code that existing code already calls is a fix; new code nothing referenced before is a feature — when neither pattern is clear, that's a question, not a coin flip.

### Phase A5 — Findings summary first

Compile the verified findings list (what changed, why, cause, section). Write the changelog **from the findings list**, never directly from the raw diff.

---

## Step 3: Classify and Consolidate Changes

Map every finding to one of the five sections below. Then consolidate: related changes that serve one user-facing outcome become **one bullet**, not three.

| Section | What belongs here |
|---|---|
| `### Added` | New features, new capabilities, new configuration options |
| `### Fixed` | Bugs, crashes, incorrect behavior, edge cases, oversights (missing wiring the code assumed existed) |
| `### Changed` | Modified behavior, restructured logic, renamed public-facing things |
| `### Removed` | Deleted features, deprecated items, removed configuration — only after Phase A3 confirms it is truly gone, not moved |
| `### Internal` | Refactors, cleanup, dependency bumps with no user-facing effect — keep minimal or omit |

If a change cannot be clearly categorized, default to `### Changed`.

---

## Step 4: Write the Bullets

### Audience
A developer reading the changelog on GitHub who did not write the code. They care about: what broke and is now fixed, what is new and usable, what changed in behavior, and what was removed. They do not care which file changed.

### Per-Bullet Rules

- **Max 2 sentences per bullet**
- **Lead with the user-facing effect** — not the implementation change
  - Wrong: "Refactored `parser.js` to use a regex-based split."
  - Right: "Fixed an edge case where pasted URLs with trailing slashes caused a lookup failure."
- **`Fixed` bullets must state the symptom**: what a user would have observed before the fix (crash, error message, silent failure, 404, missing UI). A Fixed bullet without a symptom is incomplete.
- **State the cause where it matters**: was it an error, an oversight, or an intentional change? One clause is enough ("was never exported", "route was never registered", "intentional — aligns naming").
- **No file paths** unless absolutely necessary for clarity; if included, use the shortest unambiguous form (`utils/parser.js` not `/src/core/utils/parser.js`)
- **No unexplained acronyms or library-internal terms** — add a brief plain-language parenthetical if needed
- **Plain, active voice**: "Fixed X" not "A fix was applied to X"
- **No em dashes (—) anywhere in the changelog.** They read as AI-generated. Use a period, comma, colon, or parentheses instead. This applies to bullet text, headers, and the file as a whole; do a final search for "—" before delivering.

### Jargon Calibration

If a technical term has a plain equivalent that loses no precision, use the plain one. If the technical term is genuinely clearer (e.g., "debounce" vs. "delay repeated calls"), keep it.

---

## Step 5: Assemble the File

### File naming
```
CHANGELOG-YYYY-MM-DD-HHMM.md
```
Example: `CHANGELOG-2025-07-05-1430.md`

**Get the real timestamp from the system clock by running a shell command** (e.g., `date "+%Y-%m-%d %H:%M"` or PowerShell `Get-Date -Format "yyyy-MM-dd HH:mm"`). Never guess, round, or use a placeholder like 12:00. The conversation context usually contains only the date, not the clock time; the command is the only reliable source. Use the same command output for both the filename and the header.

### File path
```
.agents/docs/changelogs/CHANGELOG-YYYY-MM-DD-HHMM.md
```
Create this directory path if it does not already exist. Never place the file elsewhere unless the user explicitly overrides the path.

### File header
```markdown
# Changelog

**Date:** YYYY-MM-DD
**Time:** HH:MM (24h)
**Version / Release tag:** (ask the user if not provided; omit gracefully if they decline)
```

### Collapsible entries

Each entry is a collapsible block: the one-line headline stays visible and the detail text hides behind a dropdown arrow. GitHub renders this natively with `<details>`/`<summary>`:

```markdown
<details>
<summary><b>Six WebUI functions were referenced but never exported.</b></summary>

`showUpgradeModal`, `startTrial`, and five others were called from the UI but undefined at their call sites, causing JavaScript errors. All are now exported and wired into the global scope.
</details>
```

Rules:
- The `<summary>` line is the headline: one sentence, bold, symptom-or-outcome first. A reader skimming only the closed summaries should still get the full picture of the release.
- The body holds the detail (cause, before/after behavior, affected items) and still obeys the max-2-sentence rule.
- Leave a blank line after `<summary>...</summary>` or GitHub will not render the body as markdown (backticks, links, etc. would appear literally).
- Short `Internal` entries with no extra detail can stay as plain bullets; do not wrap a one-liner in a dropdown.

### Section ordering
Include only sections that have at least one bullet. Preferred order: `Added` → `Fixed` → `Changed` → `Removed` → `Internal`.

### Full template
```markdown
# Changelog

**Date:** YYYY-MM-DD
**Time:** HH:MM (24h)
**Version / Release tag:** vX.Y.Z

### Added

<details>
<summary><b>Headline of the change.</b></summary>

Detail text: cause, before/after behavior, affected items.
</details>

### Fixed

<details>
<summary><b>Headline stating the symptom.</b></summary>

What failed, why, and what happens now.
</details>

### Changed
...

### Removed
...

### Internal
- Plain one-line bullets are fine here.
```

---

## Step 6: De-duplication Pass (mandatory)

After assembling, re-read the full file once, checking specifically for:

- **Same fact in two sections** — if two bullets describe the same underlying change (or one is a consequence of another), merge them or delete the weaker one. `Internal` must never restate anything already covered elsewhere; it exists only for changes with *no* user-facing entry.
- **Shared root cause split across bullets** — several symptoms of one defect (e.g., multiple UI actions broken by the same missing export) become **one bullet** listing all affected items.
- **A consequence stated as a separate change** — e.g., a warning count dropping because of a fix belongs inside the fix's bullet, not as its own line.

---

## Guardrails

- If the diff or session is too sparse to produce a meaningful changelog, say so and ask for more context rather than padding bullets
- Do not include a bullet for every changed file — consolidate related changes into one entry
- Keep total length concise enough to read in under 2 minutes
- Never invent changes that are not clearly evidenced in the diff or session
- Never report a file as removed until Phase A3 has confirmed it isn't referenced by build scripts or moved elsewhere
- When cause (fix vs. feature vs. intentional change) is ambiguous, ask the user — a wrong "why" is worse than a question
- For Mode B: always open with a short note that session context is ephemeral and the user should save the file immediately
