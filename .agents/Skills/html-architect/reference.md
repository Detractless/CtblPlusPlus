# HTML Architect — Reference

## When This File is Loaded

This file is loaded by phase files that need the structural methodology — primarily `direct.md` for placement decisions and semantic checks, and occasionally `part-auto.md` for verification context. It is never loaded directly by `SKILL_html-architect.md` and never loaded for Auto phase (scripts don't need principles).

If you are reading this file, you were sent here by a phase file for a specific reason. Apply the relevant section to the task at hand — do not read the entire document for every check.

## The Five Principles

### 1. Every File Has One Owner

Each file belongs to exactly one layer and one layer only. A file that straddles two layers — part component, part service — is a structural failure waiting to split into a bug. If you can't name the single responsibility of a file in one sentence, it doesn't have one yet.

```
ASK BEFORE PLACING ANY FILE:
→ What is the single job of this file?
→ Which layer does that job belong to?
→ Does anything in this file belong to a different layer?
→ Could this file be moved to another project and still make sense in isolation?
```

If the answer to the last question is "no," the file is coupled to the wrong things. Find what's causing that coupling and separate it.

### 2. Layers Must Not Know Each Other Out of Turn

The allowed direction of knowledge is strictly top-down:

```
Pages / Routes
    ↓ may import from
Components
    ↓ may import from
Services / Utils
    ↓ may import from
External libraries / APIs
```

A `utils/` file that imports from a component is a layer violation. A component that imports from a page is a layer violation. These feel harmless individually — they become untestable, circular dependency nightmares at scale. The rule is absolute: lower layers never reach up.

### 3. Structure Reflects Responsibility, Not File Type

Organizing by file type (`/js`, `/css`, `/html`) makes sense for a beginner tutorial. It does not scale. Organize by responsibility instead:

```
// TYPE-BASED (does not scale)
src/
  js/
    button.js
    modal.js
    api.js
  css/
    button.css
    modal.css

// RESPONSIBILITY-BASED (scales)
src/
  components/
    Button/
      Button.js
      Button.css
    Modal/
      Modal.js
      Modal.css
  services/
    api.js
```

When a component is deleted, every file related to it lives in one place. When a developer opens a component folder, they have everything they need. Type-based organization forces a developer to hold a mental map of five folders simultaneously to work on one feature.

### 4. Shared Code Lives at the Lowest Common Layer

When two components need the same logic, don't duplicate it and don't put it in one of the components. Move it to the lowest layer that both components can legally import from.

```
DECISION RULE:
- Logic used by one component      → lives inside that component's folder
- Logic used by multiple components → lives in utils/ or services/
- Logic used across the whole app  → lives in a dedicated shared/ or lib/ folder
- Data/values used everywhere      → lives in constants/ or tokens/
```

The anti-pattern is promoting shared logic into a parent component just because it's the common ancestor. Parent components are layout and composition — they are not logic libraries.

### 5. New Files Are the Last Resort

Before creating a new file, the correct question is: "Does something that handles this already exist?" The second question is: "Should this be an addition to an existing file, or genuinely a new module?" File sprawl — dozens of tiny files for things that could be co-located — is as damaging as monolithic files. Both make a codebase hard to navigate.

```
BEFORE CREATING A NEW FILE:
1. Search the codebase for existing files with related responsibility
2. Check if the logic belongs inside a file that already exists
3. If creating new: confirm it has a single, non-overlapping job
4. If unsure: write it in the existing file first — extract it later if it grows
```

The rule: extract when something is used in 3+ places, or when a file exceeds clear single-responsibility. Not before.

## The Architecture Process

### Step 1: Map the Existing Structure First

Never make structural decisions without reading what already exists. A placement that seems logical in isolation may duplicate something already present.

```
BEFORE DECIDING WHERE ANYTHING GOES:
- List all top-level folders and their stated purposes
- Read any ARCHITECTURE.md, CLAUDE.md, or README structure sections
- Identify which layer each existing file belongs to
- Find any files that are already misplaced — note them, don't fix them yet
- Find the most similar existing file to what you're about to place
```

If the project has no documented structure, document what you observe before proposing changes. You can't improve structure you haven't mapped.

### Step 2: Identify the Layer

Match the new or misplaced code to exactly one layer. Use this table as the decision framework:

| What the code does | Layer | Folder |
|---|---|---|
| Renders UI, handles local display state | Component | `components/` |
| Composes components into a full screen/route | Page | `pages/` |
| Wraps an external API or data source | Service | `services/` |
| Pure function with no DOM or network knowledge | Utility | `utils/` |
| Shared constants, enums, config values | Constants | `constants/` |
| CSS design tokens, root variables | Tokens | `styles/tokens.css` |
| Global resets and base document styles | Base styles | `styles/base.css` |
| App-wide state (if applicable) | Store | `store/` |
| Type definitions and interfaces (TS) | Types | `types/` |

If the code fits more than one row, it is doing more than one job. Split it before placing it.

### Step 3: Determine Scope

Once you know the layer, determine whether the code is local (used in one place) or shared (used in multiple places). This controls where inside the layer it lives.

```
LOCAL: Used only within one component or one page
→ Place it inside that component or page's own folder

SHARED WITHIN A LAYER: Used by 2+ components
→ Place it in the layer's root folder (utils/, services/)

GLOBAL: Used across multiple layers or throughout the app
→ Place it in a dedicated shared/ or lib/ folder at root level
→ Flag this — global scope is expensive and should be intentional
```

### Step 4: Name the File for Its Responsibility

A file named `helpers.js` could contain anything. A file named `formatCurrency.js` is self-documenting. The Architect proposes file names that make folder listings readable without opening the files.

```
NAMING RULES:
- Name describes the single responsibility, not the file type
- Components: PascalCase matching the export  (UserCard.js)
- Utils/Services: camelCase verb or noun phrase (formatDate.js, authService.js)
- Constants: SCREAMING_SNAKE or descriptive noun  (API_ENDPOINTS.js)
- CSS: matches its component exactly  (UserCard.css)
- Never: util.js, helpers.js, misc.js, common.js — these are junk drawers
```

### Step 5: Check for Violations Before Committing

Before finalizing any structural decision, run the violation checklist:

```
STRUCTURAL HEALTH CHECK:
→ Does any lower layer file import from a higher layer? (layer violation)
→ Does any component import from a sibling component's folder? (coupling violation)
→ Is the same logic present in more than one place? (duplication violation)
→ Does any file have more than one clearly stated responsibility? (SRP violation)
→ Does the new file's name describe exactly what it does? (naming violation)
→ Does this file's existence make the folder structure harder to navigate? (sprawl violation)
```

Any "yes" answer is a blocker. Resolve it before the file is created or moved.

## Structure Patterns Reference

### Standard Web Project (HTML/CSS/JS)

```
src/
  components/         ← self-contained UI units, each in its own folder
    Button/
      Button.js
      Button.css
    Modal/
      Modal.js
      Modal.css
  pages/              ← route-level compositions, import components only
    HomePage.js
    SettingsPage.js
  layouts/            ← structural shells shared across pages
    MainLayout.js
    MainLayout.css
  services/           ← API calls, external integrations, data fetching
    api.js
    authService.js
  utils/              ← pure functions, zero DOM/network knowledge
    formatDate.js
    validate.js
  constants/          ← enums, config values, static lookup tables
    routes.js
    apiEndpoints.js
  styles/
    tokens.css        ← design tokens only (:root variables)
    base.css          ← resets and document defaults only
    utilities.css     ← atomic helper classes only (.flex, .hidden)
  assets/             ← fonts, images, icons — never imported by logic files
```

### Component Folder Anatomy

```
components/UserCard/
  UserCard.js         ← renders and handles component events
  UserCard.css        ← styles scoped to this component only
  UserCard.test.js    ← tests for this component only
  index.js            ← re-exports UserCard for clean import paths
```

The `index.js` re-export is optional but recommended. It means every consumer imports from `components/UserCard` — never from `components/UserCard/UserCard`. Renaming the internal file never breaks imports.

### When a Component Gets Too Large

A component that exceeds ~150 lines or contains clearly separable sections should be split. The pattern:

```
// BEFORE: One large component doing too much
components/Dashboard/
  Dashboard.js        ← 400 lines, renders charts, handles filters, fetches data

// AFTER: Parent composes focused children
components/Dashboard/
  Dashboard.js        ← ~60 lines, composes children, owns page-level state
  DashboardChart.js   ← renders the chart only
  DashboardFilters.js ← renders and controls filters only
  useDashboardData.js ← fetches and transforms data (custom hook / logic file)
```

The parent becomes a composition shell. Each child has exactly one job.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's only used here for now, I'll move it later" | "Later" never comes. Place it correctly now — moving it costs the same effort either way, and the wrong placement will be imported by three other things before you get back to it. |
| "I'll put it in utils/ since I'm not sure" | `utils/` is not a holding pen. If you don't know where it belongs, you don't know what it does. Define the responsibility, then choose the layer. |
| "This component needs to import from that component, just this once" | Component-to-component imports create hidden coupling that is nearly impossible to untangle later. Extract the shared dependency to a lower layer. |
| "The folder structure is fine, it's a small project" | Small projects become large projects. A structure that works for 10 files fails at 100. The right time to establish structure is before you need it. |
| "I'll just add it to the existing file, it's related" | Related is not the same as the same responsibility. A file that does two related things is still violating single responsibility. Related logic belongs in a related file, not the same file. |
| "Naming it helpers.js is fine, everyone knows what helpers means" | No one knows what helpers means in 6 months. Name the file for what the helpers actually do. |
| "Moving it now would break imports everywhere" | That's a sign it was placed wrong from the start and has already caused coupling damage. Fix the imports — the short-term pain prevents long-term paralysis. |
| "The scripts didn't flag it, so it's fine" | Scripts catch structural violations. They don't catch semantic misplacement, responsibility overlap, or naming lies. A clean Auto phase does not mean clean structure — it means the structure-checkable parts are clean. |

## Red Flags

- A file named `utils.js`, `helpers.js`, `misc.js`, or `common.js` — these are always junk drawers
- A component file that contains a `fetch()` call or direct API interaction
- A `utils/` function that imports from `components/` or `pages/`
- A component folder that imports from a sibling component's folder (not through a shared layer)
- A `styles/` file that contains component-specific classes instead of tokens or resets
- Any file described as "temporary" — temporary files become permanent
- A folder called `new/`, `old/`, `temp/`, or `backup/` committed to the repository
- A page file that contains more than layout and component composition
- The same constant, config value, or copy string defined in more than one file
- A newly created file whose job overlaps with an existing file by more than 20%

## Verification

After making or proposing any structural decision:

- [ ] Every file has a single, clearly stateable responsibility
- [ ] No file imports from a layer above it
- [ ] No component imports directly from a sibling component's folder
- [ ] Shared logic lives at the correct shared layer, not duplicated in consumers
- [ ] All file names describe their responsibility without opening the file
- [ ] No junk-drawer files exist (`utils.js`, `helpers.js`, `misc.js`)
- [ ] Component folders contain only files belonging to that component
- [ ] Design tokens are defined once in `tokens.css` and nowhere else
- [ ] Business logic (calculations, validation, transforms) lives in `utils/` or `services/`, not in components
- [ ] The structure can be explained to a new developer in under 2 minutes by reading folder names alone
