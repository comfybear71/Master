# Resume After Crash Prompt — All Projects

> Copy-paste this into a new Claude Code session when the previous Claude
> session crashed mid-task and you need to pick up where it left off.
> It's different from the starter prompt because the new Claude needs
> to understand it's continuing existing work, NOT starting fresh.
>
> **Last updated:** 2026-04-10

---

## Why this is different from the starter prompt

The **starter prompt** is for starting a completely fresh task: new branch,
new feature, no prior state. Claude starts from zero.

The **resume prompt** is for the moment when a Claude session crashes or
gets disconnected mid-task and you need a new Claude to continue the work
without breaking anything already in progress.

**This is the highest-risk scenario** for Claude sessions, because:

1. The previous Claude may have been mid-fix-spiral when it crashed
2. There may be uncommitted changes, half-finished commits, or a branch in
   an unclean state
3. The new Claude has no memory of what was being attempted
4. The new Claude may make assumptions and "clean up" something important
5. The new Claude may restart the fix spiral that caused the crash in the
   first place

The resume prompt protects against all of this by forcing the new Claude to
**STOP and orient itself** before touching anything.

---

## The resume-after-crash prompt (copy-paste this)

Paste this into the new Claude Code session **before** giving it any further
instructions. Fill in the project name and a brief summary of what was being
worked on.

---

```
# RESUME AFTER CRASH — read this first before ANY action

The previous Claude Code session on this project crashed or disconnected.
You are picking up mid-task. DO NOT assume anything about the state of the
repo. DO NOT make any changes until you've completed Steps 1-4 below.

## Project
[PROJECT NAME: aiglitch / Master / budju-xyz / mathly / togogo / propfolio / glitch-app]

## What the previous session was working on (my summary)
[BRIEF DESCRIPTION from me — what the previous Claude was trying to do,
roughly how far it got, and whether it was in a fix spiral when it crashed.
Example: "Adding a new persona category 'Time Travelers' to AIG!itch.
Previous Claude had created the branch claude/time-travelers-abc123 and
committed the schema + 2 of 5 personas. Was mid-way through persona #3
when it crashed."]

## Step 1 — Read the sacred files (MANDATORY)
Before doing anything:
1. Read CLAUDE.md in the repo root (project context, rules)
2. Read HANDOFF.md in the repo root (what's working, what's broken,
   session log)
3. Read SAFETY-RULES.md if it exists
4. Full preservation protocol:
   https://github.com/comfybear71/Master/blob/master/docs/code-preservation-protocol.md

## Step 2 — Orient yourself to the current git state (MANDATORY)
Run these commands in order and report the output back to me:

1. `git branch --show-current` — what branch are we on?
2. `git status` — are there uncommitted changes? staged files? untracked files?
3. `git log --oneline -10` — what are the last 10 commits?
4. `git log master..HEAD --oneline` — what commits are on this branch
   that aren't on master yet?
5. `git diff master..HEAD --stat` — what files does this branch change
   and by how much?

Report all 5 outputs verbatim. Do NOT interpret yet — just show me.

## Step 3 — Wait for my confirmation before any action
Once you've shown me the git state, STOP and wait. I will:
1. Confirm whether the branch state matches what I remember
2. Tell you whether the previous Claude was mid-fix-spiral (if yes,
   we approach differently — we stop, revert, not continue forward)
3. Give you the exact next step

DO NOT:
- Commit anything
- Delete any files
- Attempt to "clean up" the working tree
- Try to continue the previous task on your own
- Assume the previous Claude's work was correct
- Revert anything (especially not blanket reverts)
- Force-push anything (it's blocked by branch protection anyway)

## Step 4 — Branch protection is ACTIVE on master
Same rules as any other session on this repo:
- You CANNOT push directly to master. Ever.
- You CANNOT force-push anything
- You CANNOT delete master
- Linear history is enforced — squash-merge only
- Required PR approvals = 0 (I self-merge via GitHub web UI)

Even in recovery mode, these rules are absolute.

## Step 5 — Sacred files (NEVER delete, especially during recovery)
- CLAUDE.md
- HANDOFF.md
- SAFETY-RULES.md
- README.md

If the previous Claude deleted or corrupted any of these, STOP immediately
and tell me. We restore from a previous commit. We do NOT rewrite them
from memory.

## Step 6 — Fix spiral prevention (extra emphasis during recovery)
Crashes often happen DURING fix spirals. If I tell you the previous Claude
was in a fix spiral when it crashed:
- The correct move is usually to REVERT, not continue forward
- DO NOT attempt the same fix that caused the crash
- DO NOT try 3+ alternative fixes in a row
- If the first 1-2 careful attempts don't work, STOP and tell me. We
  diagnose together before any further action.

## Step 7 — Recovery workflow
Once I've confirmed state and given you the next step:
1. Work on the existing feature branch (do NOT create a new one unless
   I tell you to)
2. Small, atomic commits as usual
3. Push when ready — I'll handle the PR + squash-merge via web UI

If the existing branch is unsalvageable, I'll tell you to:
- Create a new branch from master with a different name (e.g.
  `claude/recovery-<feature>-<date>`)
- Cherry-pick or re-create the good commits from the broken branch
- Abandon the broken branch (I'll delete it via web UI later)

## Step 8 — Acknowledge and show me the git state
Please acknowledge these rules, then immediately run the 5 git commands
from Step 2 and paste the output. Do NOT take any other action until
I've confirmed the state and given you the next step.
```

