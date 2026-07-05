---
name: csharp-architect
description: Enforces structural placement and layer boundaries. Use when deciding where new code belongs. Use when something feels like it's in the wrong project, namespace, or layer. Use when adding a feature and unsure which layer owns the responsibility. Use when reviewing a PR for structural violations, not behavioral ones.
---

# C# Architect

## Overview

Place code where it structurally belongs and enforce the dependency rules that keep layers from collapsing into each other. The goal is not to follow a pattern for its own sake — it's a codebase where any file's location tells you exactly what it does, what it's allowed to touch, and what is forbidden from touching it. Every placement decision must pass a single test: "If this layer were deleted, would only the things that should break actually break?"

## When to Use

- When adding a new class, service, interface, or handler and deciding which project or namespace it belongs in
- When a feature spans multiple layers and the responsibilities need to be divided correctly before writing any code
- When something compiles and works but feels like it's in the wrong place
- When an existing class has grown and its responsibilities now span multiple layers
- When reviewing a PR for structural violations before checking behavior
- When onboarding to a codebase and mapping out what the layer rules actually are
- When Infrastructure, Application, or Domain concerns have started bleeding into each other

**When NOT to use:**

- You already know where something belongs — just put it there, don't over-process
- The codebase has no layer structure yet — establish that first with the team, then use this skill to enforce it
- The question is about naming, simplification, or test strategy — those are separate concerns
- You're in a prototype or throwaway script where architectural structure has no return on investment

## The Five Principles

### 1. Dependencies Only Point Inward

The single rule everything else derives from. Inner layers define contracts. Outer layers implement them. Nothing in an inner layer ever references anything in an outer layer — not a class, not a namespace, not an assembly.

```
[API / UI]         →  can reference Application, Domain
[Infrastructure]   →  can reference Application, Domain
[Application]      →  can reference Domain only
[Domain]           →  references nothing in this codebase
```

```csharp
// VIOLATION: Domain referencing Infrastructure
// Domain/Order.cs
using MyApp.Infrastructure.Data; // ← WRONG. Domain knows nothing about EF.

// CORRECT: Domain defines its own need as an interface
// Domain/Repositories/IOrderRepository.cs
public interface IOrderRepository
{
    Task<Order> GetByIdAsync(OrderId id, CancellationToken ct);
}
// Infrastructure implements it. Domain never sees the implementation.
```

If a dependency arrow points outward, the architecture has a violation — regardless of whether the code compiles or the feature works.

### 2. Each Layer Has Exactly One Job

Not "roughly one job." Exactly one. If you can describe what a layer does and you need the word "and," it is doing too much.

| Layer | Its One Job | What It Must Not Do |
|---|---|---|
| **Domain** | Express business rules and invariants as code | Touch databases, HTTP, config, or DI |
| **Application** | Orchestrate use cases using Domain objects | Contain business rules or infrastructure details |
| **Infrastructure** | Implement interfaces defined by Application | Define business logic or use-case rules |
| **API / UI** | Accept input, delegate to Application, return output | Contain logic that isn't about I/O shaping |

When a class is doing two layers' jobs, it is not a versatile class — it is a boundary violation.

### 3. Interfaces Live With Their Consumer, Not Their Implementation

The owner of an interface is the layer that *needs* it, not the layer that *implements* it. This is what makes the dependency rule work. If Application needs to send email, Application defines `IEmailSender`. Infrastructure provides `SmtpEmailSender : IEmailSender`. Application never sees `SmtpEmailSender`.

```csharp
// VIOLATION: Interface defined next to its implementation
// Infrastructure/Email/IEmailSender.cs  ← WRONG namespace
// Infrastructure/Email/SmtpEmailSender.cs

// CORRECT: Interface owned by the layer that depends on it
// Application/Interfaces/IEmailSender.cs  ← Application defines the need
// Infrastructure/Email/SmtpEmailSender.cs  ← Infrastructure fulfills it
```

