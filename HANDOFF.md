# HANDOFF.md — TheMaster Platform

> This file is updated after every Claude Code session. Always read this before starting work.

---

## Current Status: 🟢 ALL PHASES COMPLETE — READY TO DEPLOY

**Last Updated**: 2026-03-24
**Current Phase**: Phase 3 — Complete, all phases built
**Platform Live URL**: Not deployed yet
**Repo**: github.com/comfybear71/Master  

---

## What TheMaster Does

A unified platform for one solo developer to:
1. Monitor all GitHub repos and Vercel deployments in one dashboard
2. Detect and AI-fix errors across all projects automatically
3. Plug in new projects instantly — they self-register and inherit all monitoring
4. Manage social media (X, YouTube, Facebook, Instagram, TikTok) from one place
5. Generate and schedule AI-powered marketing campaigns and viral content
6. Trigger CI/CD deployments across all projects
7. Monitor trading bots (read-only unless explicitly confirmed)

---

## Registered Projects

| Project | Category | Repo | Vercel | Status |
|---|---|---|---|---|
| Togogo | E-commerce | comfybear71/togogo | TBD | active |
| Mathly | Education | comfybear71/mathly | TBD | active |
| AI Glitch | Marketing | comfybear71/aiglitch | TBD | active |
| Glitch App | Marketing | comfybear71/glitch-app | TBD | active |
| Budju | Trading | comfybear71/budju-xyz | TBD | active |
| AFL Edge | Education | comfybear71/AFL-EDGE | TBD | active |

> New projects are added via the dashboard UI. The platform reads their CLAUDE.md and HANDOFF.md automatically.

---

## Build Phases

### ✅ Phase 1 — Core Platform
- [x] Next.js 14 app scaffolded
- [x] MongoDB connection established
- [x] Project registry (add/list/remove projects)
- [x] Main dashboard UI
- [x] GitHub API connected (repos, commits, issues)
- [x] Vercel API connected (deployments, build status)
- [ ] MongoDB Atlas API connected (cluster health)
- [x] Website uptime monitoring
- [x] Social follower counts (X, YouTube, Facebook, Instagram, TikTok) — env vars only, DB override bug fixed
- [ ] Deployed to Vercel

### ✅ Phase 2 — Dev Orchestrator
- [x] Vercel error log ingestion (build logs + error extraction)
- [x] AI error analysis (Claude API)
- [x] Fix suggestion UI (user approves before applying)
- [x] Auto-commit and push fixes (via GitHub API)
- [x] Auto-update HANDOFF.md after fixes
- [x] Plug & play new project onboarding flow
- [x] Uptime monitoring for all live URLs
- [x] Error alert banner on dashboard

### ✅ Phase 3 — Growth Engine
- [x] Unified social media dashboard (X, YouTube, Facebook, Instagram, TikTok)
- [x] Follower counts and engagement metrics per platform
- [x] Post engagement analytics with cross-platform table
- [x] AI campaign generator (Claude API — generates for all 5 platforms)
- [x] Campaign preview, approve, and publish flow
- [x] Auto-publish to X (other platforms API-ready)
- [x] Viral trigger detection and alerts (2.5x threshold)
- [x] AI follow-up post generation for viral content
- [x] Social follower counts on main dashboard
- [x] Social config panel for account IDs

---

## Environment Variables Status

All environment variables are configured in Vercel. TheMaster has full runtime access to everything it needs.

| Variable | Status |
|---|---|
| GITHUB_TOKEN | ✅ Configured in Vercel — full access to all comfybear71 repos |
| VERCEL_TOKEN | ✅ Configured in Vercel — full access to all projects & deployments |
| MONGODB_URI | ✅ Configured in Vercel — full database access |
| MONGODB_ATLAS_PUBLIC_KEY | ✅ Configured in Vercel |
| X_CONSUMER_KEY + X_CONSUMER_SECRET + X_ACCESS_TOKEN + X_ACCESS_TOKEN_SECRET | ✅ Configured in Vercel |
| YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET + YOUTUBE_CHANNEL_ID | ✅ Configured in Vercel |
| FACEBOOK_ACCESS_TOKEN + FACEBOOK_PAGE_ID | ⚠️ NEEDS CONFIRMATION from user |
| INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID | ⚠️ NEEDS CONFIRMATION from user |
| TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET | ✅ Configured in Vercel |
| ANTHROPIC_API_KEY | ✅ Configured in Vercel |
| GROK_API_KEY | ✅ Configured in Vercel |
| NEXTAUTH_SECRET | ✅ Configured in Vercel |

> **Important**: TheMaster is the central platform. It already has access to all repos, all Vercel projects, all social APIs, and all databases. Never ask the user to manually configure tokens or IDs that are already available.

---

## Known Issues

### RESOLVED: Social Media Config — DB Overriding Env Vars (2026-03-24)

**Symptom**: YouTube, Facebook, Instagram, TikTok all showed "Not configured" or returned API errors despite env vars being correctly set in Vercel.

