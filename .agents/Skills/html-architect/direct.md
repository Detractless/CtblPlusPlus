# Direct Phase

## Purpose

Catch what scripts cannot see. This phase is pure semantic reasoning — reading code and understanding what it means, not matching patterns. Every check here requires judgment about intent, responsibility, and meaning that no regex or AST walk can provide.

**Before running any check in this phase, load `reference.md`.** The Five Principles, layer hierarchy, and Architecture Process are defined there and are required for placement decisions, portability tests, layer ambiguity resolution, and overlap detection.

If a check can be expressed as "does this pattern appear in this file?" it belongs in Auto. If a check can be expressed as "does this flagged pattern actually mean what it looks like?" it belongs in Part-Auto. Direct handles everything that starts with "what does this code actually do, and is it in the right place?"

## When This Phase Runs

```
TRIGGER:
→ Full Audit       — runs after Part-Auto, always
→ Targeted Audit   — runs if the ask involves placement, overlap, or naming accuracy
→ Placement Mode   — runs as the ONLY phase (this is where placement decisions happen)
```

## Input

### Full Audit Mode

```
DIRECT PHASE INPUT (FULL AUDIT):
  prior_findings:     [verified_findings + new_findings from Part-Auto]
  dismissed_findings: [cleared items — don't re-flag these]
  files_read:         [files Part-Auto already examined — don't re-read]
  target_dir:         <same path>
```

Direct focuses on files that haven't been read yet. The prior findings provide context — if Part-Auto already confirmed that Dashboard.js has SRP issues, Direct doesn't need to independently discover that. But Direct may find additional issues in Dashboard.js that Part-Auto wasn't looking for (e.g., naming misalignment).

### Placement Mode

```
DIRECT PHASE INPUT (PLACEMENT):
  new_file:           <description of the file being placed>
  responsibility:     <what the file does, in one sentence>
  target_dir:         <project root>
```

Placement Mode skips Auto and Part-Auto entirely. Direct reads the project structure and applies the Five Principles from `reference.md` to decide where the new file belongs.

## The Checks

### Portability Test

"Could this file be moved to another project and still work?"

This is the coupling litmus test from Principle 1. A file that can't leave its current project is tangled in dependencies it shouldn't know about.

```
HOW TO CHECK:
1. Read the file's imports — do they reference project-specific paths, globals, or state?
2. Read the file's internal logic — does it assume project-specific conventions?
3. Strip the imports mentally — does the remaining logic make sense on its own?

DECISION RULE:
→ All imports are from standard libraries or well-defined interfaces
  → PASS. File is portable.
→ File imports project-specific config, globals, or app state directly
  → FINDING. The file is coupled to things it shouldn't know about.
→ File's logic assumes a specific data shape that only exists in this project
  → FINDING. The dependency is implicit, which is worse than an explicit import.

SEVERITY: S2-HINDERING
  Coupling to project internals blocks reuse and makes the file
  impossible to test in isolation. It also means moving the file
  during a refactor will break things that aren't obvious from
  the import list.

COMMON TRAPS:
  A utility function that works on "user objects" but assumes users
  always have a .permissions array with a specific shape. The function
  looks generic but is secretly coupled to the project's user model.

  A component that renders correctly but reaches into window.APP_CONFIG
  for a value instead of receiving it as a prop. The global dependency
  is invisible in the import list.
```

### Name-Responsibility Alignment

Does the filename accurately describe what the file actually does?

