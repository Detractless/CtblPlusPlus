# CTBL++ Agent Skill Library Review

**Date:** 2026-07-05  
**Files reviewed:** 3 (2 skills, 1 reference document)  
**Scope:** `.agents/` folder — all files

---

## 1. Inventory

| File | Type | Purpose | Trigger Defined |
|---|---|---|---|
| `.agents/Docs/amazon-vm-ie-webview-fix.md` | Reference doc | Documents the six registry changes that fix the gray-screen IE WebBrowser COM bridge failure on Amazon EC2 / Windows Server 2022 VMs | None — not a skill |
| `.agents/Skills/Skill_Csharp_Architect.md` | Skill | Enforces Clean Architecture layer placement and project reference boundaries for C# code | Prose only — buried under "When to Use" |
| `.agents/Skills/Skill_Html_Architect.md` | Skill | Enforces file/folder placement rules and layer boundaries for the HTML/JS/CSS frontend layer | Prose only — buried under "When to Use" |

---

## 2. Trigger Accuracy

Neither skill has a formal `trigger` field in its frontmatter. Both bury activation conditions in prose under "When to Use." The descriptions are accurate at the highest level of abstraction, but several individual trigger clauses are either too vague to act on or will reliably misfire.

### C# Architect — specific issues

- **"When reviewing a PR for structural violations, not behavioral ones"** — competes with any code-review skill. Ambiguous about what "structural" means without a concrete example.
- **"When Infrastructure, Application, or Domain concerns have started bleeding into each other"** — "bleeding" is metaphorical and unactionable.
- **"When onboarding to a codebase"** — far too broad. Would fire anytime someone new looks at the repo, not specifically when placement decisions are needed.

### HTML Architect — specific issues

- **"When setting up a new project and choosing the initial folder layout"** — CTBL++ is a mature, established project. This trigger clause is permanently stale.
- **"After a fast-paced feature sprint that may have broken structural discipline"** — matches every sprint. No threshold condition.
- **"When a codebase is growing and structure is starting to drift"** — "starting to drift" requires subjective interpretation. Not actionable.

> **Gap:** Neither skill's description mentions CTBL++'s specific tech stack. The C# Architect says nothing about the watchdog structure. The HTML Architect says nothing about vanilla JS, Webpack, or the `window.external` COM bridge. A model with no prior context cannot distinguish these from generic architect skills for any other project.

---

## 3. Scope Discipline

Both skills combine four distinct operations that should be separate skills:

| Operation | Question it answers |
|---|---|
| Placement | "Where does this new class or file go?" |
| Violation detection | "Does the existing code violate any boundaries?" |
| Remediation | "How do I fix the violations I found?" |
| Structural validation | "Is the codebase structurally sound after changes?" |

Placement is forward-looking and creative. Violation detection is backward-looking and analytical. A single skill executing both produces inconsistent output.

### Additional scope violation in HTML Architect

The frontmatter under "When NOT to use" explicitly states: *"The question is about naming conventions inside a file, not file placement — that belongs to the Naming Reviewer."* Step 4 of the Architecture Process then defines a complete naming rule system. The skill contradicts itself on its own boundary, and the referenced "Naming Reviewer" skill does not exist.

### Recommended splits

- `Skill_Csharp_Placement.md` — "Where does this new C# class belong?"
- `Skill_Csharp_ArchReview.md` — "Does this changeset violate any layer boundaries?"
- Same split for HTML: `Skill_Html_Placement.md` and `Skill_Html_StructureReview.md`
- `Skill_Naming_Reviewer.md` — referenced but missing entirely

---

## 4. Overlap and Gaps

### Overlaps

