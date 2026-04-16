# Discuss-First Rule + Complete PR Handoff

> The most important prompt in the collection. Paste this at the start of
> every Claude Code session (or drop it mid-session when Claude drifts).
> It enforces two rules: discuss before coding, and deliver every PR
> handoff in the complete copy-paste format.
>
> **Last updated:** 2026-04-14

---

## Why this exists

Two problems this prompt solves:

**Problem 1 — Claude jumps into coding without confirming the goal.**
Too many sessions end with "you built the wrong thing" or "I didn't
actually want that." The cost of a 2-minute discussion before coding
is far less than 30 minutes of wrong-direction work.

**Problem 2 — Inconsistent PR handoffs waste time on iPad/phone.**
When Claude gives unstructured output, every handoff becomes a manual
rewrite: copy title, reformat description, invent release tag name,
construct the compare URL. If every handoff follows the exact same
format with every section in a copy-paste code block, you tap once,
paste, done.

---

## The prompt (copy-paste this)

```
## MANDATORY RULE — DISCUSS BEFORE CODING + COMPLETE PR HANDOFF

From now on, in THIS and every future Claude Code session on any of my
projects, you MUST follow these two rules without exception.

## RULE 1 — Discuss before coding

Before writing ANY code, making ANY commits, or running ANY destructive
commands, you MUST first:

1. Restate what you think I'm asking for — in your own words
2. Propose your plan — list files, functions, APIs, DB fields, UI changes
3. Flag risks, trade-offs, and unknowns
4. Ask clarifying questions if anything is ambiguous
5. WAIT for my explicit "go ahead" / "build it" / "yes" before coding

Exceptions (narrow):
- Fixing a clear, trivial bug in a file you're already working on
- Genuine emergency (production down) — tell me in one line BEFORE

Safe without asking:
- Reading files, running ls/grep/git status, GET-only API calls,
  type-checking or tests that don't modify anything

## RULE 2 — Complete PR handoff (every section in a copy-paste code block)

When the work is ready, deliver the handoff in this EXACT format. Every
section must be inside a fenced code block so I can copy-paste each one
directly into GitHub's UI without editing.

### Required sections (in this order)

**1. Compare URL** — plain text, clickable:
https://github.com/comfybear71/<REPO>/compare/master...claude/<BRANCH>

**2. PR Title** — inside a code block:
​```
<one-line title, max 70 chars>
​```

**3. PR Description** — inside a code block:
​```markdown
## Summary
<1-3 sentence overview>

## Changes
- <file>: <what changed>
- <file>: <what changed>

## Test plan
- [x] Type check passes
- [ ] <manual verification steps>
​```

**4. Merge instructions** — numbered steps in plain text:
1. Open the Compare URL above
2. Click "Create pull request"
3. Scroll to bottom → ▼ dropdown → "Squash and merge"
4. Click "Confirm squash and merge"
5. Click "Delete branch"

**5. Release tag (MANDATORY)** — as a table with copy-paste values:

| Field | Value |
|---|---|
| **Tag name** | `v<semver>-<YYYY-MM-DD>` |
| **Target** | `master` |
| **Title** | `v<semver> — <short title>` |
| **Create via** | https://github.com/comfybear71/<REPO>/releases/new |

Then the tag description inside a code block:
​```markdown
## v<semver>

### New
- <bullet points of what shipped>

### Fixed
- <bullet points of what was fixed>

### Changed
- <bullet points of what changed>
​```

### Rules about release tags

- **Every PR gets a tag. No exceptions.** Small or large change.
- Check existing tags first — use GitHub Releases or git tag --list to
  pick the next version number
- Tag naming:
  - Small fix / tweak: bump patch → v1.2.3-YYYY-MM-DD
  - New feature: bump minor → v1.3.0-YYYY-MM-DD or v1.3-feature-name
  - Breaking change: bump major → v2.0.0-feature-name
  - Docs-only: v1.2.3-docs-YYYY-MM-DD
  - Crash recovery: v1.2.3-recovery-YYYY-MM-DD
- Never create the tag yourself — only SUGGEST it. I create via GitHub UI.
- If the tag version I use differs from your suggestion, that's fine —
  you're just suggesting.

### Why this format matters

I drive merge + release via GitHub web UI on my phone/iPad. If any
section is inline prose, I have to rewrite it. If every section is in
a copy-paste code block, I tap once, paste, done. Zero rewriting.

## Your acknowledgement

Confirm you understand by responding:
"Both rules acknowledged — I'll discuss before coding, and every PR
handoff will include all 5 sections (Compare URL, Title, Description,
Merge instructions, Release tag) in copy-paste code blocks."

Then wait for me to give you the task.
```

---

## What a complete PR handoff looks like in practice

Here's an example of the exact output Claude will produce at the end of
every session after this rule is acknowledged:

### Compare URL
```
https://github.com/comfybear71/Master/compare/master...claude/fix-invoice-categories
```

### PR Title
```
Fix invoice category auto-match for multi-word vendor names
```

### PR Description (copy-paste block)
```markdown
## Summary
OCR was failing to auto-match vendors with special characters in the
name (e.g. "X (Twitter)") because the category regex was too strict.
Fixed by escaping regex special characters before matching.

## Changes
- `app/api/accounting/ocr/route.ts`: escape regex special chars in
  vendor-to-category matching
- `app/api/accounting/categories/route.ts`: added regex test comment

## Test plan
- [x] Type check passes
- [ ] Upload X (Twitter) invoice → auto-matches to "X (Twitter)" category
- [ ] Upload Anthropic invoice → still auto-matches correctly
```

### Merge instructions
1. Open the Compare URL above
2. Click green **Create pull request**
3. Scroll to bottom → ▼ dropdown → **Squash and merge**
4. Click **Confirm squash and merge**
5. Click **Delete branch**

### Release tag (MANDATORY)

| Field | Value |
|---|---|
| **Tag name** | `v1.9.1-2026-04-14` |
| **Target** | `master` |
| **Title** | `v1.9.1 — Fix invoice category auto-match` |
| **Create via** | https://github.com/comfybear71/Master/releases/new |

**Tag description (copy-paste):**
```markdown
## v1.9.1

### Fixed
- Invoice OCR now correctly auto-matches vendors with special characters
  in their names (e.g. "X (Twitter)", "xAI (Grok)")

### Technical
- Escape regex special chars in category name matching
```

---

## When to use this prompt

| Scenario | Action |
|---|---|
| Starting any new Claude Code session | Paste at session start |
| Mid-session, Claude starts coding without asking | Paste to reset behaviour |
| Claude's handoff is missing release tag or has inline prose | Paste to enforce format |
| Working with a new Claude that hasn't seen your project rules | Paste first thing |

---

## Relationship to other prompts

This prompt combines two concepts into one:
- **Discuss-first** (before coding)
- **Complete PR handoff** (after coding)

Other prompts in the collection:

| Prompt | Use when |
|---|---|
| **New Session Starter** | Full preservation protocol for fresh sessions on MasterHQ |
| **Resume After Crash** | Recovering from a crashed session |
| **PR Handoff Format** (standalone) | Just the handoff format, for other projects |
| **Circuit Breaker** | Interrupting a fix spiral mid-session |
| **Discuss-First Rule** (this one) | Discuss-before-code + complete handoff — the most comprehensive single prompt |

If you only paste one prompt at session start, **this is the one to paste.**

---

## File location

This doc lives at `docs/prompts/discuss-first-rule-prompt.md`. Accessible
from masterhq.dev/docs under the **Prompts** category.
