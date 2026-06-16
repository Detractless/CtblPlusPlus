# Part-Auto Phase

## Purpose

Verify what the scripts flagged and catch what scripts can detect but not confirm. This phase sits between mechanical pattern matching and pure semantic reasoning. Every check here starts with a script finding a candidate — then AI reads the flagged file and makes the call.

If a check needs no file reading, it belongs in Auto. If a check needs no script at all, it belongs in Direct. Part-Auto is the bridge: script narrows, AI confirms.

## When This Phase Runs

```
TRIGGER:
→ Full Audit       — runs after Auto, always (it has its own checks beyond verification)
→ Targeted Audit   — runs if the ask involves SRP, scope, or page structure
→ Placement Mode   — does NOT run
```

## Input

```
PART-AUTO PHASE INPUT:
  auto_findings:  [Auto's complete findings list]
  auto_summary:   [Auto's summary block]
  target_dir:     <same path from Auto>
```

## Job A: Verify Auto Candidates

Some Auto findings are structurally detected but semantically ambiguous. The script caught a pattern — but the pattern might be harmless in context. Part-Auto reads the flagged files and either confirms or dismisses each candidate.

```
VERIFICATION RULE:
→ Only verify findings with confidence: "candidate"
→ Findings with confidence: "confirmed" pass through untouched
→ Every dismissed finding gets a reason — no silent drops
```

### File Size → SRP Verification

**Triggered by:** `check-file-size.js` flagging files at 150–499 lines

The script knows the file is long. It doesn't know whether the file is doing one complex thing (fine) or three simple things in a trenchcoat (not fine).

```
VERIFICATION PROCESS:
1. Read the flagged file
2. Identify how many distinct responsibilities are present
   → Does it render AND fetch?
   → Does it transform data AND handle DOM events?
   → Does it define constants AND contain logic that uses them?
3. If one responsibility: DISMISS — "File is large but cohesive. Single responsibility: [state it]."
4. If multiple responsibilities: CONFIRM and upgrade severity
   → 2 responsibilities in 150-299 lines → S2-HINDERING
   → 3+ responsibilities at any size → S2-HINDERING
   → Provide specific split recommendation in the fix field

ASK FOR EACH LARGE FILE:
→ Can I describe this file's job in one sentence without using "and"?
→ If I deleted the bottom half, would the top half still make sense as a module?
→ Are there natural seams where the code shifts from one concern to another?
```

A file that requires "and" in its description — "it renders the dashboard **and** fetches the data **and** formats the dates" — is three files.

### Duplicate Constants → Context Verification

**Triggered by:** `check-duplicate-constants.js` flagging identical values across files

The script found the same string in two places. It doesn't know if they mean the same thing.

```
VERIFICATION PROCESS:
1. Read both files containing the duplicate
2. Check the semantic context of each usage
3. If same meaning, same intent → CONFIRM
   "Both files use API_BASE_URL for the same API endpoint. Consolidate into constants/."
4. If coincidentally identical → DISMISS
   "'submit' in Button.js is a button label. 'submit' in formService.js is an HTTP method.
    Same string, different meaning. Not a real duplicate."
```

The test is not "are the strings equal?" (the script already confirmed that). The test is "would changing one require changing the other?" If yes, it's a real duplicate. If no, dismiss.

### Structure Shape → Context Verification

**Triggered by:** `check-structure-shape.js` flagging files at unexpected locations

The script found a file outside standard folder patterns. It doesn't know if the placement is wrong or intentionally unconventional.

```
VERIFICATION PROCESS:
1. Read the flagged file
2. Determine if its placement has a reason:
   → Framework requirement? (e.g., next.config.js must be at root)
   → Build tool convention? (e.g., vite.config.js at root)
   → Documented exception? (check README, ARCHITECTURE.md)
3. If no valid reason → CONFIRM, assign appropriate severity
4. If valid reason → DISMISS with citation
   "vite.config.js is at project root per Vite's requirement. Correct placement."
```

