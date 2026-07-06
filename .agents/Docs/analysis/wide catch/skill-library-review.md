# `.agents/` Skill Library Review — CTBL++

**Reviewed:** 2026-07-05  
**Reviewer:** Claude Sonnet 4.6 (automated review)  
**Scope:** All files under `.agents/` reviewed against actual project structure

---

## Ground Truth: What's Actually in the Folder

The `.agents/` directory contains three files across two subdirectories:

| Path | Type | Purpose |
|---|---|---|
| `.agents/Skills/Skill_Csharp_Architect.md` | Skill (`csharp-architect`) | Enforces Clean Architecture layer placement in the C# backend |
| `.agents/Skills/Skill_Html_Architect.md` | Skill (`html-architect`) | Governs file and module placement in the HTML/JS frontend |
| `.agents/Docs/amazon-vm-ie-webview-fix.md` | **Reference document — not a skill** | Technical fix record for IE WebBrowser control failures on Windows Server VMs |

---

## 1. Inventory

**`Skill_Csharp_Architect.md`** (`name: csharp-architect`)  
Purpose: Determines correct layer placement (Domain / Application / Infrastructure / API) for any C# class, interface, or handler, and flags dependency direction violations.  
Trigger: *"Use when deciding where new code belongs. Use when something feels like it's in the wrong project, namespace, or layer. Use when adding a feature and unsure which layer owns the responsibility. Use when reviewing a PR for structural violations, not behavioral ones."*

**`Skill_Html_Architect.md`** (`name: html-architect`)  
Purpose: Determines where HTML/CSS/JS files belong in the frontend layer hierarchy (pages → components → services → utils), and enforces single-responsibility placement.  
Trigger: *"Use when creating new files, folders, or modules. Use when something feels like it's in the wrong place. Use when a codebase is growing and structure is starting to drift. Use when a new developer needs to understand how the project is organized."*

**`amazon-vm-ie-webview-fix.md`** — not a skill; addressed in §4 (Overlap and Gaps).

---

## 2. Trigger Accuracy

**`csharp-architect`:** The trigger is accurate for the questions it describes. The "When NOT to use" section is well-considered and prevents over-application. One gap: the trigger says nothing about the Wd1/Wd2 watchdog projects or the Installer project, which exist in this codebase alongside Domain/Application/Infrastructure/Engine. A model following this skill would be well-guided for the core layers but has no instruction for when to touch `CtblPlusPlus.Wd1`, `CtblPlusPlus.Wd2`, or `CtblPlusPlus.Installer`. These are architecturally significant and structurally constrained (watchdogs must only reference Domain; the Installer is a WPF + WebView2 host), but the skill doesn't acknowledge they exist.

**`html-architect`:** The trigger is accurate as written. However, it will silently misfire in one common scenario: an agent editing the *Bundled* output rather than the editable source. The actual editable source is `CtblPlusPlus.WebUI\web\Raw\`. The output at `CtblPlusPlus.WebUI\web\Bundled\` is webpack output and must never be edited directly — a constraint documented in the WebUI README but absent from this skill. A model triggered by "something feels like it's in the wrong place" could apply structural guidance to files in `Bundled\` and produce work that gets overwritten on the next build.

**Competition between the two skills:** None. The triggers are cleanly orthogonal — C# placement questions go to `csharp-architect`, JS/HTML placement questions go to `html-architect`. A PR touching both layers would correctly invoke both in sequence.

---

## 3. Scope Discipline

**`csharp-architect`:** Well-scoped to exactly one job — structural placement. It explicitly excludes naming, simplification, and test strategy. No splitting needed.

**`html-architect`:** Also well-scoped to placement and structure. One concern: Step 4 ("Name the File for Its Responsibility") introduces naming convention rules that belong to a separate naming reviewer skill. Naming and placement are related but distinct decisions. As written, the skill will produce naming guidance even when the only question was where a file belongs, not what it should be called. Minor scope creep — the naming section should note it only applies when a new file is being created, not when auditing existing locations.

---

## 4. Overlap and Gaps

### Overlap
None between the two skills. They cover cleanly distinct layers.

### Gaps

Work that happens constantly in this project and has no skill coverage:

| Missing Skill | Evidence of Need |
|---|---|
| **`webui-build-boundary`** — rules for what is editable (`Raw/`), what is generated (`Bundled/`), and the correct build-then-deploy workflow | `CtblPlusPlus.WebUI\README.md` is entirely devoted to warning AI agents about this; the warning exists because the mistake is evidently common |
| **`engine-api-contract`** — rules for adding or modifying REST endpoints on `http://127.0.0.1:58123`, including how JS clients (`CtblApiClient.js`, `coldTurkeyAPI.js`) and C# handlers stay in sync | The architecture crosses two languages; there is no guidance on how to keep the HTTP contract consistent across both sides |
| **`queue-mutation-rules`** — guidance specific to the queued-delay system (`QueueDispatcher`, `QueueSecurityValidator`, `QueueBatchContext`), which is the core CTBL++ feature and has its own security-sensitive invariants | The C# skill covers layer placement generically; the tamper resistance and HMAC validation of the queue system are high-stakes enough to warrant dedicated guidance |
| **`csharp-behavior-reviewer`** — a companion to `csharp-architect` that reviews logic correctness, not just placement | The current skill explicitly excludes behavioral review, which is correct scope discipline — but it leaves behavioral review entirely uncovered |
| **`watchdog-constraints`** — rules for Wd1 and Wd2: they must reference only Domain, must mark themselves as critical processes, must implement mutual monitoring | Completely absent from both skills |

