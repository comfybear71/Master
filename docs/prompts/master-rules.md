# Master Rules — All Projects

> **One URL to rule them all.** Paste this into any Claude Code session:
> `https://raw.githubusercontent.com/comfybear71/Master/master/docs/prompts/master-rules.md`
>
> Or just paste the line:
> `Before doing anything, read and follow ALL rules at: https://raw.githubusercontent.com/comfybear71/Master/master/docs/prompts/master-rules.md — acknowledge each section before proceeding.`

---

## RULE 1 — Discuss before coding

Before writing ANY code, making ANY commits, or running ANY destructive commands:

1. **Restate** what you think I'm asking for — in your own words
2. **Propose your plan** — list files, functions, APIs, DB fields, UI changes
3. **Flag risks** — what could break? what assumptions are you making?
4. **Ask clarifying questions** if anything is ambiguous — don't guess
5. **WAIT** for my explicit "go ahead" / "build it" / "yes" before writing code

**Safe without asking:** reading files, ls/grep/git status, GET-only API calls, type-checks, tests that don't modify anything.

**Exceptions:** trivial bug fix in a file you're already editing, or genuine emergency (tell me in one line BEFORE acting).

---

## RULE 2 — Sacred files (NEVER delete)

- `CLAUDE.md`
- `HANDOFF.md`
- `SAFETY-RULES.md`
- `README.md`

If you want to modify these, ask first. If a previous Claude deleted or corrupted them, STOP and tell me — we restore from a previous commit, NOT from memory.

---

## RULE 3 — Branch protection is ACTIVE on master

All 8 repos have branch protection under the "Protect Master" ruleset:

- You **CANNOT** push directly to master. Ever.
- You **CANNOT** force-push anything.
- You **CANNOT** delete master.
- Linear history is enforced — squash-merge only, no merge commits.
- Required PR approvals = 0 (I can self-merge).

**Workflow:**
1. Create a new branch: `claude/<feature-name>` off master
2. Make small, atomic commits
3. Push to the feature branch freely
4. **STOP and tell me when ready.** I open the PR, squash-merge, delete the branch, and tag the release via the GitHub web UI.
5. You do **NOT** open PRs, merge PRs, delete branches, or tag releases yourself. That's always my job.

---

## RULE 4 — Fix-spiral prevention (MANDATORY COUNTING)

When fixing a bug or error, you MUST count every attempt out loud:

1. Type this header BEFORE each fix attempt:
   `## FIX ATTEMPT [N] OF 3: [what I'm trying]`

2. At attempt 3, include a warning:
   `## FIX ATTEMPT 3 OF 3 (FINAL): [what I'm trying]`
   `⚠️ This is my last attempt.`

3. **After attempt 3 fails, STOP.** Output this template:

```
## 🛑 FIX SPIRAL STOPPED — 3 ATTEMPTS EXHAUSTED

**What I was trying to fix:** [description]
**What I tried:**
1. Attempt 1: [what] → [result]
2. Attempt 2: [what] → [result]
3. Attempt 3: [what] → [result]

**What I think the real issue is:** [assessment]
**What I don't know:** [gaps]
**What the next session should check:** [steps]

I am now STOPPED. I will not attempt another fix unless you
explicitly tell me to continue with a specific approach.
```

4. Do **NOT** restart the counter for the same underlying task.
5. "Each fix felt trivial" is **NOT** an excuse to skip counting.

**Counter scope (added 2026-04-18):** Count per UNDERLYING ISSUE, not per symptom. If `npm install` fails on a version pin, you fix the pin, install succeeds, but lint now fails — that's a **NEW** counter, because the underlying issue (lint compatibility) is different from the first (version resolution). Legitimate progress resets the counter. Chasing the same error through 3 different surface changes does NOT — same issue, still attempt 3.

---

## RULE 5 — Complete PR handoff format (MANDATORY)

When work is ready, deliver the handoff in this EXACT format. Every section must be in a copy-paste code block so I can paste directly into GitHub's UI.

**Required sections (in this order):**

### 1. Compare URL
Plain text, clickable:
`https://github.com/comfybear71/<REPO>/compare/master...claude/<BRANCH>`

### 2. PR Title
Inside a code block:
```
<one-line title, max 70 chars>
```

### 3. PR Description
Inside a markdown code block:
```markdown
## Summary
<1-3 sentence overview>

## Changes
- <file>: <what changed>

## Test plan
- [x] Type check passes
- [ ] <manual verification steps>
```

### 4. Merge instructions
1. Open the Compare URL above
2. Click "Create pull request"
3. Scroll to bottom → ▼ dropdown → "Squash and merge"
4. Click "Confirm squash and merge"
5. Click "Delete branch"

### 5. Release tag (MANDATORY)
As a table:

| Field | Value |
|---|---|
| **Tag name** | `v<semver>-<YYYY-MM-DD>` |
| **Target** | `master` |
| **Title** | `v<semver> — <short title>` |
| **Create via** | `https://github.com/comfybear71/<REPO>/releases/new` |

Then the tag description inside a code block:
```markdown
## v<semver>

### New
- <what shipped>

### Fixed
- <what was fixed>
```

**Rules about release tags:**
- Every PR gets a tag. No exceptions. Small or large change.
- Check existing tags first (`git tag --list` or GitHub Releases page).
- Never create the tag yourself — only suggest it. I create via GitHub UI.

**Release tag schema (confirmed 2026-04-18, battle-tested across 12 tags):**

