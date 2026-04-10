# Code Preservation Protocol — All Projects

> This protocol applies to EVERY project managed from MasterHQ.
> Our code is too valuable to lose. This document defines the backup, redundancy,
> and recovery strategy that MUST be in place for every production project.
>
> **Last updated:** 2026-04-10

---

## The Problem

Code lives in 4 places right now:

| Location | What It Holds | Built-in Protection |
|----------|--------------|---------------------|
| **GitHub** | Full git history, every commit ever made | Distributed — every clone is a full backup |
| **Vercel** | Deploy history of every build | Can rollback any build from dashboard |
| **Neon Postgres** | App database (AIG!itch, etc.) | Auto-backups: 24hr PITR (free) / 7-day (paid) |
| **MongoDB Atlas** | MasterHQ database (projects, settings, logs) | Auto-snapshots on paid tiers |
| **Vercel Blob** | Videos, images, NFT art, uploads | ⚠️ **NO automatic backup — weakest link** |

**The worst-case scenario we must prevent:** a crashed Claude session, a force-push,
a malicious actor, or a 3am mistake destroys production code with no way back.

---

## Layer 1 — Branch Protection (MANDATORY, 5 minutes per repo)

### What to do
Go to **GitHub → [repo] → Settings → Branches → Add rule** for every production repo:

