---
name: text-clarity
description: Clean up messy, rambling, voice-dictated, or unclear text for understandability and coherence. Use this skill whenever the user asks to "clean up" text, "make this readable", "fix my notes", "edit for clarity", or pastes obviously unstructured text — especially voice-dictated content full of self-corrections, filler words, garbled terms, or incomplete thoughts. Trigger even when the user says something vague like "can you fix this" or "this is a mess" and pastes a block of text. Always use this skill before attempting to clean any user-supplied prose.
---

# Text Clarity Skill

Clean up messy, rambling, or unclear text by auditing for ambiguities, resolving them through multiple-choice questions, and producing polished output that preserves the user's intent.

---

## Phase 1: Audit the Text

Read the full text and flag every instance of:

- **Garbled or phonetic terms** — words that are likely voice-dictation errors, homophones, or mangled brand/technical names (e.g. "acute delay" when the user likely means "queue delay")
- **Unclear references** — pronouns or vague nouns that could point to multiple things ("it", "that one", "the other block")
- **Self-corrections** — places where the user says "wait no, I mean..." and keeps changing; only accept the final stated correction as confirmed if it lands cleanly
- **Contradictions** — statements that conflict with each other within the same text
- **Incomplete thoughts** — sentences that trail off or never resolve
- **Missing context** — a reference to something not yet defined in the text

Keep a running list of every ambiguous item. Anything you're less than ~90% confident about goes in the list.

---

## Phase 2: Ask All Clarifying Questions at Once

**Present all questions in a single message. Never spread them across multiple replies.**

### Format Rules

- Number each question: Q1, Q2, Q3...
- Each question must offer **2–4 labeled options** (A, B, C, D)
- Include **"E) Other: ___"** whenever none of the options might fit
- Keep options short and specific — no walls of text
- For garbled voice-dictation words, offer the most plausible transcriptions as options

### Example

```
Before I clean this up, I have a couple quick questions:

Q1. You use "Q Dylan," "cute delay," and "acute delay" — do you mean:
   A) Queue delay (a timed delay before a change takes effect)
   B) Q delay (same concept, abbreviated)
   C) Cue delay (triggered by a specific cue/event)
   D) Other: ___

Q2. You switch between "add a website," "remove a website," and "add an exception" — which action are you describing?
   A) Adding an exception (a site that bypasses the block)
   B) Removing a site from the blocklist
   C) Both, at different points in the text
   D) Other: ___
```

### When to Skip Questions

Skip a question when the correction is **unambiguous from context**. If the user says "wait, no, I mean X" and X is clear and definitive, accept X without asking. Only ask about things where you genuinely cannot pick the right meaning with high confidence.

---

## Phase 3: Produce the Cleaned Text

Once the user answers, rewrite the text with these goals:

| Goal | What it means |
|---|---|
| **Coherent prose** | Remove filler ("okay so", "um", "my bad", "again"), false starts, and redundant self-corrections |
| **Consistent terminology** | Use the confirmed term throughout — once settled, never alternate |
| **Logical structure** | Reorder if needed so setup comes before detail, cause before effect |
| **Preserved meaning** | Never change what the user is saying — only how they're saying it |
| **Appropriate compression** | Collapse repetition, but keep every distinct piece of information |

### Tone and Register

- Match the original register (technical stays technical, casual stays conversational)
- Keep first-person if the original is first-person
- Use the user's domain vocabulary once ambiguities are resolved

---

## Output Format

Deliver:

1. **The cleaned text** — in a clearly demarcated block
2. **A brief editorial note** (one line per item, only if needed) — flagging any choices you made that the user didn't explicitly confirm, so they can catch anything off

Do not explain every edit in detail. Just deliver the clean text. If the user wants to discuss specific choices, they'll ask.

---

## Special Case: Voice Dictation

Voice-dictated text commonly contains:
- Homophones used wrong ("queue/cue/Q", "their/there")
- Technical terms phonetically mangled ("ctbl++", "whitelist" → "white list")
- Run-on sentences with no punctuation
- Repeated correction attempts that never fully resolve

For suspected transcription errors: be **liberal in offering options** and **conservative in assuming** — always ask rather than guess on technical terminology.