---

## Usage tips

### Filling in the "what the previous session was working on" block

The more context you give the new Claude about what the previous session
was trying to do, the safer the recovery will be. Include:

- **The task:** what feature/fix was being attempted
- **The branch name:** if you know it
- **How far it got:** schema + 2 of 5 personas? API route written but UI
  not started? Build passing or broken?
- **Whether it was a fix spiral:** if the previous Claude was stuck in
  "trying to fix a bug that kept getting worse", SAY SO. That changes
  the recovery strategy from "continue forward" to "revert and restart
  the fix carefully."
- **Any error messages you remember** from the crash

If you don't remember any of this, just say so:
> "I don't remember what the previous Claude was working on — please
> figure it out from the git state and HANDOFF.md, then tell me what
> you think was happening before we continue."

### When the crash happens mid-file-edit

If the previous Claude was in the middle of editing a file when it
crashed, `git status` will show uncommitted changes. The new Claude
should:

1. Report those changes to you
2. NOT stash, commit, or discard them without your instruction
3. Wait for you to decide whether to keep, discard, or review them

### When you see uncommitted changes in Step 2

Common options:
- **Review them** — "Show me the diff, I'll decide"
- **Commit them** — "Commit those changes as 'WIP before crash recovery'"
- **Discard them** — "Discard those changes, we'll redo that work from
  scratch" (be careful — make sure you actually want to lose them)
- **Stash them** — "Stash those changes, I want to keep them around in
  case we need them later"

---

## Concrete example

Here's a real example of how you'd use this prompt. Say budju-xyz's Claude
crashed while adding a new ML feature. You'd paste:

```
# RESUME AFTER CRASH — read this first before ANY action
[...the full prompt above...]

## Project
budju-xyz

## What the previous session was working on (my summary)
Adding a new XGBoost feature to the ML signal classifier. Previous Claude
was working on the feature extraction function in vps/ml/train.py and had
committed the first version that crashed on NaN values. Was attempting
to add NaN handling when the session disconnected. The bot is still
running fine on the production droplet — the branch work is isolated
and has not been merged. I don't think there was a fix spiral, the
disconnect was just a network issue.

## Branch
claude/ml-feature-engineering-X9Zq
```

The new Claude reads this, runs the 5 git commands, reports state,
then you confirm whether to continue forward or back up.

---

## Related documents

- `docs/prompts/starter-prompt.md` — the fresh-session starter (different use case)
- `docs/code-preservation-protocol.md` — the full 7-layer backup strategy
- `docs/project-safety-protocol.md` — branch protection, crisis response, incident log
- `SAFETY-RULES.md` — universal safety header for every project

---

## File location

This doc lives at `docs/prompts/resume-after-crash-prompt.md`. Future prompts
should go in the same `docs/prompts/` folder and be registered in
`app/docs/page.tsx` under `category: "prompts"`.