- Both skills define single-responsibility principle, dependency-direction rules, and layer placement logic. They share the same conceptual core with only the language (C# vs. JS) changed. No skill handles the seam between them — the cross-stack layer that every CTBL++ feature touches.
- Both skills define "Red Flags" sections that partially overlap without acknowledging each other.

### Gaps — what's missing

| Missing Skill | Why CTBL++ needs it | Severity |
|---|---|---|
| **Cross-stack feature skill** | Every CTBL++ feature spans the C# Engine API (`LocalWebServerService` at port 58123) AND the WebUI. Adding an endpoint requires coordinated placement decisions in both stacks simultaneously. No skill covers this end-to-end path. | Critical |
| **CTBL++-specific architecture skill** | The project has four components the generic Clean Architecture skill doesn't model: Wd1/Wd2 watchdog services, the `window.external` COM bridge, the `LocalWebServerService` REST host, and the DPAPI/HMAC security layer. None appear in the placement decision sequence. | Critical |
| **Naming Reviewer skill** | Explicitly referenced as a separate skill in HTML Architect's "When NOT to use" section. Does not exist. | High |
| **Security skill** | CTBL++ has explicit `Domain/Security/` and `Infrastructure/Security/` layers (DPAPI encryption, HMAC signatures, queue integrity, lockdown). No skill governs when to use DPAPI vs. plain storage or where security concerns live in the hierarchy. | High |
| **Testing skill** | No guidance on test file placement, test strategy, or what is expected to be unit- vs. integration-tested. | Medium |
| **Build/deployment skill** | `ctbl.bat` and `Deploy.ps1` are complex orchestration scripts. No skill explains when to run which build target, how the Webpack bundle connects to the C# service, or what the deployment sequence is. | Medium |
| **IE/WebView2 environment skill** | `amazon-vm-ie-webview-fix.md` contains critical constraints for WebUI development (COM bridge requirements, zone settings, LMZ lockdown). This knowledge is in a reference doc a model won't proactively invoke. It should be a skill, or its constraints should be embedded in the HTML Architect skill. | Low-Medium |

---

## 5. Internal Consistency

### C# Architect

**Example project structure doesn't match this codebase.** Principle 4's `.csproj` example shows four generic projects: `Domain.csproj`, `Application.csproj`, `Infrastructure.csproj`, `Api.csproj`. CTBL++ has seven projects: `CtblPlusPlus.Domain`, `CtblPlusPlus.Application`, `CtblPlusPlus.Infrastructure`, `CtblPlusPlus.Engine`, `CtblPlusPlus.Installer`, `CtblPlusPlus.Wd1`, `CtblPlusPlus.Wd2`. A model following these examples would generate incorrect project reference paths.

**Placement sequence has blind spots for three projects.** The decision sequence stops at four layers (Domain/Application/Infrastructure/API). Engine, Installer, Wd1, and Wd2 don't map to any step. Code belonging in these projects would either be forced into the wrong layer or reach Step 5 ("Still unclear — split it") incorrectly.

**Verification references a non-existent file.** Final checklist item: "The placement decisions made here are documented in `ARCHITECTURE.md` with the reasoning." No `ARCHITECTURE.md` exists. Architecture documentation is in `README.md`. This verification step silently fails every run.

### HTML Architect

**Verification references a non-existent file.** Checklist item: "Design tokens are defined once in `tokens.css` and nowhere else." CTBL++ has no `tokens.css`. The `styles/` folder contains `base.css` and `utilities.css`. This check will always produce a false finding in a clean codebase.

**Standard folder pattern is incomplete for this project.** The reference structure lists `components/`, `pages/`, `layouts/`, `services/`, `utils/`, `constants/`, `styles/`, `assets/`. CTBL++'s WebUI also has `routes/` (`router.js`) and `store/` (`AppState.js`), which are absent from the pattern. New developers won't know where routing or state management code belongs.

**Self-contradiction on naming scope.** The "When NOT to use" section defers naming to a separate "Naming Reviewer" skill. Step 4 then defines a complete naming rule system. Both cannot be correct.

---

## 6. Composability

Neither skill defines a structured output format. Both produce prose. This breaks every multi-skill workflow.

**Cross-stack feature scenario (most common CTBL++ task).** Adding a new block type requires: a C# handler in Application, a repository method in Infrastructure, an API route in Engine, a service call in `WebUI/services/`, and a new component in `WebUI/components/`. This spans both architect skills — but neither produces output the other can consume. Running C# Architect first produces prose; HTML Architect has no way to consume it.

**Documentation handoff failure.** C# Architect ends with: "Document decisions in `ARCHITECTURE.md`." HTML Architect has no documentation step. After running both skills, no canonical record of cross-stack placement decisions exists.

**Reference document is an island.** `amazon-vm-ie-webview-fix.md` contains critical WebUI development constraints: the `window.external` COM bridge must be scriptable, content must be in IE Zone 1, and JavaScript execution must not be blocked by LMZ lockdown. A model executing the HTML Architect skill has no mechanism to pull these constraints in. Any WebUI change that breaks the COM bridge will pass the HTML Architect's structural checklist and fail silently at runtime on Windows Server.

---

## 7. Instruction Quality

The following instructions are vague enough to produce inconsistent output across runs.

### C# Architect

| Current (vague) | Replacement (precise) |
|---|---|
| "Scan for these patterns." | "For each class in the changed files, check it against the violation table. For each row that matches, record: [class name] → [violation type] → [fix]. If no rows match, write 'No violations found' and stop." |
| "When an existing class has grown." | "When a class's one-sentence responsibility description requires the word 'and', or when its diff in the current PR touches more than one layer." |
| "Verify the structure is sound." | "Run each item in the Structural Validation Checklist. Fail on the first item that does not pass. Do not continue until all items pass." |
| "When Infrastructure, Application, or Domain concerns have started bleeding into each other." | "When a class in `CtblPlusPlus.Domain` or `CtblPlusPlus.Application` has a using directive from `CtblPlusPlus.Infrastructure`, or when a handler in Application directly instantiates a `DbContext`, `SqliteConnection`, or `HttpClient`." |

### HTML Architect

| Current (vague) | Replacement (precise) |
|---|---|
| "Map the Existing Structure First." (no definition of what a map is) | "List every top-level folder in `Raw/`, its one-line purpose, and one example filename from it. Produce this as a markdown table before making any placement decisions. Do not propose a placement before this table exists." |
| "Flag this — global scope is expensive and should be intentional." | "Stop and insert this comment before proceeding: 'GLOBAL SCOPE: [symbol] — confirm this is intentionally accessible across all pages.' Do not proceed until the requester confirms." |
| "After a fast-paced feature sprint that may have broken structural discipline." | Remove this trigger — it cannot be evaluated without external sprint tracking. Replace with: "After any commit that adds 3+ new files to the WebUI layer without an accompanying architecture note." |

---

## 8. Format and Structure Consistency

The two skill files are structurally consistent with each other. They follow the same template:

> frontmatter → Overview → When to Use → When NOT to Use → Five Principles → Architecture Process (5 steps) → Common Rationalizations → Red Flags → Verification checklist

This is good. What the frontmatter is missing:

| Field | Present | Impact of absence |
|---|---|---|
| `name` | Yes | — |
| `description` | Yes | — |
| `trigger` (formal field) | **No** | Activation must be inferred. A model can't match an event against a trigger if none is declared. |
| `inputs` | **No** | No definition of what the skill expects to receive — a diff? a file path? a class description? |
| `output-format` | **No** | No defined output structure, making skill chaining impossible (see Section 6). |
| `version` / `last-updated` | **No** | No way to detect or communicate staleness. |

**Filename vs. frontmatter name mismatch.** Filenames use `Skill_Csharp_Architect.md` (PascalCase with `Skill_` prefix). Frontmatter `name` fields use `csharp-architect` (kebab-case, no prefix). These two naming systems disagree.

**`Docs/` has no format.** `amazon-vm-ie-webview-fix.md` has no frontmatter. If more documents are added to `Docs/`, there is no convention for them to follow. The `Docs/` subfolder's purpose relative to `Skills/` is also undocumented.

---

## 9. Staleness Risk

### C# Architect

| Hardcoded assumption | Where it appears | Risk |
|---|---|---|
| Project names `Domain.csproj`, `Application.csproj`, `Infrastructure.csproj`, `Api.csproj` | Principle 4 code block | Actual names are prefixed `CtblPlusPlus.*`. A model generating project references from these examples will produce wrong paths. |
| Four-layer architecture model (Domain/Application/Infrastructure/API) | Placement Decision Sequence, all examples | CTBL++ has seven projects. Engine, Installer, Wd1, Wd2 don't appear in the model. |
| `ARCHITECTURE.md` path | Final verification checklist item | File does not exist. Architecture is in `README.md`. This check silently fails every run. |

### HTML Architect

| Hardcoded assumption | Where it appears | Risk |
|---|---|---|
| `styles/tokens.css` | Folder pattern, verification checklist | File does not exist in CTBL++. Verification item will always produce a false finding. |
| ~150 lines as the component split threshold | Component anatomy section | Arbitrary number with no project basis. Will generate split recommendations on components the team considers appropriately sized. |
| "Extract when used in 3+ places" rule | Principle 5 | Hardcoded threshold. |
| Folder pattern missing `routes/` and `store/` | Standard Web Project reference | CTBL++ has both (`routes/router.js`, `store/AppState.js`). New developers won't know where these belong. |

### amazon-vm-ie-webview-fix.md (highest fragility)

| Hardcoded value | What breaks if it changes |
|---|---|
| `app.js line 218` (opacity flip) | Any edit to app.js above that line shifts this. The causal chain diagram becomes incorrect. |
| `document.ready crashes at line 123` | Same — will drift immediately. |
| `http://127.0.0.1:58123` | If the port changes, the zone mapping fix describes the wrong URL. |
| `Cold Turkey Blocker.exe` | Registry FeatureControl keys are per-executable-name. If Cold Turkey renames its binary, all six registry entries stop working. |
| `C:\Program Files\Cold Turkey\web` | Cold Turkey's install path; could change with an update. |

---

## 10. Automation Offloading

Both skills ask a model to perform checks that are entirely deterministic and should be run by scripts before the model is invoked.

### C# Architect — offloadable checks

| Check currently in the skill | Replacement tool | What the AI does with the output |
|---|---|---|
| "Does Domain.csproj compile with zero external project references?" | PowerShell: parse `<ProjectReference>` nodes in `CtblPlusPlus.Domain.csproj` | If violations are returned, reason about which reference to remove and where the class should move instead. |
| "Does Application.csproj reference only Domain?" | Same PowerShell script, different target | Same — judge the remediation, not the detection. |
| "`DbContext` appearing in Application or Domain namespaces" | `grep -r "DbContext" CtblPlusPlus.Application/ CtblPlusPlus.Domain/` | For each hit, propose the extraction: which interface to define, which Infrastructure implementation to create. |
| "A project named Common, Shared, Helpers, or Utils" | Glob on top-level folder names | If found, audit contents and re-home each class. |
| Circular project references | Build a reference graph from all `.csproj` files; detect cycles | Reason about which direction the dependency should run and where an interface abstraction is needed. |
| "DI registrations scattered across feature folders" | `grep -r "services.Add" --include="*.cs"` across non-Engine projects | If found in wrong projects, determine the correct consolidation point. |

### HTML Architect — offloadable checks

| Check currently in the skill | Replacement tool | What the AI does with the output |
|---|---|---|
| "Does any lower layer file import from a higher layer?" | `dependency-cruiser` with a rules config; run as pre-commit hook | For each violation returned, reason about the correct extraction point. |
| "Is the same logic present in more than one place?" | `jscpd` (copy-paste detector) run over `Raw/` | For each duplication cluster, decide which file should own it. |
| "Does any component import from a sibling component's folder?" | Import analysis script or `dependency-cruiser` rule | For each cross-component import, identify what should be extracted to a shared layer. |
| Junk-drawer filenames (`utils.js`, `helpers.js`, `misc.js`) | `find Raw/ -name "utils.js" -o -name "helpers.js"` | For each hit, audit contents and propose specific extraction by responsibility. |

---

## 11. Saturation Analysis

Both architect skills are structurally capable of a "no findings" result — the verification checklists are binary — but their framing instrumentally biases a model toward generating output even on a clean codebase.

### C# Architect

- **Common Rationalizations section.** Six strawman arguments against clean architecture with detailed rebuttals. A model reads this before executing the skill and is now primed to find violations those arguments would apply to.
- **Red Flags framing.** The section heading and 8-item list is formatted as "things you will encounter," not "things to check for." No instruction says: "If none of these are present, state that explicitly and stop."
- **"Scan for these patterns" (Step 2).** Open-ended. A model that finds nothing will often generate a marginal finding to justify having scanned.

**Fix:** Add to the end of Step 2 and the Red Flags section: *"If none of the above patterns are present in the files under review, write 'No violations found' and proceed directly to the verification checklist. Do not generate findings to fill this section."*

### HTML Architect

- **Step 1 presupposes misplaced files.** "Find any files that are already misplaced — note them, don't fix them yet." This instruction assumes misplaced files exist.
- Same Red Flags and Rationalizations issues as C# Architect.
- **"Any 'yes' answer is a blocker"** implies yes answers are expected. The complementary instruction ("if all answers are 'no', the structure is sound — report that and stop") is missing.

**Fix:** Step 1 should read: *"Check whether any files are misplaced. If the existing structure is consistent with the layer model below, state 'Existing structure is sound' and proceed."*

Adding the clean-result path is the highest-leverage change in both skills — it directly prevents output inflation on healthy codebases.