**The `amazon-vm-ie-webview-fix.md` document** is stored in `.agents/Docs/` alongside the skills but is a reference document, not a skill. It has no frontmatter, defines no trigger, and gives no behavioral instructions to an agent. Two options: (a) move it to a `docs/` folder in the main project where humans find it, or (b) convert it into an actual skill (`vm-environment-fix`) with a trigger like "use when Cold Turkey shows a gray screen on a server OS or VM" and instructions that walk an agent through diagnosing and applying the registry fix. As-is, it is an orphaned artifact that a model cannot invoke and a human will not find.

---

## 5. Internal Consistency

**`csharp-architect`:** Internally consistent. The placement decision sequence (steps 1–5), the violation tables, the project reference enforcement, and the validation checklist all agree with each other. No contradictory steps.

One broken item: the skill instructs the model to document placement decisions in `ARCHITECTURE.md` (Verification checklist, last item). **No `ARCHITECTURE.md` file exists in this repository.** The instruction will be silently skipped or produce a new file in an uncontrolled location. Either create the file or change the reference to the actual documentation location (CLAUDE.md, README Architecture section, etc.).

**`html-architect`:** Internally consistent. The layer table in Step 2, the scope rules in Step 3, the naming rules in Step 4, and the violation checklist in Step 5 are all coherent. No contradictions.

One gap: Step 1 instructs "Read any ARCHITECTURE.md, CLAUDE.md, or README structure sections" but doesn't tell the model what to do if it finds conflicting guidance between those documents and the skill itself. The WebUI README is an authoritative source about build behavior that this skill doesn't reference — a model that reads both could be confused about which takes precedence.

---

## 6. Composability

The two skills are parallel, not sequential. That is correct for their current scope.

**Where chaining would silently break:**

**C# → JS API contract (missing glue skill):** When `csharp-architect` recommends adding a new Application handler that exposes a new REST endpoint, its output (a placed C# file) should be the input to some JS-side skill that updates `CtblApiClient.js` or `coldTurkeyAPI.js`. No such skill exists. A model that correctly places the C# side and stops has left the JS side unsynchronized. This is the most dangerous composability gap in the library.

**`html-architect` → build step:** The skill produces structural decisions (where files should go in `Raw/`) but does not reference the subsequent build step (`Deploy.ps1` / `npm run build`). A model following this skill to completion would consider itself done after placing the file, without triggering the build.

---

## 7. Instruction Quality — Vague Verbs and Ambiguous Directives

### `csharp-architect`

| Instruction | Problem | Suggested replacement |
|---|---|---|
| *"Scan for these patterns"* (Step 2) | Undefined scope — scan what? The current file? The whole project? | "For each file in the project or PR diff, check whether it matches any row in the violation table below. Report each match as a confirmed violation before proposing a fix." |
| *"Verify the structure is sound"* (Step 4) | "Sound" is interpretive — two models could agree on "sound" while disagreeing on every checklist item | Replace with binary pass/fail per checklist item: "Run each item in the Structural Validation Checklist. Report PASS or FAIL for each. Do not proceed until all items are evaluated." |
| *"Note them, don't fix them yet"* (Step 1) | "Note" has no defined output format | "Append each misplaced file to a running violations list with the pattern: `[File] → [Current layer] → [Correct layer]`. Do not propose fixes until the full scan is complete." |

### `html-architect`

