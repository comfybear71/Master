# Circuit Breaker Prompt — Stop a Fix Spiral in Progress

> Paste this into a Claude Code session when you see it entering a fix
> spiral (same bug, 3+ failed attempts, "let me just try one more thing").
> This prompt INTERRUPTS the spiral and forces Claude to stop writing
> code and report state instead.
>
> **Last updated:** 2026-04-10

---

## When to use this

| Warning sign | Action |
|---|---|
| Claude says "let me just try one more thing" | Paste this prompt NOW |
| Same file edited 3+ times in a row for the same bug | Paste this prompt |
| Claude says "sorry, that didn't work, let me..." | Paste this prompt |
| Build keeps failing after each "fix" | Paste this prompt |
| Claude apologizes more than twice in a row | Paste this prompt |
| Session has been on the same bug for 30+ minutes | Paste this prompt |

---

## The circuit breaker prompt (copy-paste this)

```
## 🛑 CIRCUIT BREAKER — I think you're in a fix spiral

STOP writing code. Before your next message, answer these questions:

1. What was the ORIGINAL task I gave you?
2. How many times have you tried to fix something that didn't work?
   Count honestly — each code change that didn't solve the problem
   counts as 1 attempt.
3. Are you past attempt 3?
4. Is the codebase in a BETTER or WORSE state than when we started?
5. What's the actual error right now? (paste it, don't summarize)

If you're at 3+ attempts: output the 🛑 FIX SPIRAL STOPPED template
below and hand back to me.

If you're under 3 attempts: continue, but COUNT OUT LOUD from now on.
Type "FIX ATTEMPT [N] OF 3" before every fix.

Do NOT write any code in this message. Only answer the 5 questions.
```

---

## The FIX SPIRAL STOPPED template

If Claude confirms it's at 3+ attempts, it should output this exact
template (it's also in the starter prompt rules, but pasting it here
reinforces it):

```
---
## 🛑 FIX SPIRAL STOPPED — 3 ATTEMPTS EXHAUSTED

**What I was trying to fix:** [description]
**What I tried:**
1. Attempt 1: [what I did] → [what happened]
2. Attempt 2: [what I did] → [what happened]
3. Attempt 3: [what I did] → [what happened]

**What I think the real issue is:** [honest assessment]
**What I don't know:** [gaps in understanding]
**What the next session should check before writing any code:**
- [specific diagnostic steps]

I am now STOPPED. I will not attempt another fix unless you
explicitly tell me to continue with a specific approach.
---
```

---

## Shorter reinforcement snippets

Sometimes you don't need the full circuit breaker prompt. Paste
one of these shorter versions instead:

### "You forgot to count"
```
You forgot to count. What attempt number is this? If it's 3+, STOP
and output the fix spiral stopped template.
```

### "Stop and report"
```
STOP. No more code. Tell me:
1. How many fix attempts so far?
2. What's the actual current error?
3. What do you think the real root cause is?
```

### "Are we making progress?"
```
Before your next fix attempt, answer honestly: is the codebase in a
better or worse state than when we started this task? If worse, STOP.
```

### "Start fresh next session"
```
Stop. We're going to end this session here. Please give me the PR
handoff package for whatever IS working, and list the unresolved
issue as a known bug in the PR description. The next session will
tackle it with fresh eyes.
```

---

## Why this exists

From a real incident on 2026-04-10 — a Claude session on a project
burned through 10+ fix attempts on the same issue. When asked why it
didn't stop at 3, it said:

> "I kept believing each fix was trivial — 'just move the try/catch
> inside the loop' or 'just bump a label'. Each one felt like it would
> definitely work, so I treated it as a new simple task instead of
> recognizing it was attempt 4 of the same failed task."

The fix-spiral counting rule exists because Claude will ALWAYS think
"this next one will definitely work." Counting out loud is the only
reliable way to force Claude to notice the counter ticking up. And
this circuit breaker prompt is the user's last line of defense when
the counting fails.

---

## Effectiveness of each defense layer

| Defense | Effectiveness | Why |
|---|---|---|
| Rules in the starter prompt | ~60% | Claude reads them but drifts under pressure |
| **Counting out loud** | **~85%** | Forces Claude to notice the counter |
| **Circuit breaker prompt** (this) | **~95%** | Direct human intervention stops the spiral |
| Starting a fresh session | 100% | Nuclear option — new Claude, clean context |

No single layer is enough. The combination of all four is the best
defense available.

---

## Related documents

- `docs/prompts/starter-prompt.md` — full session starter (includes the
  counting rule in the fix-spiral prevention section)
- `docs/prompts/resume-after-crash-prompt.md` — recovery template
  (extra emphasis on fix-spiral prevention during crash recovery)
- `docs/prompts/pr-handoff-format-prompt.md` — the handoff format rule
- `docs/code-preservation-protocol.md` — the full 7-layer backup strategy

---

## File location

This doc lives at `docs/prompts/circuit-breaker-prompt.md`. It's part of
the `docs/prompts/` collection, accessible via masterhq.dev/docs under
the **Prompts** category.
