# Code Preservation Protocol — All Projects

> This protocol applies to EVERY project managed from MasterHQ.
> Our code is too valuable to lose. This document defines the backup, redundancy,
> and recovery strategy that MUST be in place for every production project.
>
> **Last updated:** 2026-04-10 (revised for web-only workflow)

---

## Your Workflow: Web-Only

You work entirely through the web — **no local git, no local clones, no PowerShell**.
Everything happens across three places:

- **GitHub** — source of truth, branches, PRs, releases
- **Vercel** — auto-deploys on push, keeps full deploy history
- **Claude Code (agent environment)** — creates branches and commits on your behalf

This is a totally valid workflow. The protection layers below are tuned for it.

---

## Where Code Lives

| Location | What It Holds | Built-in Protection |
|----------|--------------|---------------------|
| **GitHub** | Full git history, every commit ever made | Distributed — any clone is a full backup |
| **Vercel** | Deploy history of every build | Can rollback any build from dashboard |
| **Neon Postgres** | AIG!itch / app databases | Auto-backups: 24hr PITR (free) / 7-day (paid) |
| **MongoDB Atlas** | MasterHQ database (projects, settings, logs) | Auto-snapshots on paid tiers |
| **Vercel Blob** | Videos, images, NFT art, uploads | ⚠️ **NO automatic backup — weakest link** |

**The worst-case scenario we must prevent:** a crashed Claude session, a force-push,
a malicious actor, or a 3am mistake destroys production code with no way back.

---

## Layer 1 — GitHub Branch Protection (MANDATORY)

### The canonical ruleset

Every production repo must have a ruleset named **"Protect Master"** applied to the
default branch (master or main):