## Job B: Partial-Auto Checks

These are not verifications of Auto findings — they are independent checks that use script output as a starting point but require AI to complete. Part-Auto runs these regardless of whether Auto flagged anything.

### Scope Misplacement Detection

A function lives inside a component folder but is imported by many external consumers. That's a signal it should have been promoted to a shared layer.

```
DETECTION:
  SCRIPT PART: From Auto's import graph, find all functions/classes exported
               from component folders that are imported by 3+ other files.
  AI PART:     Read the function. Is it genuinely shared logic that belongs
               in utils/services? Or is it correctly a component helper that
               happens to be popular?

DECISION RULE:
→ Function has zero DOM knowledge and works on plain data
  → CONFIRM: move to utils/. Severity: S2-HINDERING.
→ Function is tightly coupled to the component's rendering logic
  → DISMISS: popular but correctly placed.
→ Function is a UI pattern used by multiple components (e.g., tooltip positioning)
  → CONFIRM: move to a shared component or a UI utility.
    Severity: S2-HINDERING.

COMMON TRAP:
  A date formatting function inside components/Calendar/formatDate.js
  that is imported by 5 other components. The name says Calendar but the
  function is generic. It belongs in utils/formatDate.js. The original
  placement was expedient, not correct — and now 5 import paths point
  at the wrong layer.
```

### Page Bloat Detection

A page file should be a composition shell — it imports components, arranges them, and passes props. When a page file contains business logic, it has absorbed responsibilities that belong in services or utils.

```
DETECTION:
  SCRIPT PART: Find page files with >20 non-import, non-return lines.
               Count function definitions, calculations, data transforms.
  AI PART:     Read the functions. Are they layout/composition logic
               (fine in a page) or business logic (extract to utils/services)?

DECISION RULE:
→ Function computes layout, handles routing, or manages page-level state
  → Fine. Pages own composition and routing.
→ Function validates data, transforms API responses, or computes business values
  → CONFIRM: extract to utils/ or services/. Severity: S2-HINDERING.
→ Function is an event handler that calls a service
  → Fine. Thin event handlers in pages are acceptable.
→ Function is an event handler that contains business logic inline
  → CONFIRM: extract the logic, keep the handler as a thin wrapper.
    Severity: S3-DRIFTING (until the page grows, this is manageable).

THE TEST:
→ If I deleted the page file, would I lose business logic that other
  pages might need? If yes, that logic is misplaced.
```

### CSS Scope Bleeding

Component CSS should style only its own component. When component CSS uses selectors that match elements outside its scope, it's a structural violation hiding in a stylesheet.

```
DETECTION:
  SCRIPT PART: Find CSS files inside component folders. Grep for:
    → Element-only selectors (div, span, p, h1 — no class or id qualifier)
    → Selectors targeting parent containers (.app, .main, .wrapper, body)
    → !important declarations (usually fighting scope bleed from elsewhere)
  AI PART:     Read the CSS file and the component it belongs to.
    → Are the flagged selectors actually scoped to this component's root?
    → Is !important compensating for poor specificity or genuine scope bleed?

DECISION RULE:
→ Element-only selector inside a component's own scoped container → DISMISS
→ Element-only selector without scoping → CONFIRM, S3-DRIFTING
→ Selector targeting a parent/global class → CONFIRM, S2-HINDERING
→ !important fighting a specificity war → CONFIRM, S2-HINDERING
  (the fix is to fix the specificity chain, not add more !important)
```

## Output