| Instruction | Problem | Suggested replacement |
|---|---|---|
| *"document what you observe before proposing changes"* | "Document" — in what form? In what file? | "Produce a folder-by-folder listing of the current structure with one-sentence responsibility notes for each folder. Show it to the user and ask for confirmation before proposing any changes." |
| *"Flag this — global scope is expensive and should be intentional"* (Step 3) | "Flag" has no defined output form | "Stop and ask the user: 'This file will be placed at global scope. Is this intentional? Global-scope files are expensive to later restrict.'" |
| *"confirm it has a single, non-overlapping job"* (Step 5) | "Non-overlapping" — with what? | "Before creating the file, search the codebase for existing files whose responsibility description shares more than two words with the proposed file's. If any are found, list them and explain why the proposed file is distinct." |
| *"A component that exceeds ~150 lines ... should be split"* | The tilde makes this a suggestion with no enforcement behavior | Either commit to a hard number ("exceeds 150 lines") or reframe as a signal: "exceeds 150 lines is a trigger to check, not an automatic requirement to split — split only if two clearly separable responsibilities exist." |

---

## 8. Format and Structure Consistency

Both skills follow identical structure:
- YAML frontmatter with `name:` and `description:`
- `## Overview` paragraph
- `## When to Use` with positive and negative cases
- `## The Five Principles` (numbered 1–5, with code examples)
- `## The Architecture Process` (numbered Steps)
- `## Common Rationalizations` table
- `## Red Flags` list
- `## Verification` checklist

This is a coherent, consistent format. Both files are extremely well-matched to each other in structure, length, and organization. This is the strongest aspect of the library.

**Deviations:**
- `amazon-vm-ie-webview-fix.md` has **no frontmatter at all** — no `name:`, no `description:`, no type field. It does not follow the skill format because it is not a skill.
- Step counts differ: `csharp-architect` has 4 process steps; `html-architect` has 5. Not a problem, but a fixed template count would help consistency as the library grows.

---

## 9. Staleness Risk

### `csharp-architect`

| Assumption | Location | Risk |
|---|---|---|
| Four layers: Domain, Application, Infrastructure, API/UI | Throughout | **Medium.** The actual project has 7 projects (Domain, Application, Infrastructure, Engine, Installer, Wd1, Wd2). Engine is not an "API/UI" project. Watchdogs are not covered by the four-layer model. |
| `ARCHITECTURE.md` as the documentation target | Verification checklist | **High.** This file does not exist. Every run of this skill that reaches the verification checklist encounters a broken reference. |
| Four-layer `.csproj` reference example | Principle 4 | **Low for now.** Will break if the project restructures projects. |

### `html-architect`

| Assumption | Location | Risk |
|---|---|---|
| `tokens.css` as the single design token source | Verification checklist | **High.** The skill asserts "Design tokens are defined once in `tokens.css`" but the real project patches Cold Turkey's own CSS — this file structure may not apply. |
| `styles/tokens.css` and `styles/base.css` layout | Structure Patterns Reference | **Medium.** Describes an ideal that may conflict with Cold Turkey's existing CSS organization. |
| The 150-line split heuristic applied to patched components | When a Component Gets Too Large | **Medium.** Cold Turkey's original components have different norms. Applying splits to patched-in components may break Cold Turkey's own logic groupings. |
| Example paths (UserCard, Dashboard) | Structure Patterns Reference | **Low.** These are pedagogical, not hardcoded project paths. But a model reading them literally may look for these files. |

### `amazon-vm-ie-webview-fix.md`

| Assumption | Risk |
|---|---|
| `"Cold Turkey Blocker.exe"` as the executable name | **Medium.** If Cold Turkey renames its binary, all registry entries using this string fail silently. |
| `http://localhost:58123` attributed to Cold Turkey's web serving | **High.** This is actually CTBL++'s Engine API port. The document conflates the two. |
| `app.js line 218` as the opacity flip location | **High.** `Bundled/app.js` is webpack output — line numbers change on every build. |
| Windows Server 2019/2022 as the complete affected environment list | **Low.** New Windows Server versions may or may not exhibit the same bug. |

---

## 10. Automation Offloading

### `csharp-architect` — sub-tasks that don't require AI judgment

| Sub-task | Better handled by |
|---|---|
| "Can Domain.csproj be compiled with zero external project references?" | `dotnet list CtblPlusPlus.Domain/CtblPlusPlus.Domain.csproj reference` — one CLI call; feed output to AI to interpret |
| "Does Application.csproj reference only Domain?" | Same `dotnet list reference` check; fully scriptable |
| Scanning for `DbContext` in Application or Domain namespaces | `grep -rn "DbContext" CtblPlusPlus.Domain/ CtblPlusPlus.Application/` — zero results means clean |
| Checking for circular project references | `dotnet list reference` across all projects fed to a simple cycle detector |
| Verifying DI wiring lives in one place | Grep for `services.Add` / `builder.Services.Add` across the solution; AI interprets whether multiple hits indicate a violation |
| Finding interfaces defined in the same project as their implementation | Script can compare `interface I*` namespace to the namespace of its only implementation |