| Setting | Value |
|---------|-------|
| Ruleset name | **Protect Master** |
| Target branches | Default branch (= `master`) |
| Bypass list | **Empty** (even you can't bypass) |
| Restrict deletions | ☑️ Enabled |
| Require linear history | ☑️ Enabled |
| Require pull request before merging | ☑️ Enabled |
| → Required approvals | **0** |
| → Dismiss stale PR approvals on new commits | ☑️ Enabled |
| Block force pushes | ☑️ Enabled |

### How to set up (GitHub web UI, ~60 seconds per repo)

1. Go to **GitHub → [repo] → Settings → Rules → Rulesets → New branch ruleset**
2. Name: `Protect Master`
3. Enforcement status: **Active**
4. Target branches: **Include default branch**
5. Bypass list: leave empty
6. Branch rules — tick all of:
   - Restrict deletions
   - Require linear history
   - Require a pull request before merging (approvals: 0, ☑️ dismiss stale)
   - Block force pushes
7. Click **Create**

### Why this specific ruleset
- **0 approvals** — you're a solo dev, so requiring approvers would lock you out.
  The PR itself is the gate; no second person is needed.
- **Dismiss stale approvals** — belt and braces. If approvals ever get set to >0,
  any new commit invalidates them. Prevents sneaking code past review.
- **Empty bypass list** — not even admins can override. The only way past it is
  to edit the ruleset itself, which is a deliberate act.
- **Linear history** — no merge commits, keeps the log readable and rollbacks clean.

### Repos checklist
- [x] `comfybear71/aiglitch` ← protected 2026-04-10
- [ ] `comfybear71/Master` ⚡ highest priority (controls everything else)
- [ ] `comfybear71/budju-xyz` (BUDJU — SPL token data)
- [ ] `comfybear71/mathly`
- [ ] `comfybear71/togogo`
- [ ] `comfybear71/propfolio`
- [ ] `comfybear71/glitch-app` (mobile app)

> Takes ~60 seconds per repo in the GitHub web UI. No local tooling required.
>
> **Direct ruleset-creation links** (for speed):
> - [Master](https://github.com/comfybear71/Master/settings/rules/new?target=branch)
> - [budju-xyz](https://github.com/comfybear71/budju-xyz/settings/rules/new?target=branch)
> - [mathly](https://github.com/comfybear71/mathly/settings/rules/new?target=branch)
> - [togogo](https://github.com/comfybear71/togogo/settings/rules/new?target=branch)
> - [propfolio](https://github.com/comfybear71/propfolio/settings/rules/new?target=branch)
> - [glitch-app](https://github.com/comfybear71/glitch-app/settings/rules/new?target=branch)
>
> **Note on branch name:** some repos may use `main` instead of `master`. The
> "Include default branch" target handles both automatically — just name the
> ruleset accordingly ("Protect Master" or "Protect Main").

---

## Layer 2 — The Web-Only PR Workflow

Now that master is protected, every change goes through a PR. The full daily rhythm:

1. **Claude creates a branch** — `claude/feature-name` off master
2. **Claude pushes commits** — Vercel auto-deploys the branch as a preview URL
3. **Test on the preview URL** — verify the change actually works
4. **Open a PR** on GitHub web → from `claude/feature-name` → `master`
5. **Merge the PR** — approvals are 0 so you can merge immediately
6. **Next session starts a fresh branch** from the updated master

### Rules
- Never let a `claude/*` branch drift for days — merge at natural milestones
- After merging, delete the old claude branch (GitHub offers a button on the PR page)
- If something breaks on the preview URL, fix it on the branch before merging

---

## Layer 3 — Tag Stable Releases (web UI)

Whenever a project hits a known-good state, create a GitHub Release:

1. Go to **[repo] → Releases → Draft a new release**
2. Tag version: `v1.1-2026-04-10` (format: `v<major>.<minor>-<YYYY-MM-DD>`)
3. Target: `master`
4. Title: short description, e.g. "Stable: grant pitch email, mobile UI fixed"
5. Description: what changed since the last release
6. Click **Publish release**

### Why
Tags are **immutable bookmarks**. If everything goes wrong, you can restore master
to that exact state from the release page. GitHub preserves tags indefinitely.

### Cadence
Tag at least weekly, or after any major feature lands. Don't skip weeks — small
tags are cheap.

### Tagged releases
- [x] `comfybear71/aiglitch` → `v1.1-2026-04-10`
- [ ] `comfybear71/Master`
- [ ] `comfybear71/budju-xyz`
- [ ] `comfybear71/mathly`
- [ ] `comfybear71/togogo`
- [ ] `comfybear71/propfolio`
- [ ] `comfybear71/glitch-app`

---

## Layer 4 — Backup Mirror Repo (web-only setup)

You can't run `git push backup` from your iPad. Two web-only options:

### Option A — Fork (simplest, manual updates)
1. Go to `https://github.com/comfybear71/[repo]`
2. Click **Fork** → create as `[repo]-backup` under your account
3. **Settings → Change visibility → Private**
4. Manually sync via the fork's "Sync fork" button after major milestones

**Downside:** forks don't auto-update; you have to remember to sync.

### Option B — GitHub Action auto-mirror (recommended)

A tiny workflow file in each repo that automatically mirrors to the backup repo
on every push. Zero ongoing maintenance.

Create `.github/workflows/mirror-to-backup.yml` in each production repo:

```yaml
name: Mirror to Backup Repo
on:
  push:
    branches: ['**']
    tags: ['**']
  delete:

jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Push to backup
        run: |
          git remote add backup https://x-access-token:${{ secrets.BACKUP_REPO_TOKEN }}@github.com/comfybear71/${{ github.event.repository.name }}-backup.git
          git push backup --all --force
          git push backup --tags --force
```

**Setup per repo:**
1. Create the `-backup` repo (private, empty)
2. Create a fine-grained PAT with write access to the backup repo
3. Add it as a secret named `BACKUP_REPO_TOKEN` in the main repo
4. Commit the workflow file
5. Every future push auto-mirrors

### Backup repos to create
- [ ] `Master-backup`
- [ ] `aiglitch-backup`
- [ ] `budju-xyz-backup`
- [ ] `mathly-backup`
- [ ] `togogo-backup`
- [ ] `propfolio-backup`
- [ ] `glitch-app-backup`

---

## Layer 5 — Second machine clone (OPTIONAL)

You don't NEED a local clone. GitHub has 99.9%+ uptime and replicates everywhere.
But if you want ultimate safety, clone to a second machine — a Windows PC, a cheap
mini PC, a family member's laptop. Git is distributed, so every clone is a full
backup.

**Setup:**
- On the second machine: install Git, run `git clone https://github.com/comfybear71/[repo].git`
- Weekly: open the folder, run `git fetch --all`
- Done. You now have an offline copy that can survive GitHub outages.

**This is a "nice to have", not a "must have" for the web-only workflow.**

---

## Layer 6 — Database backups (paid tiers)

### Neon Postgres (AIG!itch and other apps)
- **Free tier:** 24-hour point-in-time recovery
- **Launch tier ($19/mo):** 7-day PITR ← **upgrade this now**
- **Scale tier:** 14-day PITR + branching

### MongoDB Atlas (MasterHQ)
- **Free tier (M0):** No backups
- **Shared M2/M5:** Daily snapshots, 2-day retention
- **Dedicated M10+:** Continuous backups, full PITR

**Rule:** If a DB holds production data, it MUST be on a paid tier with backups.

### Status
- [ ] Neon AIG!itch → Launch tier ($19/mo) — **do this next**
- [ ] MongoDB MasterHQ → confirm tier & backup retention

---

## Layer 7 — Vercel Blob backup (THE WEAKEST LINK)

Vercel Blob has **no automatic backups**. All our videos, NFT art, logos, and
user-uploaded content live in exactly one place. If the Blob Store is deleted
or corrupted, that content is gone forever.

### Options (pick at least one)

**Option A — Selective weekly download (pragmatic, recommended)**
- Most Blob content can be re-generated (AI videos, generic ad clips)
- Identify the IRREPLACEABLE items: logos, hero videos, best NFT art, brand assets
- Download only those to a Windows PC folder via the Vercel dashboard
- Re-download any new irreplaceable content weekly

**Option B — Automated mirror to Backblaze B2 (set-and-forget)**
- Set up a weekly cron job on MasterHQ that copies Blob → Backblaze B2
  (~$0.005/GB/month) or AWS S3 Glacier (~$0.004/GB/month)
- Add to MasterHQ as a new cron endpoint: `/api/backup/blob-mirror`
- Zero manual work after initial setup

**Option C — Manual full download (simplest but heavy)**
- Once a week, download the entire Blob folder via the Vercel dashboard
- Store the dump on an external drive

---

## The Weekly "Never Lose It" Checklist (web-only)

Every Sunday (or any fixed day), spend 5 minutes per project — all via the web:

- [ ] Confirm any pending PRs are merged to master
- [ ] Create a new GitHub Release (tag) if anything significant shipped this week
- [ ] Verify the backup-mirror GitHub Action ran successfully (check Actions tab)
- [ ] Check Neon / Mongo dashboards — latest backup timestamp looks recent
- [ ] Download any new irreplaceable Blob content to your Windows PC
- [ ] Glance at Vercel deploy history — everything healthy

---

## Crisis Recovery — What to do when things break

### If a bad commit ships to production
1. **Don't panic, don't force-push.** Branch protection already prevents force-push.
2. On GitHub: find the last good commit in the master history
3. Claude opens a PR with a `git revert` of the specific bad commit
4. Merge the revert PR
5. Vercel auto-deploys the fixed master

### If master is destroyed somehow
1. **STOP.** Don't run any more commands or merges.
2. Check the backup mirror repo (`[repo]-backup`) — the Action should have mirrored it
3. Check Vercel deploy history — every deploy is a complete snapshot
4. Check GitHub Releases — each tag is a bookmark you can restore from
5. Restore via the GitHub web UI by creating a new branch from the backup/tag

### If the database is corrupted
1. Neon: use point-in-time recovery from the dashboard (requires paid tier)
2. Mongo Atlas: restore from snapshot
3. Document the incident in `docs/project-safety-protocol.md` incident log

### If Vercel Blob content is lost
1. Check the most recent manual/automated backup dump
2. Re-upload from local archive
3. Re-generate any missing AI content from prompts stored in DB

---

## Adoption Checklist Per Project

When onboarding a new project to MasterHQ, walk through this checklist:

- [ ] Branch protection ruleset "Protect Master" applied
- [ ] First stable release tagged via GitHub Releases
- [ ] Backup mirror repo created (`-backup` private fork)
- [ ] Mirror GitHub Action added and running green
- [ ] Database backups confirmed (paid tier if production data)
- [ ] Blob / object storage backup strategy chosen and running
- [ ] Weekly checklist added to the project's HANDOFF.md recurring tasks
- [ ] Project registered in MasterHQ dashboard

> **Not mandatory:** local clone on a second machine. Optional safety net only.

---

## Current State (as of 2026-04-10)

| Layer | Status |
|-------|--------|
| 1. Branch protection | ✅ AIG!itch, ⏳ 6 more repos (Master, BUDJU, mathly, togogo, propfolio, glitch-app) |
| 2. Web-only PR workflow | ✅ Documented and in use |
| 3. Stable release tags | ✅ AIG!itch `v1.1-2026-04-10`, ⏳ 6 more repos |
| 4. Backup mirror repos | ⏳ Not yet set up |
| 5. Second machine clone | ➖ Optional, not planned |
| 6. Paid database backups | ⏳ Neon upgrade pending |
| 7. Vercel Blob backup | ⏳ Weakest link, strategy TBD |

**Next priorities in order:**
1. Apply branch protection to the remaining 6 repos (~6 min total) — start with Master
2. Upgrade Neon to Launch tier (~2 min online)
3. Set up the auto-mirror GitHub Action for AIG!itch first, then others
4. Decide Blob backup strategy

---

## Why this exists

**2026-04-02 — Togogo incident:** A Claude session did a blanket revert,
deleted 1,798 lines including CLAUDE.md and HANDOFF.md. Production broke.
The only reason we recovered was because Vercel had the previous deploy cached
and we could roll back. Without that, we would have lost work.

**2026-04-10 — Preservation review:** Recognised that our code is now too
valuable to rely on any single source. This document defines the multi-layer
strategy that must be in place for every project going forward.

**2026-04-10 — Revised for web-only workflow:** Removed the local-clone-first
assumptions. The web workflow (GitHub + Vercel + Claude Code agent) is a valid
first-class path and this protocol is tuned for it. Local clones are now
optional, not mandatory.

---

## Related Documents

- `SAFETY-RULES.md` — daily safety rules (sacred files, branch rules, fix spirals)
- `docs/project-safety-protocol.md` — branch protection, crisis response, incident log
- `CLAUDE.md` — project-level instructions and rules
- `HANDOFF.md` — current state and session log
