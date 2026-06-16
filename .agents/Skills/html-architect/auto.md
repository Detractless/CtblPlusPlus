# Auto Phase

## Purpose

Run deterministic scripts against the codebase. No AI judgment happens in this phase — only pattern matching. If a script can answer the question with a boolean, it belongs here. If the answer requires reading the code and thinking about what it means, it belongs in Part-Auto or Direct.

## When This Phase Runs

```
TRIGGER:
→ Full Audit       — always runs first
→ Targeted Audit   — runs if the ask maps to a scriptable check
→ Placement Mode   — does NOT run (Direct handles placement)
```

## Input

```
AUTO PHASE INPUT:
  target_dir:  <path to the directory being audited>
  checks:      all | [list of specific check names]
```

If `checks` is `all`, run every script. If it's a list (e.g., `[imports, naming]`), run only those. Match check names to scripts using the table below.

## The Scripts

Each script checks exactly one thing. Run them with `node <script> <target_dir>`. Every script outputs JSON findings in the Universal Finding Format defined in SKILL_html-architect.md.

### audit-imports.js

**Check name:** `imports`

Parses every `.js`, `.mjs`, and `.ts` file for `import ... from '...'` and `require('...')` statements. Builds an import graph. Flags any edge that violates the layer hierarchy.

```
WHAT IT CATCHES:
→ Any file in utils/, services/, constants/ importing from components/ or pages/
→ Any file in components/ importing from pages/
→ Any component importing from a sibling component's folder
→ Circular import chains (A→B→A or longer cycles)

WHAT IT IGNORES:
→ Imports from node_modules or external packages
→ Imports from the same folder (co-located files are allowed)
→ CSS/asset imports (not layer-bound)

DEFAULT SEVERITY: S1-BLOCKING
  Layer inversions are always blocking. They create untestable, circular
  dependency nightmares at scale. There is no "minor" layer violation.
```

A layer violation found by this script is `confirmed` — the import either goes upward or it doesn't. No AI verification needed.

### check-naming.js

**Check name:** `naming`

Scans the directory tree for file and folder names that violate naming conventions. Does not read file contents — names alone are the signal.

```
WHAT IT CATCHES:
→ Files named utils.js, helpers.js, misc.js, common.js, shared.js, index.js at project root
→ Folders named new/, old/, temp/, backup/, test/ (at any level)
→ Component files not in PascalCase (inside components/ folders)
→ CSS files that don't match their sibling JS file's name
→ Service/utility files not in camelCase

WHAT IT IGNORES:
→ Files outside src/ (config files, dotfiles, READMEs)
→ node_modules/, .git/, dist/, build/
→ index.js inside component folders (this is the re-export pattern — correct)

DEFAULT SEVERITY: S4-COSMETIC
  A bad name does not break anything. It makes the codebase harder to navigate,
  but it is not blocking, hindering, or drifting. Fix it when you're already
  touching the file — don't make a separate trip.
```

Exception: junk-drawer names (`utils.js`, `helpers.js`) are upgraded to S3-DRIFTING. They aren't blocking today, but they attract unrelated code over time and become structural debt.

### check-file-size.js

**Check name:** `filesize`

Counts lines in every `.js`, `.ts`, `.jsx`, `.tsx` file. Reports files that exceed thresholds.

```
WHAT IT CATCHES:
→ Component files exceeding 150 lines (soft flag)
→ Any file exceeding 300 lines (hard flag)
→ Any file exceeding 500 lines (critical flag)

WHAT IT DOES NOT DETERMINE:
→ Whether a large file is cohesive or doing multiple jobs
  That is Part-Auto's job. This script only measures size.

DEFAULT SEVERITY:
  150–299 lines → S3-DRIFTING (size creeping up, not yet a problem)
  300–499 lines → S3-DRIFTING (flag for Part-Auto SRP verification)
  500+ lines    → S2-HINDERING (almost certainly doing too much)

CONFIDENCE: candidate (for 150–499 range — Part-Auto confirms or dismisses)
            confirmed (for 500+ — a file this large is always worth splitting)
```

Size alone is a signal, not a verdict. A 200-line utility that does one complex thing is fine. A 200-line component that renders, fetches, and transforms data is three files pretending to be one. The script flags; Part-Auto judges.

### check-fetch-in-components.js

**Check name:** `fetch-in-components`

Scans files inside `components/` directories for patterns that indicate direct API interaction.

```
WHAT IT CATCHES:
→ fetch(
→ axios. or axios(
→ XMLHttpRequest
→ $.ajax or $.get or $.post
→ new WebSocket(
→ navigator.sendBeacon(

WHAT IT IGNORES:
→ These patterns inside services/, utils/, or store/ (correct placement)
→ Comments containing these patterns
→ String literals containing these patterns

DEFAULT SEVERITY: S1-BLOCKING
  API calls in components are layer violations. The component is reaching
  down through its own layer into the service layer's territory. Extract
  the call into a service file and have the component call that instead.
```