**Recommended pattern:** Add a "Pre-check script results" step at the top of the Architecture Process. Instruct the model to run (or be given the output of) the structural grep/CLI checks before applying judgment, so it reads confirmed violations rather than hunting for them speculatively.

### `html-architect` — sub-tasks that don't require AI judgment

| Sub-task | Better handled by |
|---|---|
| "Does any lower-layer file import from a higher layer?" | A static import graph tool (e.g., `madge`) produces the full import tree; the AI flags violations found in the output |
| Flagging junk-drawer filenames (`utils.js`, `helpers.js`, `misc.js`) | A linter rule on exact name match; AI handles non-pattern names only |
| "Is the same constant defined in more than one file?" | Dedup script across `constants/` for exact string matches; AI handles near-duplicates |
| Confirming no component folder imports from a sibling component folder | Import graph analysis (same `madge` output) — deterministic check |
| Checking that design tokens are defined in only one place | `grep -rn ":root" --include="*.css"` — more than one result is a violation |

**Recommended pattern:** Step 1 of the Architecture Process should note: "If an import graph tool output is available, read it before proceeding. Layer violation detection is deterministic from the import graph — apply AI judgment only to cases the tool did not flag."

---

## 11. Saturation Analysis

**Can each skill return a clean result (no findings)?**

**`csharp-architect`: PASS** — the verification checklist is binary, and a codebase that passes all items returns a list of checked boxes and nothing else. The violation table in Step 2 is pattern-matched — if no patterns match, the output is "no violations found." Genuinely saturable.

One caveat: "Scan for these patterns" without a defined scope creates a risk on large codebases — a model with no defined scan boundary may keep finding plausible-but-not-real violations. Adding "limit the scan to the files modified in the current task or PR diff" would bound the output.

**`html-architect`: PARTIAL FAIL** — the skill has structural framing that makes a clean result difficult to reach.

Specific instructions that prevent saturation:

- **Step 1:** *"Find any files that are already misplaced — note them, don't fix them yet"* — open-ended scan with no termination condition and no threshold for what counts as "misplaced." A model applying this to a clean codebase will invent marginal placements to note.
- **Principle 5:** *"Before creating a new file, the correct question is: 'Does something that handles this already exist?'"* — implicitly asks the model to evaluate all existing files for overlap, guaranteeing output even when nothing overlaps.

**Fix:** Add an explicit exit path at the top of the Architecture Process:

> *"If the existing structure is sound and the only task is placing a new file, skip the full structural audit (Steps 1–2 survey) and go directly to Step 2's layer identification table. Report only: the proposed location and the one-sentence justification. Do not report observations about other files unless they create a direct conflict with the proposed placement."*

---

## Summary: Priority-Ordered Actions

### Stop-the-presses (do before the next agent session touches the UI)

1. **Add a `webui-build-boundary` skill** — or at minimum a prominent `## Build Constraint` section in `html-architect` — making the `Raw/` vs. `Bundled/` boundary the first thing a model encounters. The existing WebUI README warning is only seen if an agent reads that file; the skill is seen first.

2. **Fix the `csharp-architect` `ARCHITECTURE.md` reference** — this file doesn't exist, so the verification checklist is currently broken on its last item. Either create `ARCHITECTURE.md` or change the reference to a path that exists.

### High value, low effort

3. **Move or convert `amazon-vm-ie-webview-fix.md`** — move it to `docs/` in the main project (for human readers) or convert it into a proper skill with frontmatter and a trigger condition (for agent use). The current location makes it findable by neither.

4. **Expand `csharp-architect`'s trigger and process to acknowledge Wd1/Wd2/Engine/Installer** — a model using this skill on a watchdog question will incorrectly apply Domain/Application/Infrastructure logic that doesn't fit those projects.

5. **Add the clean-result exit path to `html-architect`** — one paragraph at the top of the Architecture Process section resolves the saturation problem.

### Structural additions (next skill authoring pass)

6. **`engine-api-contract`** — governs how REST endpoints (`http://127.0.0.1:58123/api/...`) are added, modified, and kept in sync between the C# Engine and the JS clients (`CtblApiClient.js`, `coldTurkeyAPI.js`). This is the highest-traffic cross-layer boundary in the project and currently has zero guidance.

7. **`csharp-behavior-reviewer`** — the behavioral complement to `csharp-architect`. The architecture skill explicitly excludes behavioral review (correct scope discipline); the gap means logic-correctness review has no coverage at all.

8. **`queue-mutation-rules`** — dedicated guidance for the queued-delay system with its HMAC-signed queue entries, tamper validation, and security invariants. The core CTBL++ feature deserves its own skill, not generic placement advice.

9. **`watchdog-constraints`** — rules for Wd1 and Wd2: reference only Domain, mark self as critical, implement mutual monitoring. Currently absent from both skills.