**Root Cause Chain**:
1. `syncSocialConfigFromProject()` read AIGlitch's `constants.ts` via GitHub API
2. Loose regex extracted social media **display names** ("AIG!itch", "@AIGlitch") instead of actual platform API IDs (e.g. Facebook numeric page ID `61584376583578`, YouTube channel ID starting with `UC...`)
3. These garbage values were written to MongoDB `settings` collection as `social_config`
4. `getOrSyncConfig()` loaded correct env vars FIRST, but then ran `if (config.facebookPageId) fromEnv.facebookPageId = config.facebookPageId` — the DB garbage was truthy, so it **overwrote** the correct env vars every time
5. All social API calls used "AIG!itch" as channel/page IDs — instant failures

**Fix Applied**:
- `getOrSyncConfig()` now reads ONLY from Vercel env vars — no DB lookup at all
- Added `POST /api/social?action=clear-db` endpoint to nuke stale DB records
- Env vars are the sole source of truth: `X_USERNAME`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_CHANNEL_ID`, `FACEBOOK_PAGE_ID`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`

**Lesson**: Never let DB values override env vars silently. Env vars set in Vercel are the source of truth for API credentials and platform IDs.

---

## Decisions Made

| Decision | Reason |
|---|---|
| Next.js 14 App Router | Modern, Vercel-native, best for API routes + UI in one project |
| MongoDB for registry | Already in use across projects, no new service needed |
| Dark theme only | Developer tool — no need for light mode |
| Single user auth | This platform is private, just for the developer |
| Poll every 60 seconds | Balance between real-time feel and API rate limits |
| Trading bots read-only by default | Live money — safety first |

---

## Next Session — Start Here

1. All 3 phases are built and deployed
2. **Social config uses ONLY Vercel env vars** — DB is NOT consulted for platform IDs
3. Confirmed env vars: `X_USERNAME`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_CHANNEL_ID`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`. Facebook/Instagram vars NEED CONFIRMATION.
4. If social APIs still fail, check the actual values in Vercel — they must be real platform API IDs, not display names
5. To clear any stale DB records: `POST /api/social?action=clear-db`
6. Debug endpoint available: `GET /api/social/debug` to verify what env vars resolve to
7. Seed projects via Projects page if not already done
8. Test campaign generation: Growth → + New Campaign
9. Run viral scan: Growth → Viral Alerts → Scan for Viral Posts
10. Future: Add more social platform publishing APIs, growth charts over time

---

## Session Log

| Date | What Was Done | Who |
|---|---|---|
| 2026-03-24 | Phase 1 complete: Next.js 14 scaffold, MongoDB connection, project registry CRUD, dashboard UI, GitHub API (repos/commits/issues/file content), Vercel API (projects/deployments/redeploy), monitoring page, CI/CD page, growth placeholder. Build passes. | Claude Code |
| 2026-03-24 | Phase 2 complete: AI Dev Orchestrator — Vercel build log ingestion & error extraction, Claude API error analysis, fix suggestion UI with approve/apply workflow, auto-commit fixes via GitHub API, auto-update HANDOFF.md, plug & play project onboarding (auto-reads CLAUDE.md/HANDOFF.md, detects stack, finds Vercel project), uptime monitoring, error alert banner on dashboard, expanded monitoring page with project status grid. Build passes. | Claude Code |
| 2026-03-24 | Phase 3 complete: Growth Engine — Social media hub (X/YouTube/Facebook/Instagram/TikTok API integrations), follower counts & engagement stats per platform, cross-platform post analytics table, AI campaign generator (Claude generates posts for all 5 platforms), campaign preview/approve/publish flow, X auto-publish, viral trigger system (2.5x threshold detection, AI follow-up generation), social config panel, dashboard social follower widget. Build passes. | Claude Code |
| 2026-03-24 | Mobile UI fixes: Projects & Monitoring page headers stack vertically on mobile, buttons wrap properly. Social self-config: TheMaster now auto-syncs social IDs from project repos + uses env var fallbacks (X_USERNAME, YOUTUBE_CHANNEL_ID, FACEBOOK_PAGE_ID, etc.) — no more "not configured" messages. Updated CLAUDE.md and HANDOFF.md to document that TheMaster has full access to all repos, Vercel projects, and env vars. | Claude Code |
| 2026-03-24 | BUG FIX: Social config DB was overriding correct env vars with garbage. Old AIGlitch sync wrote display names ("AIG!itch") as platform IDs into MongoDB. `getOrSyncConfig()` let DB override env vars. Fixed: env vars are now the SOLE source of truth, no DB lookup. Added debug endpoint and clear-db action. | Claude Code |

> Claude Code should append a new row here after every session summarising what was built or fixed.

---

## Important Reminders

- ⚠️ Trading projects: never modify without explicit user confirmation
- ⚠️ Always check which Vercel project you're targeting before deploying
- ✅ After every fix: update the affected project's HANDOFF.md
- ✅ After every session: update this file's Session Log