### check-duplicate-constants.js

**Check name:** `duplicates`

Finds constant values and exported names that appear in multiple files.

```
WHAT IT CATCHES:
→ Identical string literals assigned to const/let/var in 2+ files
→ Identical exported constant names across files
→ Identical URL strings, API paths, or config values across files

WHAT IT IGNORES:
→ Common strings: '', "", "none", "default", "true", "false", numbers 0-10
→ Import paths (these are references, not duplicated values)
→ Test files (duplication in tests is acceptable)
→ Strings under 4 characters (too many false positives)

DEFAULT SEVERITY: S2-HINDERING
  Duplicate constants cause inconsistency. When one copy gets updated
  and the other doesn't, behavior diverges silently. This actively
  slows development because developers don't know which copy is canonical.

CONFIDENCE: candidate
  Two files might contain "submit" for completely different reasons —
  a button label vs. an API action name. Part-Auto reads the context
  and confirms or dismisses.
```

### check-structure-shape.js

**Check name:** `structure`

Checks the folder structure itself — not file contents — for patterns that indicate organizational problems.

```
WHAT IT CATCHES:
→ Type-based top-level folders: src/js/, src/css/, src/html/
→ Files at src/ root that belong in a subfolder (orphaned files)
→ Component folders missing co-located CSS (JS file exists, no matching CSS)
→ Empty folders (structural ghosts)
→ Deeply nested folders beyond 4 levels inside src/

WHAT IT IGNORES:
→ Config files at project root (expected: package.json, .eslintrc, etc.)
→ Folders with only one file (small project, not yet worth splitting)
→ assets/ folder structure (no conventions enforced there)

DEFAULT SEVERITY: S3-DRIFTING
  Structure shape issues compound slowly. A type-based folder today
  works fine with 5 files. At 50 files it becomes a navigation nightmare.
  Flag it, don't block on it.

EXCEPTION: Type-based top-level folders (src/js/, src/css/) are S2-HINDERING
  if the project has more than 15 files. At that point the organizational
  cost is already being paid.
```

## Running the Scripts

```
EXECUTION ORDER:
1. audit-imports.js    — most critical, run first
2. check-fetch-in-components.js — also S1, fast check
3. check-naming.js     — fast, broad coverage
4. check-file-size.js  — fast, feeds Part-Auto
5. check-duplicate-constants.js — slower, string comparison across files
6. check-structure-shape.js — directory-level, run last

Each script: node scripts/<script-name>.js <target_dir>
All scripts: node scripts/run-audit.js <target_dir>
```

The runner (`run-audit.js`) executes all scripts in order and combines their output into a single findings list and summary.

## Output

```
AUTO PHASE OUTPUT:
  findings: [
    {
      id: "AUTO-001",
      phase: "auto",
      severity: "S1-BLOCKING",
      category: "layer-violation",
      file: "src/utils/formatUser.js",
      evidence: "Line 3: import { UserCard } from '../components/UserCard'",
      explanation: "Utility file imports from component layer — lower layer reaching up",
      fix: "Move the shared logic into a new utility that both files can import",
      confidence: "confirmed",
      effort: "small"
    },
    ...
  ]
  summary: {
    total: <count>,
    by_severity: { S1: <n>, S2: <n>, S3: <n>, S4: <n> },
    scripts_run: ["audit-imports", "check-naming", ...],
    scripts_clean: ["check-fetch-in-components"],
    errors: []
  }
```

This phase produces data for the pipeline. Do not act on findings — pass them forward or return them to SKILL_html-architect.md for verdict assembly.

## Handoff to Part-Auto

Auto passes its complete output — findings list and summary — directly to Part-Auto. Part-Auto receives everything, including confirmed findings (it won't re-verify those, but it needs them for context).

```
HANDOFF RULE:
→ If Auto found zero issues → Main MAY skip Part-Auto and go to Direct
→ If Auto found only S1-BLOCKING → Part-Auto still runs (it has its own checks)
→ If a script errored → report it in errors[], continue the pipeline
  A failed script is not a finding — it's an operational issue
```

## Red Flags (for this phase)

- A script that takes more than 10 seconds on a project under 500 files — something is wrong
- The same finding reported by two different scripts — deduplicate before passing to Part-Auto
- A script reporting 50+ findings — either the project is deeply misstructured or the script's thresholds need calibration for this project's conventions
- `audit-imports.js` finding zero imports in a project with multiple files — the import pattern may not match (check for `<script>` tag loading instead of ES modules)

## Verification

After Auto completes:

- [ ] Every script either produced findings or reported clean
- [ ] No script errored silently (check the errors array)
- [ ] Findings are deduplicated (no two findings for the same file + same category)
- [ ] Severity assignments match the defaults defined above
- [ ] `candidate` confidence is only used where specified (file size 150–499, duplicates)
- [ ] Output is valid JSON parseable by Part-Auto