- **Branch name pattern:** `master` (or `main`)
- ✅ Require a pull request before merging
- ✅ Require linear history
- ✅ Do not allow force pushes
- ✅ Do not allow deletions
- ✅ Include administrators (so even YOU can't accidentally nuke it)

### Why
Nothing — not a crashed Claude, not you at 3am, not a malicious actor — can destroy
master. The absolute worst case becomes "revert a bad commit" which is always recoverable.

### Repos that need this applied
- [x] `comfybear71/Master`
- [ ] `comfybear71/aiglitch`
- [ ] `comfybear71/togogo`
- [ ] `comfybear71/mathly`
- [ ] `comfybear71/budju-xyz`
- [ ] `comfybear71/AFL-EDGE`
- [ ] `comfybear71/glitch-app`

---

## Layer 2 — Merge to master frequently

### The bad pattern
Work on a `claude/*` branch for days → crash → lose work.

### The good pattern
- Create a new `claude/*` branch from master at the start of each session
- Merge to master at natural milestones, not just when things crash
- After merging, delete the old claude branch and start a fresh one next session
- Claude branches are scratch pads — master is the source of truth

### Daily rhythm
1. **Morning:** Create new branch `claude/<feature>-<date>` from master
2. **Day:** Work, commit often (small atomic commits)
3. **End of day:** If stable, merge to master via PR. Tomorrow starts fresh.

---

## Layer 3 — Tag stable releases

Whenever a project hits a known-good state, tag it:

```bash
git tag -a v1.0-2026-04-10 -m "Stable: all channels working, spec ads fixed"
git push origin v1.0-2026-04-10
```

Tags are **immutable bookmarks**. If everything goes wrong, `git checkout v1.0-2026-04-10`
gets you back to that exact state. Tag at least weekly, or after any major feature lands.

### Naming convention
`v<major>.<minor>-<YYYY-MM-DD>` — e.g. `v1.2-2026-04-10`

---

## Layer 4 — Second GitHub remote (backup mirror)

Create a private mirror repo (e.g. `comfybear71/aiglitch-backup`) for every production
repo, then add it as a second remote:

```bash
git remote add backup https://github.com/comfybear71/<repo>-backup.git
git push backup master
git push backup --all
git push backup --tags
```

Even if the main repo is corrupted, deleted, or hijacked, the backup mirror has
everything. Run `git push backup --all && git push backup --tags` **weekly**.

### Backup repos to create
- [ ] `Master-backup`
- [ ] `aiglitch-backup`
- [ ] `togogo-backup`
- [ ] `budju-xyz-backup`

---

## Layer 5 — Local clones on multiple machines

Git is distributed — **every clone is a complete backup**. Maintain clones on:

- Primary dev machine (the droplet / laptop you use daily)
- Secondary machine (Windows PC, family member's laptop, external SSD)
- Optional: cold storage (external drive in a drawer)

Run `git fetch --all` on each clone weekly to keep them current.

---

## Layer 6 — Upgrade database backups

### Neon Postgres (AIG!itch)
- **Free tier:** 24-hour point-in-time recovery
- **Launch tier ($19/mo):** 7-day PITR ← **worth it for production apps**
- **Scale tier:** 14-day PITR + branching

### MongoDB Atlas (MasterHQ)
- **Free tier (M0):** No backups
- **Shared M2/M5:** Daily snapshots, 2-day retention
- **Dedicated M10+:** Continuous backups, full PITR

**Rule:** If a DB holds production data, it must be on a paid tier with backups.

---

## Layer 7 — Vercel Blob backup (THE WEAKEST LINK)

Vercel Blob has **no automatic backups**. All our videos, NFT art, logos, and
user-uploaded content live in exactly one place. If the Blob Store is deleted
or corrupted, that content is gone forever.

### Options (pick at least one)

**Option A — Manual weekly download (simplest)**
- Once a week, download the entire Blob folder via the Vercel dashboard
- Store the dump on an external drive
- Zero cost, zero automation, low maintenance

**Option B — Automated mirror to cheap object storage**
- Set up a weekly cron job that copies Blob → Backblaze B2 (~$0.005/GB/month)
  or AWS S3 Glacier (~$0.004/GB/month)
- Set-and-forget
- Add to MasterHQ as a new cron endpoint: `/api/backup/blob-mirror`

**Option C — Selective download (pragmatic)**
- Most content can be re-generated (AI videos, generic ad clips)
- Identify the IRREPLACEABLE items: logos, hero videos, best NFT art, brand assets
- Download only those to a local archive folder
- Re-download any new irreplaceable content weekly

---

## The Weekly "Never Lose It" Checklist

Every Sunday (or any fixed day), spend 5 minutes per project:

- [ ] `git push origin --all` — make sure everything is on main GitHub
- [ ] `git push origin --tags` — push any new tags
- [ ] `git push backup --all && git push backup --tags` — mirror to backup remote
- [ ] `git fetch --all` on every local clone
- [ ] Tag a stable release if the project is in a good state
- [ ] Download any irreplaceable new Blob content
- [ ] Verify database backup is recent (Neon / Mongo dashboard)

---

## Crisis Recovery — What to do when things break

### If a bad commit ships to production
1. **Don't panic, don't force-push.** Branch protection should have stopped this anyway.
2. Find the last good commit: `git log --oneline -20`
3. Revert the specific bad commit: `git revert <bad-sha>`
4. Push via PR to master
5. Vercel auto-deploys the revert

### If master is destroyed somehow
1. **STOP.** Don't run any more commands.
2. Check backup remote: `git fetch backup && git log backup/master`
3. Check local clones on other machines
4. Check Vercel deploy history — every deploy is a snapshot
5. Restore master from the most recent good source:
   ```bash
   git checkout -b recovery backup/master
   git push origin recovery
   # Then open PR to replace master
   ```

### If the database is corrupted
1. Neon: use point-in-time recovery from the dashboard
2. Mongo Atlas: restore from snapshot
3. Document the incident in `docs/project-safety-protocol.md` incident log

### If Vercel Blob content is lost
1. Check the most recent manual/automated backup dump
2. Re-upload from local archive
3. Re-generate any missing AI content from prompts stored in DB

---

## Adoption Checklist Per Project

When onboarding a new project to MasterHQ, walk through this checklist:

- [ ] Branch protection enabled on `master` / `main`
- [ ] `.github/workflows/` has CI for build + type checks (if applicable)
- [ ] Backup GitHub remote created and `git push backup --all` tested
- [ ] Database backups confirmed (paid tier if production data)
- [ ] Blob / object storage backup strategy chosen and running
- [ ] Tag convention documented in project's CLAUDE.md
- [ ] Weekly checklist added to the project's HANDOFF.md recurring tasks
- [ ] Local clone exists on at least one secondary machine

---

## Why this exists

**2026-04-02 — Togogo incident:** A Claude session did a blanket revert,
deleted 1,798 lines including CLAUDE.md and HANDOFF.md. Production broke.
The only reason we recovered was because Vercel had the previous deploy cached
and we could roll back. Without that, we would have lost work.

**2026-04-10 — Preservation review:** Recognised that our code is now too
valuable to rely on any single source. This document defines the multi-layer
strategy that must be in place for every project going forward.

---

## Related Documents

- `SAFETY-RULES.md` — daily safety rules (sacred files, branch rules, fix spirals)
- `docs/project-safety-protocol.md` — branch protection, crisis response, incident log
- `CLAUDE.md` — project-level instructions and rules
- `HANDOFF.md` — current state and session log
