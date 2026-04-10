# New Session Starter Prompt — All Projects

> Copy-paste this into any new Claude Code session on any of your repos.
> It establishes the preservation protocol rules BEFORE any work begins, so
> you don't have to remember to enforce them manually.
>
> **Last updated:** 2026-04-10 (after the full preservation rollout session)

---

## Why this exists

Every Claude Code session starts fresh with no memory of previous sessions or the
rules we've built. Without a starter prompt, Claude will cheerfully push directly
to master, do blanket reverts, delete sacred files, and ignore branch protection —
because it doesn't know those rules exist until it reads them.

This prompt fixes that. Paste it at the **start of every new session** and Claude
immediately understands the workflow, the safety rules, and what NOT to do.

---

## The universal starter prompt (copy-paste this)

Copy everything between the lines below into your new Claude Code session **before
giving it any task**. Fill in the project name at the top.

---

```
# Session start — read this first before ANY work

## Project
[PROJECT NAME: aiglitch / Master / budju-xyz / mathly / togogo / propfolio / glitch-app]

## Step 1 — Read the sacred files
Before doing anything, please read:
1. `CLAUDE.md` in the repo root (project context, stack, rules)
2. `HANDOFF.md` in the repo root (current state, session log, what's working/broken)
3. `SAFETY-RULES.md` if it exists (universal safety protocol)

If this project has a reference to the Code Preservation Protocol, also read:
https://github.com/comfybear71/Master/blob/master/docs/code-preservation-protocol.md

## Step 2 — Acknowledge the rules
This repo has branch protection ACTIVE on master under the ruleset "Protect Master":
- You CANNOT push directly to master. Ever.
- You CANNOT force-push anything (--force, --force-with-lease, all blocked)
- You CANNOT delete master
- Linear history is enforced — merge commits blocked, squash-merge only
- Required PR approvals = 0 (I can self-merge via GitHub web UI)

## Step 3 — Workflow for this session
1. Create a new branch: `claude/<descriptive-feature-name>` off master
2. Make small, atomic commits (one logical change per commit)
3. Push to the feature branch freely — Vercel will build preview deploys
4. When the work is ready, push one final commit
5. STOP and tell me. I'll open the PR manually via the GitHub web UI, review,
   squash-merge, and delete the branch.
6. You do NOT open PRs, merge PRs, delete branches, or tag releases yourself.
   That's always my job.

## Step 4 — Sacred files (never delete)
- CLAUDE.md
- HANDOFF.md
- SAFETY-RULES.md (if it exists)
- README.md

If you ever want to delete or rewrite one of these, STOP and ask me first.
These have been destroyed by past Claude sessions. It's the #1 rule.

## Step 5 — Fix spiral prevention
- If something breaks, STOP and diagnose before attempting a fix
- If you've made 3 failed fix attempts in a row, STOP and tell me — do not keep
  trying. We'll investigate together.
- NEVER do a "blanket revert" or "reset to a clean state" touching 5+ files. Fix
  surgically, one commit at a time.
- NEVER batch-delete files to "start fresh" — that destroys work.

## Step 6 — Trading and money warnings (if relevant)
If this repo is budju-xyz (trading) or togogo (payment processing, real customers):
- Do NOT modify trading logic, order processing, or payment code without my
  explicit written confirmation
- Branch protection changes, docs updates, and UI fixes are usually fine
- When in doubt, ask before acting

## Step 7 — At end of session
Before we wrap up:
- Push all commits to the feature branch
- Tell me: "Branch ready for PR: claude/<name>, here's a summary of what changed"
- Include a suggested PR title and description
- I'll handle merge, branch delete, and release tagging via GitHub web UI
- Then update HANDOFF.md with today's session log on the next session

## Confirm you've read this
Please acknowledge these rules in your next message, then wait for me to give
you the specific task for this session. Don't start work until I do.
```

---

## Project-specific notes (fill in the blank at the top)

When you paste the prompt above, change `[PROJECT NAME: ...]` to whichever repo
you're working on. Each project has a few unique considerations:

### aiglitch
- AI social platform, 108 personas, Expo/EAS for mobile components
- Production: aiglitch.app (Vercel)
- Neon Postgres (Launch tier, 7-day PITR active)
- Vercel Blob: aiglitch-media (automated weekly backup to R2)
- Trading? No, but do not break the cron jobs or spreading system
- Default branch: `master`

### Master (this repo — MasterHQ)
- Command & control platform for all projects
- Production: masterhq.dev
- MongoDB Atlas (settings, projects, logs, outreach)
- Has the preservation protocol + admin tools
- Default branch: `master`