A file named `authService.js` that also handles user profile updates is lying about its responsibility. The name creates a false expectation that leads developers to put new auth code in this file (correct) and profile code in this file (wrong, but the name didn't warn them).

```
HOW TO CHECK:
1. Read the file
2. Summarize its job in one sentence
3. Compare the summary to the filename
4. If the summary requires "and" or doesn't match the name → finding

DECISION RULE:
→ Name matches the one-sentence summary exactly
  → PASS. Name is accurate.
→ Name is vague but not misleading ("dataService.js" for a file that fetches user data)
  → FINDING. S4-COSMETIC. Suggest a more specific name.
→ Name is actively misleading ("authService.js" that also handles billing)
  → FINDING. S3-DRIFTING. The file will attract wrong code.
    Fix: rename to match actual scope, or split into authService.js and billingService.js.
→ Name is a junk drawer ("utils.js", "helpers.js")
  → Auto should have caught this. If it didn't, flag as S3-DRIFTING with a script_gap note.

THE TEST:
→ If a new developer reads only the filename, will they correctly predict
  what's inside? If they'd be surprised by any of the contents, the name is wrong.
```

### File Overlap Detection

Does this file's job overlap more than 20% with another file's job?

Overlap is how duplication starts. Two files with partially overlapping responsibilities will gradually absorb each other's logic — each picking up the cases the other doesn't handle — until both files do most of the same things and neither can be deleted.

```
HOW TO CHECK:
1. Read the file and identify its responsibilities (list them)
2. For each responsibility, search for other files that handle the same concern
3. If another file covers the same responsibility → measure the overlap

DECISION RULE:
→ No overlap with any existing file
  → PASS.
→ Less than 20% overlap (one shared helper function, one shared constant)
  → PASS. Minor overlap is normal at boundaries.
→ 20–50% overlap
  → FINDING. S2-HINDERING. The files need a clear boundary.
    Fix: identify which file owns the overlapping responsibility and move it there.
→ More than 50% overlap
  → FINDING. S1-BLOCKING. One of these files shouldn't exist.
    Fix: merge into the canonical file and delete the other.

THE TEST:
→ If I deleted this file, how much of its logic would I need to rewrite
  vs. how much already exists elsewhere? If more than 20% already exists
  elsewhere, the file is redundant.

COMMON TRAPS:
  utils/formatDate.js and components/Calendar/dateHelpers.js doing
  the same date formatting with slightly different function names.
  Neither developer knew the other existed.

  services/api.js and services/dataService.js both wrapping fetch()
  with similar error handling and auth header injection. One was written
  when the developer didn't find the other.
```

### Layer Ambiguity Resolution

For files that don't live in a standard folder or whose contents don't clearly map to one layer, Direct assigns the correct layer and recommends placement.

```
HOW TO CHECK:
1. Read the file
2. Match its behavior to the Layer Identification table in `reference.md`
3. If it matches exactly one row → assign that layer
4. If it matches multiple rows → the file has multiple responsibilities (SRP violation)
5. If it matches zero rows → it might be a new category worth documenting

DECISION RULE:
→ File matches one layer and is already in the correct folder
  → PASS.
→ File matches one layer but is in the wrong folder
  → FINDING. Severity depends on distance:
    S3-DRIFTING if it's in a reasonable nearby folder
    S2-HINDERING if it's in a clearly wrong layer (util in components/)
→ File matches multiple layers
  → FINDING. S2-HINDERING. Split before placing.
    Provide specific split recommendation.

THIS IS WHERE AUTO FAILS:
  Auto assigns layers by folder path — if the file is in components/,
  Auto calls it a component. Direct reads the file and discovers it's
  actually a service with a .js extension sitting in the wrong folder.
  The folder lied; the code tells the truth.
```

### Placement Decision (Placement Mode Only)

When the task is placing a new file, Direct applies the full Architecture Process from `reference.md`. This is not an audit finding — it's a recommendation.

```
PLACEMENT PROCESS:
1. Map the existing structure (Step 1 from `reference.md`)
2. Identify the layer for the new file (Step 2)
3. Determine scope — local or shared (Step 3)
4. Propose the filename (Step 4)
5. Run the violation checklist (Step 5)
6. Check for overlap with existing files (Overlap Detection above)

OUTPUT FORMAT:
  PLACEMENT RECOMMENDATION
  ─────────────────────────
  File:      <proposed filename>
  Location:  <proposed path>
  Layer:     <component | page | service | util | constant | style>
  Reasoning: <one paragraph explaining the decision>

  Checked against:
  - [ ] No existing file with overlapping responsibility
  - [ ] Layer is correct for this file's job
  - [ ] Name describes the responsibility
  - [ ] No new coupling introduced
  - [ ] Not a case where existing file should absorb this logic
```

### Script Gap Detection

If Direct discovers something that a script should have caught — a layer violation that `audit-imports.js` missed, a junk-drawer name that `check-naming.js` skipped — flag it as both a finding and a script gap.

```
SCRIPT GAP FORMAT:
  (standard finding fields)
  script_gap: "<script-name> did not catch this pattern. Reason: <why the script missed it>.
               Recommended script update: <what pattern to add>."

PURPOSE:
  Script gaps are feedback that improves Auto over time. If Direct
  keeps catching the same thing, the script needs updating. If it's
  a one-off edge case, document it but don't change the script.
```

## Output

### Full Audit Mode

```
DIRECT PHASE OUTPUT (FULL AUDIT):
  new_findings: [
    {
      id: "DIRECT-001",
      phase: "direct",
      severity: "S2-HINDERING",
      category: "coupling",
      file: "src/utils/userHelpers.js",
      evidence: "Function getUserRole() reads from window.APP_STATE.currentUser — implicit global dependency not visible in imports",
      explanation: "Utility function appears portable but is secretly coupled to app-level global state. Cannot be tested in isolation or moved to another project.",
      fix: "Accept user object as parameter instead of reading from window. Caller passes the dependency explicitly.",
      confidence: "confirmed",
      effort: "small"
    }
  ]
  script_gaps: [
    {
      finding_id: "DIRECT-003",
      script: "check-naming.js",
      reason: "Script checks for utils.js but not utilsV2.js. Versioned junk-drawer names bypass the pattern.",
      recommendation: "Add regex for common junk-drawer names with version suffixes: /^(utils|helpers|misc|common)(V?\d+)?\.js$/"
    }
  ]
  files_read: ["src/utils/userHelpers.js", "src/services/legacyApi.js", ...]
```

### Placement Mode

```
DIRECT PHASE OUTPUT (PLACEMENT):
  placement: {
    file: "formatCurrency.js",
    location: "src/utils/formatCurrency.js",
    layer: "util",
    reasoning: "Pure function that takes a number and locale, returns a formatted string. Zero DOM knowledge, zero network calls. Two existing components (ProductCard, CartSummary) currently inline this logic — extracting to a shared utility eliminates the duplication and places it at the correct layer.",
    checklist: {
      no_overlap: true,
      correct_layer: true,
      descriptive_name: true,
      no_new_coupling: true,
      not_absorbable: true
    }
  }
  related_actions: [
    "Remove inline currency formatting from src/components/ProductCard/ProductCard.js (lines 45-52)",
    "Remove inline currency formatting from src/components/CartSummary/CartSummary.js (lines 23-28)",
    "Both components import from src/utils/formatCurrency.js instead"
  ]
```

This phase produces data for the pipeline. `related_actions` and `fix` fields are recommendations for the user — do not execute them. Return findings to SKILL.md for verdict assembly.

## Token Efficiency

Direct is the most expensive phase because it reads files and reasons about their contents. Minimize waste:

```
EFFICIENCY RULES:
→ Don't re-read files that Part-Auto already examined (check files_read)
→ Don't re-flag issues that prior phases already found (check prior_findings)
→ Don't re-flag issues that were explicitly dismissed (check dismissed_findings)
→ Start with the largest files and most-imported files — these have the highest
  probability of findings and the highest impact if misplaced
→ Skip test files, config files, and files under 20 lines — these rarely
  have structural issues worth flagging
→ For projects over 50 files, prioritize: files changed recently > files
  with many importers > files in unexpected locations > everything else
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The name is close enough" | Close enough means a new developer will put the wrong code in this file. Names are the first and cheapest documentation — make them exact. |
| "This file can't be portable, it's project-specific" | Most files should be portable. A component that renders a user card should work in any project with user data. If it can't, it's coupled to things it shouldn't know about. |
| "There's some overlap but they're different enough" | Overlap grows. Two files at 20% overlap today are at 60% overlap in six months because developers add to whichever one they find first. Draw the boundary now. |
| "I'll just read the whole project" | Reading everything is expensive and unfocused. The prior phases already handled the mechanical checks and flagged the problem areas. Direct should be surgical, not comprehensive. |
| "The scripts missed it so it must be fine" | Scripts check structure. Direct checks meaning. A file can be structurally perfect — correct folder, correct name, correct imports — and still be semantically misplaced because its actual responsibility doesn't match its stated layer. |

## Red Flags (for this phase)

- Producing more than 10 findings in Direct — either prior phases aren't doing their job or the project is deeply misstructured. If the latter, batch by module rather than flagging everything at once
- A finding that could have been caught by a script — flag it as a script gap, don't just report it
- A placement recommendation that creates a new folder — new folders should be the last resort. Check if an existing folder covers the responsibility
- Re-reading a file that appears in Part-Auto's `files_read` list — wasted tokens and potentially contradictory findings
- A finding with severity S1-BLOCKING — Direct shouldn't find many of these because Auto catches the structural S1s. If Direct finds a semantic S1, it's likely a coupling or overlap issue that's genuinely severe

## Verification

After Direct completes:

- [ ] No file was read that appears in Part-Auto's files_read list
- [ ] No finding duplicates something in prior_findings or dismissed_findings
- [ ] Every finding has concrete evidence — not "this seems wrong" but specific lines, specific imports, specific behavior
- [ ] Placement recommendations include the full checklist
- [ ] Script gaps are reported with actionable recommendations
- [ ] The files_read list is accurate and complete