If you find yourself defining an interface in Infrastructure, stop and ask who needs it. The answer is almost always Application or Domain — and that's where the interface belongs.

### 4. Project References Are the Real Enforcement

Folder structure is a suggestion. Project references are a wall. If two things should not reference each other, they should be in separate `.csproj` files with no reference between them. The compiler will enforce the rule so you don't have to rely on discipline.

```xml
<!-- Domain.csproj — no ProjectReference nodes. Zero external dependencies. -->

<!-- Application.csproj -->
<ProjectReference Include="..\Domain\Domain.csproj" />

<!-- Infrastructure.csproj -->
<ProjectReference Include="..\Application\Application.csproj" />
<ProjectReference Include="..\Domain\Domain.csproj" />

<!-- Api.csproj — wires everything, references all -->
<ProjectReference Include="..\Application\Application.csproj" />
<ProjectReference Include="..\Infrastructure\Infrastructure.csproj" />
```

If you can't express a boundary as a missing project reference, it isn't a real boundary.

### 5. Placement Is a Decision, Not a Guess

Every class has exactly one correct home. When the answer isn't obvious, apply this decision sequence — in order — and stop at the first match:

```
PLACEMENT DECISION SEQUENCE:
1. Does this contain business rules or invariants?         → Domain
2. Does this orchestrate a use case or coordinate Domain?  → Application
3. Does this implement an infrastructure concern?          → Infrastructure
4. Does this handle I/O shaping (HTTP, CLI, UI)?           → API / UI
5. Still unclear? The class has mixed responsibilities.
   Split it before placing it.
```

If you reach step 5, the problem is not unclear placement — it's a class that needs to be broken apart first.

## The Architecture Process

### Step 1: Map the Responsibility Before Writing Code

Before a single line of implementation, state in plain English what the new thing does. Then apply the placement sequence. Do not write code in the wrong layer and move it later — moving code after the fact is how violations propagate.

```
BEFORE WRITING ANYTHING, ANSWER:
- What is the single responsibility of this class in one sentence?
- Does that responsibility involve business rules? (Domain)
- Does it coordinate between things? (Application)
- Does it touch a database, filesystem, or external API? (Infrastructure)
- Does it handle incoming requests or outgoing responses? (API)
- Does the sentence contain "and"? → Split the class first.
```

### Step 2: Identify Boundary Violations

Scan for these patterns. Each is a concrete violation, not a vague smell:

**Dependency direction violations:**

| Pattern | Violation | Fix |
|---|---|---|
| Domain class imports from Infrastructure | Domain → Infrastructure | Extract interface to Domain; implement in Infrastructure |
| Application handler calls `DbContext` directly | Application → Infrastructure detail | Add `IRepository` interface to Application; implement in Infrastructure |
| Domain entity has `[Column]` or `[Required]` EF attributes | Domain → Infrastructure concern | Move persistence mapping to Infrastructure configuration |
| Domain event takes `HttpClient` as dependency | Domain → Infrastructure | Pass a domain-level interface; implement HTTP call in Infrastructure |

**Layer responsibility violations:**

| Pattern | Violation | Fix |
|---|---|---|
| Business rule (discount logic, validation) in a Controller | API doing Domain's job | Move rule to Domain entity or domain service |
| `IQueryable<T>` leaking from repository into handler | Infrastructure detail in Application | Repository returns `IEnumerable<T>` or a domain collection |
| Use-case orchestration inside a Domain entity | Domain doing Application's job | Extract orchestration to an Application handler |
| DI registrations scattered across feature folders | No single wiring point | Consolidate into one `ServiceCollectionExtensions` per project |

**Project structure violations:**

| Pattern | Violation | Fix |
|---|---|---|
| All layers in one `.csproj` | No compiler-enforced boundaries | Split into separate projects per layer |
| Interface and implementation in the same namespace | Interface ownership unclear | Move interface to the consuming layer's namespace |
| Shared `Models` or `Common` project everything imports | God project, no dependency direction | Audit contents; re-home each class to its correct layer |