### budju-xyz
- **TRADING BOT — EXTRA CAUTION** ⚠️
- Solana SPL token ecosystem, live money, real trades on DigitalOcean droplet
- NEVER modify trading logic without explicit written confirmation from me
- Branch protection changes, UI fixes, docs — usually fine
- **If in doubt, ASK**
- Default branch: `master`

### mathly
- Duolingo-for-math PWA, early stage
- Neon Postgres, NextAuth, Stripe
- Production: mathly.space
- Default branch: `master`

### togogo
- **E-COMMERCE — REAL CUSTOMERS, REAL MONEY** ⚠️
- Stripe payments, AliExpress dropshipping, customer data in DB
- Never wipe the database, never touch payment logic casually
- Has been damaged by 8 past Claude sessions — extra discipline required
- Production: togogo.me
- Vercel production branch MUST be `master` (was set to feature branch previously — Rule #12 violation, fixed 2026-04-10)
- Default branch: `master`

### propfolio
- AI property portfolio tool
- Production: propfolio.work
- Contains propfolio-docs Blob Store with **private personal documents** (payslips,
  bank statements, birth certificate). Do NOT expose, do NOT delete.
- Default branch: `master`

### glitch-app
- AIG!itch mobile app (Expo / EAS Build)
- Production = TestFlight / App Store (decoupled from git)
- Merging to master does NOT affect live users — only `eas build + submit` does
- Default branch: `master`

---

## Quick reference — your workflow for every session

```
1. Open Claude Code on the project
2. Paste the starter prompt (filled in with project name)
3. Claude reads CLAUDE.md + HANDOFF.md + acknowledges rules
4. You give it the task
5. Claude creates claude/<feature> branch, commits, pushes
6. You open PR on GitHub web UI → Squash-merge → Delete branch
7. If stable milestone → tag a release on GitHub Releases page
8. Update HANDOFF.md with session log entry (can be done in the same PR
   or a follow-up)
```

---

## Cheat sheet — what Claude CAN and CANNOT do

| Action | Claude can? | Who does it? |
|---|---|---|
| Create feature branch | ✅ Yes | Claude |
| Make commits | ✅ Yes | Claude |
| Push to feature branch | ✅ Yes | Claude |
| Read CLAUDE.md / HANDOFF.md | ✅ Yes | Claude |
| Update CLAUDE.md / HANDOFF.md (via PR) | ✅ Yes | Claude, you merge |
| Run tests / type checks | ✅ Yes | Claude |
| Open a PR | ❌ No | **You (web UI)** |
| Squash-merge a PR | ❌ No | **You (web UI)** |
| Delete a merged branch | ❌ No | **You (web UI)** |
| Tag a release | ❌ No | **You (web UI)** |
| Push directly to master | 🚫 **Forbidden** | Nobody (blocked by branch protection) |
| Force push anything | 🚫 **Forbidden** | Nobody |
| Delete CLAUDE.md / HANDOFF.md | 🚫 **Forbidden** | Nobody ever |
| Blanket-revert 5+ files | 🚫 **Forbidden** | Nobody |
| Modify trading logic (budju-xyz) | 🚫 **Only with explicit confirmation** | Nobody by default |

---

## When Claude forgets the rules mid-session

Sometimes during a long session, Claude will drift from the workflow. If you see
Claude trying to:
- Push to master directly
- Suggest a "clean slate" refactor touching dozens of files
- Delete CLAUDE.md or HANDOFF.md
- Retry a failing command for the 4th time
- Say "sorry" more than twice in a row

...paste this reminder:

```
STOP. Please re-read the session starter rules:
- No direct master pushes
- No fix spirals (stop at 3 attempts)
- Sacred files stay sacred
- Work on a branch, I merge via web UI
- Tell me what's wrong, don't try to fix everything at once

What's the actual current state, and what are you trying to do?
```

---

## Related documents

- `docs/code-preservation-protocol.md` — the full 7-layer backup and safety strategy
- `docs/project-safety-protocol.md` — branch protection, crisis response, incident log
- `SAFETY-RULES.md` — universal safety header for every project
- `CLAUDE.md` — per-project context and instructions
- `HANDOFF.md` — current state and session log

---

## File location

This doc lives at `docs/prompts/starter-prompt.md`. Future prompts should go
in the same `docs/prompts/` folder and be registered in `app/docs/page.tsx`
under `category: "prompts"`.