| Change type | Bump | Example |
|---|---|---|
| Patch / docs / tooling | `vX.Y.Z+1` | `v0.3.0` → `v0.3.1` |
| New endpoint or feature | `vX.Y+1.0` | `v0.3.1` → `v0.4.0` |
| Breaking API change | `vX+1.0.0` | `v0.4.0` → `v1.0.0` |
| Docs-only | suffix `-docs` | `v1.2.3-docs-YYYY-MM-DD` |
| Crash recovery | suffix `-recovery` | `v1.2.3-recovery-YYYY-MM-DD` |

- **Date suffix ALWAYS appended:** `vX.Y.Z-YYYY-MM-DD`
- **Tag title format:** `vX.Y.Z — <one-line change summary>`

---

## RULE 6 — Trading projects (BUDJU) — extra caution

If working on `budju-xyz` or any trading-related code:
- Do **NOT** modify trading logic, order processing, or wallet code without my explicit written confirmation.
- Branch protection and docs changes are fine.
- When in doubt, **ASK**.

---

## RULE 7 — When something breaks

- **STOP** and diagnose before fixing.
- **NEVER** do a blanket revert touching 5+ files.
- **NEVER** batch-delete files to "start fresh."
- If 3+ failed fix attempts, output the FIX SPIRAL STOPPED template (Rule 4).
- Small, atomic commits only — one logical change per commit.

---

## RULE 8 — End of session

Before wrapping up:
- Push all commits to the feature branch.
- Deliver the complete PR handoff (Rule 5) with all 5 sections.
- Include the release tag suggestion.
- Wait for me to merge via GitHub web UI.
- Next session: update HANDOFF.md with session log.

---

## RULE 9 — Slice-by-slice migrations (added 2026-04-18)

When porting a substantial endpoint or module from one repo to another:

1. **Split by orthogonal variant** (URL params, pagination modes, response shapes) into independent slices.
2. **Each slice = its own branch, its own PR, its own release tag.**
3. **Unmigrated variants return `501 mode_not_yet_migrated`** with the exact param name that wasn't handled — consumers see an honest signal, not silent drift.
4. **Write a verify harness early** (shape + set match against the legacy endpoint) and run it after every slice lands.
5. **Only flip the consumer** after all slices are shipped and verified.

This keeps PR diffs small, makes rollback per-slice, and turns "migrate an endpoint" from a scary monolith into a series of 30-60 minute jobs.

**Battle-tested:** 10 sessions, 12 tags, 74 tests, zero downtime on `aiglitch-api` migration (2026-04-18).

---

## RULE 10 — Strangler config lives in the new repo (added 2026-04-18)

When migrating from a legacy backend to a new one, choose between:
- **(a)** Stand up a dedicated proxy project, or
- **(b)** Use the new-backend project itself as the strangler ← **PREFER THIS**

**How:** Add a `fallback` rewrite in the new repo's `next.config.ts` that forwards unmatched `/api/*` paths to the legacy origin. Point the public subdomain (e.g. `api.example.com`) at the new project.

**Result:** As endpoints migrate, they add a local route and automatically stop falling through. Zero proxy-config maintenance per endpoint.

**Critical detail for Next.js:** Use `beforeFiles` for strangler rewrites so the rewrite takes precedence. Default (`afterFiles`) means your local `/api/feed` wins even when you wanted the rewrite.

---

## RULE 11 — Sandbox network boundary (added 2026-04-18)

Claude's sandbox **cannot reach external HTTP URLs** from its environment.

- Any verification that requires hitting a live domain (deployed app, external API) must be run **BY THE USER** on their machine (local terminal, Codespace, or browser).
- Write the verification scripts and commit them; do not try to run them yourself.
- When a script fails with 403 on every URL, that's the sandbox — not a real bug. Don't debug it; hand it to the user.

---

## RULE 12 — Cross-repo handoffs (added 2026-04-18)

When work on one repo requires coordinated changes in another repo that Claude doesn't have access to:

Deliver a **self-contained brief** the user can paste into the sibling Claude session. The brief MUST include:

- **(a)** What changed in THIS repo
- **(b)** What the sibling repo owns vs what the migrated repo owns
- **(c)** Off-limits areas (don't touch these)
- **(d)** Rollback path (how to back out if the sibling change breaks something)

Do not assume the sibling session has context from this one. It doesn't.

---

## Known Gotchas (appendix)

Not rules — just facts that save 30 minutes of debugging next time:

- **`tsconfig.json` is modified by `next build`** on every run (`jsx preserve → react-jsx`, adds `.next/dev/types` to include). Commit the modified version once; future reminders are safe to ignore unless the actual contents changed.
- **Vercel strips `s-maxage` and `stale-while-revalidate`** from `Cache-Control` before sending downstream. Client sees just `public`. Edge caching still works. Documented Vercel behaviour, not a bug.
- **Vercel fallback 403s all non-whitelisted origins.** If new deployments 403 for no apparent reason, check project domain bindings first.
- **Next.js frontend strangler rewrites:** use `beforeFiles` so the rewrite takes precedence over local route files (see Rule 10).

---

## Your acknowledgement

After reading these rules, respond with:

"All 12 rules acknowledged. I'll discuss before coding, count fix attempts out loud (per underlying issue), deliver complete PR handoffs with release tags, slice migrations into orthogonal variants, respect the sandbox network boundary, and never delete sacred files. Waiting for your task."

Then wait for me to give you the specific task for this session.

---

## Reference

These rules are maintained in the MasterHQ repo:
- Full prompts collection: `docs/prompts/` (5 prompts with examples)
- Code Preservation Protocol: `docs/code-preservation-protocol.md`
- Safety Rules: `SAFETY-RULES.md`
- Project context: `CLAUDE.md` + `HANDOFF.md` in each repo

**Owner:** Stuart French (comfybear71) — solo developer, works from iPad/phone, drives merges via GitHub web UI.
