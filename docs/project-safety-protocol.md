# Project Safety Protocol — All Projects

> This protocol applies to EVERY project managed from MasterHQ.
> It exists because a Claude session destroyed a production branch (Togogo, 2026-04-02).
> NEVER skip these steps.

---

## 1. Branch Protection — MANDATORY

### Every project MUST have:
- `main` or `master` — **PRODUCTION ONLY**. Never push directly.
- `dev` — where all work happens
- Feature branches off `dev` for specific tasks

### Workflow:
```
feature-branch → dev → test on preview URL → merge to main
```

### Rules:
- **NEVER push directly to production branch**
- **NEVER do blanket reverts** — fix issues surgically
- **NEVER delete CLAUDE.md or HANDOFF.md** — these are sacred files
- Always create a new branch for Claude Code sessions
- If something breaks, STOP and ask the user before reverting anything

---

## 2. Vercel Preview Deployments

Every branch/PR gets its own preview URL automatically:
- `togogo-git-dev-xyz.vercel.app`
- Test there FIRST, then merge to production
- NEVER change the Vercel production branch to a feature branch

### Vercel Settings (per project):
- Production Branch: `main` (or `master`)
- Preview Deployments: Enabled for all branches
- Auto-deploy: Only from production branch

---

## 3. Database Safety

### Neon (Postgres):
- Enable point-in-time recovery
- Before ANY migration: document what it does in the commit message
- Never DROP columns/tables without explicit user confirmation
- ALTER TABLE ADD COLUMN is safe (additive)
- ALTER TABLE DROP COLUMN is DANGEROUS (destructive)

### MongoDB:
- Never delete collections without confirmation
- Use `updateOne`/`updateMany` not `replaceOne` (preserves fields you didn't mention)

---

## 4. Automated Tests (Pre-Deploy)

Before any deployment, these checks MUST pass:
```bash
# TypeScript projects
npx tsc --noEmit

# React/Next.js projects  
npm run build

# Check for broken imports
# Check for white screen errors
# Check API endpoints return 200
```

### Health Check Endpoint
Every project should have `GET /api/health` that returns:
```json
{ "status": "ok", "timestamp": "...", "db": "connected" }
```

---

## 5. CLAUDE.md and HANDOFF.md — Sacred Files

### CLAUDE.md:
- Complete project documentation
- Architecture, stack, API keys needed
- Critical rules and warnings
- Must exist in root of every repo
- **NEVER DELETE**

### HANDOFF.md:
- Current state of the project
- What's working, what's broken
- Session log with dates
- **NEVER DELETE**
- Update at END of every session, not during destructive operations

### Protection:
- If a Claude session tries to delete these files, it's a bug
- Always read these files FIRST before any work
- Back them up in MasterHQ docs as well

---

## 6. Dependency Pinning

- Use exact versions in package.json (no `^` or `~`)
- Lock files (`package-lock.json`, `yarn.lock`) must be committed
- Never run `npm update` without explicit permission
- Pin Node.js version in `package.json` engines field

---

## 7. Monitoring

### Vercel Cron Health Check:
Every project should have a cron job that hits `/api/health` every 5 minutes.

### MasterHQ Uptime Monitoring:
Already built — monitors all project URLs from the dashboard.

### Error Alerting:
Vercel error logs → MasterHQ monitoring page → AI analysis

---

## 8. Crisis Response Protocol

### If a Claude session breaks something:

1. **STOP** — don't let it keep trying to fix things
2. **Check which branch is deployed** in Vercel
3. **Switch Vercel back to the production branch** if it was changed
4. **Check git log** — find the last known good commit
5. **Git revert the specific bad commit** (not a blanket revert)
6. **Check the database** — were any destructive migrations run?
7. **Restore from backup** if data was lost

### If the production branch itself is damaged:
```bash
# Find the last good commit
git log --oneline -20

# Reset to it (on a new branch first!)
git checkout -b recovery
git reset --hard <last-good-commit>

# Create a PR to replace main
```

### NEVER:
- Delete branches without checking if Vercel is deploying from them
- Do `git reset --hard` on the production branch
- Run blanket reverts that touch 10+ files
- Delete CLAUDE.md or HANDOFF.md during a fix attempt

---

## 9. Claude Code Session Rules

### Before Starting:
- [ ] Read CLAUDE.md
- [ ] Read HANDOFF.md
- [ ] Check which branch you're on
- [ ] Create a new branch if working on production
- [ ] Confirm no trading projects are affected

### During Work:
- [ ] Commit frequently (small, atomic commits)
- [ ] Never batch 10+ file changes in one commit
- [ ] Test after each change
- [ ] If something breaks, diagnose before fixing

### Before Ending:
- [ ] Run build/type checks
- [ ] Update HANDOFF.md
- [ ] Push to feature branch (not production)
- [ ] Tell user to test on preview URL before merging

### NEVER:
- Push directly to main/master
- Change Vercel production branch
- Delete documentation files
- Do blanket reverts
- Make changes to trading bots without explicit confirmation

---

## 10. Project-Specific Warnings

### Togogo ⚠️
- Real customers, real money
- Payment processing via Stripe
- Supplier orders are real — test with sandbox/test mode
- Database has real customer data — never wipe

### BUDJU Trading ⚠️⚠️⚠️
- LIVE MONEY on Solana
- NEVER touch without explicit written confirmation
- NEVER restart, redeploy, or modify trading logic
- Read-only monitoring only from MasterHQ

### AIG!itch
- 108 AI personas generating content 24/7
- Ad campaigns running for real sponsors (BUDJU, Frenchie)
- Don't break the spreading system or cron jobs

---

## Incident Log

| Date | Project | What Happened | Root Cause | Resolution |
|------|---------|--------------|------------|------------|
| 2026-04-02 | Togogo | Claude session did blanket revert, deleted 1,798 lines including CLAUDE.md and HANDOFF.md | Fix spiral — kept making things worse then reverted everything | Switched Vercel back to master branch |

> Add new incidents here so we learn from them.
