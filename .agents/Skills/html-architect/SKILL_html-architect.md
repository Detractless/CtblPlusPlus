---
name: html-architect
description: Decides where code belongs and why. Use when creating new files, folders, or modules. Use when something feels like it's in the wrong place. Use when a codebase is growing and structure is starting to drift. Use when a new developer needs to understand how the project is organized. Use when auditing structural health of an existing project.
---

# HTML Architect

## This Skill is a Dispatcher

This skill does not work alone. It routes to phase files that do the actual work. Do not apply structural principles from memory — load the phase file, follow its process. The methodology lives in `reference.md`, not here.

## Observation Only — Do Not Modify

This skill reports findings. It does not fix them. Do not rename files, move files, edit imports, split modules, create folders, or make any filesystem change as a result of running this skill. The output is a report for the user to review and act on.

The `fix` field in each finding is a recommendation, not an instruction. The `related_actions` in placement recommendations are suggestions, not tasks. The "Top Priority" line in the verdict is a signpost, not a work order.

```
AFTER THE VERDICT IS DELIVERED:
→ Present the report
→ Ask the user which findings (if any) they want to act on
→ Do NOT begin fixing anything until the user explicitly requests it
```

## Commands

Identify which command matches the user's request. If unclear, ask.

```
COMMAND TABLE:
  "audit <dir>"              → Full Audit     (Auto → Part-Auto → Direct → Verdict)
  "review <dir>"             → Full Audit     (alias)
  "place <file description>" → Placement      (Direct phase only)
  "check <dir>"              → Quick Check    (Auto phase only, all scripts)
  "check imports <dir>"      → Targeted Check (Auto phase, imports script only)
  "check naming <dir>"       → Targeted Check (Auto phase, naming script only)
  "check duplicates <dir>"   → Targeted Check (Auto phase, duplicates script only)
  "check structure <dir>"    → Targeted Check (Auto phase, structure script only)
```

**Intent matching — the user won't type these exactly.** Map natural language to the closest command:

```
"Where should I put this file?"           → place
"Review my project structure"             → audit
"Is my codebase organized correctly?"     → audit
"Are my imports clean?"                   → check imports
"Run a quick structural check"            → check
"What's wrong with my folder structure?"  → audit
"I just finished a sprint, check things"  → audit
"Help me split this large file"           → place (output is placement recommendation)
```

## Routing

Once the command is identified, load ONLY the files needed. Do not load everything.

### Full Audit

```
LOAD ORDER:
1. Read auto.md → run the scripts it specifies → collect findings
2. Read part-auto.md → pass Auto findings → verify and extend
3. Read direct.md → pass confirmed findings → semantic checks
   (direct.md will load reference.md itself when needed)
4. Return here → assemble verdict using the rules below
```

### Placement

```
LOAD ORDER:
1. Read direct.md → it handles placement decisions
   (direct.md will load reference.md itself for the Five Principles)
2. No verdict assembly — Direct outputs a placement recommendation
```

### Quick Check (all scripts)

```
LOAD ORDER:
1. Read auto.md → run all scripts → collect findings
2. Return here → assemble verdict using the rules below
3. Do NOT load Part-Auto or Direct — this is a fast pass
```

### Targeted Check (specific script)

```
LOAD ORDER:
1. Read auto.md → run ONLY the named script → collect findings
2. Return here → assemble mini-verdict (counts + any S1/S2 flags)
3. Do NOT load Part-Auto or Direct
```

## Severity Tiers

Every finding from every phase is tagged with exactly one severity. These definitions are authoritative — phase files assign severity using these tiers.

| Tier | Label | Meaning | Action |
|---|---|---|---|
| S1 | BLOCKING | Causes bugs, breaks testability, creates circular dependencies. Layer inversions, fetch in components, circular imports. | Fix before touching this file again. |
| S2 | HINDERING | Slowing active development. A pattern exists nearby but isn't followed; will compound as files grow. Duplicate constants, scope misplacement, concentrated SRP violations. | Fix before this module expands. |
| S3 | DRIFTING | Not causing pain today. File size creeping up, minor structure shape oddities, borderline placements. Will matter at 2x current scale. | Note it. Revisit when the area grows. |
| S4 | COSMETIC | Naming preferences, missing optional index.js, style nits. Does not affect development velocity or correctness. | Genuinely optional. Don't spend time. |

## Universal Finding Format

Every phase produces findings in this shape. No exceptions.

```
FINDING:
  id:          <phase>-<number>          AUTO-001, PART-003, DIRECT-007
  phase:       auto | part-auto | direct
  severity:    S1-BLOCKING | S2-HINDERING | S3-DRIFTING | S4-COSMETIC
  category:    layer-violation | naming | scope | cohesion | coupling | duplication | sprawl
  file:        <relative path>
  evidence:    <concrete — the import line, the line count, the pattern match>
  explanation: <why this matters in plain language>
  fix:         <specific action, not vague advice>
  confidence:  confirmed | candidate
  effort:      trivial | small | medium | large
```

`confidence`: `confirmed` for binary checks (import direction, naming pattern). `candidate` when a script flagged something that needs AI verification. Direct findings are always `confirmed`.

`effort`: `trivial` (rename/delete, <5 min), `small` (1–2 files, <15 min), `medium` (3–5 files, <60 min), `large` (cross-project import changes, 60+ min).

## Verdict Assembly

After all phases for the current command complete, collapse findings into a verdict.

### Verdict Rules

```
PASS          → Zero S1, zero S2.
PASS W/ NOTES → Zero S1, 1–2 S2 not concentrated in one module.
FIX FIRST     → Zero S1, multiple S2 in the same module.
HOLD          → Any S1.
```

### Verdict Output

```
═══════════════════════════════════════════
 STRUCTURE AUDIT — <target_dir>
 Command: <audit | check | check imports | ...>
 Verdict: <PASS | PASS W/ NOTES | FIX FIRST | HOLD>
═══════════════════════════════════════════

 Checks Run
 ──────────
 Auto:      <N scripts, N clean, N findings>
 Part-Auto: <N confirmed, N dismissed, N new>    (if ran)
 Direct:    <N findings>                          (if ran)

 Scorecard
 ──────────
 Layer Integrity     <✓ | ⚠ | ✗>  <N violations>
 Naming Clarity      <✓ | ⚠ | ✗>  <N violations>
 Scope Discipline    <✓ | ⚠ | ✗>  <N violations>
 File Cohesion       <✓ | ⚠ | ✗>  <N violations>
 Coupling            <✓ | ⚠ | ✗>  <N violations>
 Duplication         <✓ | ⚠ | ✗>  <N violations>

 Findings (by severity, then effort)
 ────────────────────────────────────
 [S1-BLOCKING] <id> <file> — <explanation>
   Evidence: <evidence>
   Fix: <fix>  |  Effort: <effort>

 [S2-HINDERING] <id> <file> — <explanation>
   Evidence: <evidence>
   Fix: <fix>  |  Effort: <effort>

 ...

 Dismissed (Auto flags cleared by Part-Auto)
 ────────────────────────────────────────────
 <id> <file> — <reason for dismissal>

 Top Priority
 ─────────────
 <single most impactful fix with estimated time>

═══════════════════════════════════════════
```

For Quick Check and Targeted Check, use a shorter version — skip the Part-Auto/Direct rows and the Dismissed section.

**After presenting the verdict, stop.** Ask the user what they want to address. Do not begin making changes.