```
PART-AUTO PHASE OUTPUT:
  verified_findings: [
    // Auto findings that were confirmed, possibly with updated severity
    {
      id: "AUTO-004",
      phase: "auto",
      severity: "S2-HINDERING",  // upgraded from S3-DRIFTING
      category: "cohesion",
      file: "src/components/Dashboard/Dashboard.js",
      evidence: "247 lines. Three responsibilities: rendering (L1-80), data fetching (L81-160), date formatting (L161-247)",
      explanation: "Component file mixes rendering, API calls, and data transformation",
      fix: "Split into Dashboard.js (render), useDashboardData.js (fetch), formatDashboardDates.js (transform)",
      confidence: "confirmed",
      effort: "medium"
    }
  ]
  dismissed_findings: [
    // Auto findings that were cleared, each with a reason
    {
      id: "AUTO-003",
      phase: "auto",
      original_severity: "S3-DRIFTING",
      category: "cohesion",
      file: "src/utils/validate.js",
      dismiss_reason: "File is 180 lines but performs a single cohesive job: input validation. All functions serve one responsibility."
    }
  ]
  new_findings: [
    // Part-Auto's own discoveries from Job B
    {
      id: "PART-001",
      phase: "part-auto",
      severity: "S2-HINDERING",
      category: "scope",
      file: "src/components/Calendar/formatDate.js",
      evidence: "Imported by 5 components outside Calendar/. Function has zero DOM knowledge.",
      explanation: "Generic date formatting utility trapped inside a component folder. External consumers import across component boundaries.",
      fix: "Move to src/utils/formatDate.js. Update 5 import paths.",
      confidence: "confirmed",
      effort: "small"
    }
  ]
  summary: {
    auto_confirmed: <count>,
    auto_dismissed: <count>,
    new_found: <count>,
    files_read: ["src/components/Dashboard/Dashboard.js", "src/utils/validate.js", ...]
  }
```

This phase produces data for the pipeline. Do not act on findings — pass them forward or return them to SKILL.md for verdict assembly.

## Handoff to Direct

Part-Auto passes three lists and one exclusion set:

```
HANDOFF:
→ verified_findings   — confirmed Auto findings (Direct won't re-check these)
→ new_findings         — Part-Auto's own discoveries
→ dismissed_findings   — so Direct doesn't re-flag what was already cleared
→ files_read           — so Direct doesn't re-read files Part-Auto already examined
```

Direct receives this and focuses only on semantic checks that neither scripts nor script-assisted AI can handle.

```
HANDOFF RULE:
→ If Part-Auto dismissed everything and found nothing new → Direct still runs
  (it has its own checks that don't depend on prior findings)
→ If Part-Auto confirmed multiple S1s → Direct still runs, but Main may
  present the S1s immediately as early findings while Direct works
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The file is big but well-organized" | "Well-organized" with multiple responsibilities is still multiple responsibilities. The organization makes it easier to split — not a reason to avoid splitting. |
| "The duplicate is intentional — I want each module to have its own copy" | Then it will drift. When you update one copy and forget the other, behavior diverges silently. Define it once, import it everywhere. |
| "The CSS selector works fine" | It works until another component uses the same element structure. Unscoped selectors are landmines — they detonate on someone else's schedule. |
| "It's only imported by 3 files, that's not many" | Three files importing from a component's internal folder is three coupling violations. The number of violations is the count of things that break when you move the file. |
| "The page needs this logic right there for readability" | The page needs the result of this logic. The logic itself can live in a utility and be called with one line. Readability improves when the page shows what happens, not how it's computed. |

## Red Flags (for this phase)

- Dismissing a finding without reading the file — verification requires reading, not guessing
- Confirming every Auto candidate without dismissing any — scripts have false positives; if none are dismissed, Part-Auto isn't doing its job
- A file appearing in both verified and dismissed lists — deduplication failure
- Part-Auto producing findings in categories that Auto already covers with confirmed results — don't double-count layer violations that `audit-imports.js` already confirmed

## Verification

After Part-Auto completes:

- [ ] Every `candidate` finding from Auto has been explicitly confirmed or dismissed
- [ ] Every dismissed finding has a specific reason, not a generic "looks fine"
- [ ] Severity upgrades/downgrades include the reasoning
- [ ] New findings from Job B are in the Universal Finding Format
- [ ] No file was read twice (check against Auto's files and within Part-Auto's own list)
- [ ] The files_read list is accurate — Direct depends on it to avoid redundant work