### Step 3: Enforce at the Project Reference Level

After identifying a violation, verify whether a project reference change can prevent it from recurring. If yes, make the reference change — not just the class move. A class moved without removing the reference that allowed the violation is one commit away from being violated again.

```
FOR EACH VIOLATION FOUND:
1. Move the class to its correct project
2. Check if the originating project reference should be removed
3. If removing the reference breaks other things → those are additional violations
4. Fix each downstream violation before restoring the reference
```

Never add a project reference to work around a placement problem. That is how the dependency graph becomes a cycle.

### Step 4: Validate the Boundary Holds

After all placements and reference changes, verify the structure is sound:

```
STRUCTURAL VALIDATION CHECKLIST:
- Can Domain.csproj be compiled with zero external project references?
- Does Application.csproj reference only Domain?
- Does Infrastructure.csproj implement interfaces it did not define?
- Does the API project contain zero business logic?
- Can every interface be found in the project of its consumer, not its implementor?
- Does the DI wiring live exclusively in the outermost layer (API / host)?
```

If any check fails, the boundary is not established — it's only partially established, which is the same as not established for the purposes of preventing drift.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's just a small helper, it doesn't matter where it lives" | Small misplaced helpers get copied. Every large violation started as a small one that got copy-pasted. |
| "The layers are too strict for this project's size" | Layers do not need to be separate assemblies on a small project. But the dependency rule still applies even in a single project — nothing in Domain should reference Infrastructure by class name. |
| "We'll reorganize it later when the structure is clearer" | Structure only gets less clear over time unless actively maintained. The correct time to place something right is before it gets referenced by ten other things. |
| "This is faster without the interface" | The interface costs five minutes now and saves hours when you need to test, swap, or mock later. The interface is not overhead — the debugging session you avoid is the payoff. |
| "Everyone on the team knows where this is, so it's fine" | Architecture exists for the person who joins next month, the diff you read in six months, and the feature that touches this code under deadline pressure. "Everyone knows" is not a structural property. |
| "Clean Architecture is overkill — we're not building enterprise software" | The principles scale down. You do not need all four projects. But "dependencies point inward" and "business logic stays out of the database layer" apply to a 500-line codebase as much as a 500,000-line one. |
| "I'll just put it in Shared/Common for now" | Common and Shared projects are where architectural intent goes to die. Every class in Common is a class that didn't get a real home. Audit it and re-home everything in it. |

## Red Flags

- A project named `Common`, `Shared`, `Helpers`, or `Utils` that everything references
- `DbContext` appearing in Application or Domain namespaces
- Business rule logic (pricing, discounts, eligibility, validation) living in a Controller or endpoint handler
- An interface defined in the same project as its only implementation
- A Domain entity with properties but no methods — the logic is hiding somewhere else and it's probably in the wrong layer
- Circular project references (A references B, B references A)
- The DI container being configured in more than one place
- A class whose name ends in `Manager`, `Helper`, or `Util` that contains business logic
- A feature that required touching every layer to make a change that should have been isolated to one

## Verification

After completing an architectural placement or review pass:

- [ ] Every class can justify its layer assignment with one sentence that matches that layer's job
- [ ] Domain compiles with no references to Infrastructure, Application, or framework-specific libraries
- [ ] Application references only Domain — no direct EF, HTTP, or filesystem calls
- [ ] All interfaces consumed by Application or Domain are defined within those layers
- [ ] Project references reflect the intended dependency graph — no extra references exist "just in case"
- [ ] DI wiring lives in one place per project, in the outermost host project
- [ ] No business logic exists in Controllers, Endpoints, or Minimal API handlers
- [ ] No `IQueryable<T>` or EF-specific types cross the Infrastructure boundary into Application
- [ ] A teammate reading only the project structure could name what each project is responsible for
- [ ] The placement decisions made here are documented in `ARCHITECTURE.md` with the reasoning, not just the conclusion
