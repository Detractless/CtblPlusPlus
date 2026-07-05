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
Triggered when the user provides a diff, two commits, or two versions of a codebase to compare.

- Identify what structurally or behaviorally changed — not just which files changed
- Infer the *intent* behind each change, not just its mechanics
- Skip pure noise: whitespace-only diffs, comment rewrites, variable renames with no behavioral effect

### Mode B — Session Reconstruction
Triggered when the user asks for a changelog from the current conversation.

- Scan the session for: decisions made, problems solved, features added, bugs fixed, and behavior that changed
- Treat this as ephemeral: open with a clear prompt to capture notes now, since session context is gone once the conversation closes
- If session coverage is thin (the user jumped around, skipped details, or left large gaps), flag that **before** generating and ask what to fill in

---

## Step 2: Classify and Consolidate Changes

Before writing a single bullet, map every change to one of the five sections below. Then consolidate: related changes that serve one user-facing outcome become **one bullet**, not three.

| Section | What belongs here |
|---|---|
| `### Added` | New features, new capabilities, new configuration options |
| `### Fixed` | Bugs, crashes, incorrect behavior, edge cases |
| `### Changed` | Modified behavior, restructured logic, renamed public-facing things |
| `### Removed` | Deleted features, deprecated items, removed configuration |
| `### Internal` | Refactors, cleanup, dependency bumps with no user-facing effect — keep minimal or omit |

If a change cannot be clearly categorized, default to `### Changed`.

---

## Step 3: Write the Bullets

### Audience
A developer reading the changelog on GitHub who did not write the code. They care about: what broke and is now fixed, what is new and usable, what changed in behavior, and what was removed. They do not care which file changed.

### Per-Bullet Rules

- **Max 2 sentences per bullet**
- **Lead with the user-facing effect** — not the implementation change
  - Wrong: "Refactored `parser.js` to use a regex-based split."
  - Right: "Fixed an edge case where pasted URLs with trailing slashes caused a lookup failure."
- **No file paths** unless absolutely necessary for clarity; if included, use the shortest unambiguous form (`utils/parser.js` not `/src/core/utils/parser.js`)
- **No unexplained acronyms or library-internal terms** — add a brief plain-language parenthetical if needed
- **Plain, active voice**: "Fixed X" not "A fix was applied to X"

### Jargon Calibration

If a technical term has a plain equivalent that loses no precision, use the plain one. If the technical term is genuinely clearer (e.g., "debounce" vs. "delay repeated calls"), keep it.

---

## Step 4: Assemble the File

### File naming
```
CHANGELOG-YYYY-MM-DD-HHMM.md
```
Example: `CHANGELOG-2025-07-05-1430.md`

Use the date and time from system context. Do not ask the user for this unless the context is missing it.

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

### Section ordering
Include only sections that have at least one bullet. Preferred order: `Added` → `Fixed` → `Changed` → `Removed` → `Internal`.

### Full template
```markdown
# Changelog

**Date:** YYYY-MM-DD
**Time:** HH:MM (24h)
**Version / Release tag:** vX.Y.Z

### Added
- ...

### Fixed
- ...

### Changed
- ...

### Removed
- ...

### Internal
- ...
```

---

## Guardrails

- If the diff or session is too sparse to produce a meaningful changelog, say so and ask for more context rather than padding bullets
- Do not include a bullet for every changed file — consolidate related changes into one entry
- Keep total length concise enough to read in under 2 minutes
- Never invent changes that are not clearly evidenced in the diff or session
- For Mode B: always open with a short note that session context is ephemeral and the user should save the file immediately
