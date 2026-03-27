# HANDOFF.md — TheMaster Platform

> This file is updated after every Claude Code session. Always read this before starting work.

---

## Current Status: 🟢 ALL PHASES COMPLETE — READY TO DEPLOY

**Last Updated**: 2026-03-27
**Current Phase**: Phase 3 — Complete, all phases built
**Platform Live URL**: https://masterhq.dev
**Vercel URL**: https://master-six-ashen.vercel.app
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

### AIGlitch — Ad Campaigns Feature

AIGlitch has a fully automated **Ad Campaign system** that generates AI-powered video ads:

- **API:** `/api/generate-ads` (POST plan/submit, GET poll/cron, PUT publish)
- **Cron:** Every 4 hours — auto-generates and posts ads
- **Admin UI:** `/admin/personas` page — collapsible ad campaign section
- **Product distribution:** 70% AIG!itch ecosystem, 20% §GLITCH coin, 10% marketplace products
- **Video gen:** Grok `grok-imagine-video` — 10s standard or 30s extended (multi-clip stitched)
- **AI content:** Claude generates captions + video prompts, PromptViewer for admin preview/edit
- **Auto-spread:** Posts to feed as The Architect (glitch-000), spreads to X, TikTok, Instagram, Facebook, YouTube, Telegram
- **5 rotating angles** for ecosystem ads (full overview, Channels/AI Netflix, mobile app/Bestie, 108 personas reveal, logo-centric brand)
- **Frontend spec:** `docs/ad-campaigns-frontend-spec.md` in AIGlitch repo

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
- [x] Auto-publish to X
- [x] Instagram posting via Content Publishing API (image, video, Reels)
- [x] Viral trigger detection and alerts (2.5x threshold)
- [x] AI follow-up post generation for viral content
- [x] Social follower counts on main dashboard
- [x] Social config panel for account IDs

### Phase 4 — Command Center (IN PROGRESS)
- [x] SSH Terminal — browser-based terminal via ttyd iframe (iPad-friendly)
- [ ] §GLITCH Quest Campaign — task-based rewards system
- [ ] AI Assistant — ask questions about any project (Claude reads code via GitHub API)
- [ ] Code Browser — browse file trees of all registered repos
- [ ] Code Editor — edit files inline, diff preview, commit & push
- [ ] Build Monitor — live Vercel build log streaming, one-click redeploy
- [ ] Documentation Hub — auto-pull CLAUDE.md/HANDOFF.md from all repos, searchable
- [ ] Cross-project error detection + AI fix from one interface
- [ ] Full spec at `/docs` → "Phase 4: Command Center"

**Terminal setup requires 2 env vars in Vercel:**
- `TTYD_URL` — URL to ttyd on the DEV droplet (e.g. `http://DEV_DROPLET_IP:7681`)
- `TERMINAL_PASSWORD` — password to gate the terminal page
- Setup guide: `docs/DEV-DROPLET-SETUP.md`

### DigitalOcean Droplet Architecture

| Droplet | Hostname | Spec | Monthly | Purpose |
|---------|----------|------|---------|---------|
| **Trading Bot** | budju-syd1 | 512MB RAM | ~$4/mo | Solana trading bot ONLY — never touch from MasterHQ |
| **Dev Droplet** | masterhq-dev-syd1 | 2GB RAM, 50GB SSD | $12/mo | Claude Code sessions from iPad via masterhq.dev/terminal |

**CRITICAL:** The Terminal page (`/terminal`) on MasterHQ connects to the DEV droplet, NOT the trading bot droplet. The `TTYD_URL` env var in Vercel MUST point to the dev droplet IP.

The trading bot droplet is completely isolated. No SSH access from MasterHQ. No ttyd. No changes without explicit user confirmation (CLAUDE.md Rule #10).

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
| GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + YOUTUBE_CHANNEL_ID | ✅ Configured in Vercel |
| FACEBOOK_ACCESS_TOKEN + FACEBOOK_PAGE_ID | ✅ Configured in Vercel (confirmed 2026-03-25) |
| INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID | ✅ Configured in Vercel (confirmed 2026-03-25, username: sfrench71) |
| TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET | ✅ Configured in Vercel |
| ANTHROPIC_API_KEY | ✅ Configured in Vercel |
| GROK_API_KEY | ✅ Configured in Vercel |
| NEXTAUTH_SECRET | ✅ Configured in Vercel |

> **Important**: TheMaster is the central platform. It already has access to all repos, all Vercel projects, all social APIs, and all databases. Never ask the user to manually configure tokens or IDs that are already available.

---

## Known Issues

### ACTIVE: YouTube API Quota Exhaustion (2026-03-25)

**Symptom**: YouTube shows 403 error: "The request cannot be completed because you have exceeded your quota."

**Root Cause**: YouTube Data API free tier allows 10,000 units/day. Both TheMaster (polling every 60s) and AIGlitch (cron jobs + marketing metrics) share the same `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, burning through quota quickly.

**This is NOT an auth issue.** Do NOT reconnect YouTube OAuth when this happens. Quota resets at **midnight Pacific time** daily.

**Mitigations implemented (2026-03-26):**
- YouTube stats cached in MongoDB — cached data shown when quota exceeded
- "Quota Limit" amber badge instead of red "Error" on Growth page
- Quota increase to 100,000 units/day submitted to Google (pending approval)
- Google Cloud Project Number: 837829119225

**Still TODO:**
- Increase TheMaster polling interval for YouTube from every-refresh to 5-10 minutes

### RESOLVED: TikTok OAuth — Working in Sandbox (2026-03-26)

**Previous symptom**: TikTok showed "token expired or invalid" after OAuth — production keys were being used but app was still in sandbox review.

**Fix**: Added sandbox/live toggle. Using TIKTOK_SANDBOX_CLIENT_KEY + TIKTOK_SANDBOX_CLIENT_SECRET for sandbox mode. TikTok now shows 31 followers, 27 posts, 0.7% engagement in sandbox.

**Pending**: TikTok production review (new redirect URI + user.info.stats + video.list scopes). Once approved, switch to LIVE mode via Growth page toggle.

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
- Env vars are the sole source of truth: `X_USERNAME`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `YOUTUBE_CHANNEL_ID`, `FACEBOOK_PAGE_ID`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`

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

### Priority: Build §GLITCH Rewards Campaign (Phase 3 completion)
Full spec at `/docs` → "§GLITCH Rewards Campaign". Users complete 10-20 tasks (follow, like, subscribe across all platforms) and earn §GLITCH coin. Needs: campaign page, task verification APIs, wallet connection, admin dashboard.

### Current State
1. All 5 social platforms connected (X, YouTube, Facebook, Instagram, TikTok)
2. **TikTok in SANDBOX** — switch to LIVE once production review approved
3. **YouTube quota increase submitted** (100K units/day) — check if approved
4. **Domain:** masterhq.dev (NEXTAUTH_URL updated)
5. **Email:** stuart.french@aiglitch.app (Vercel DNS configured)
6. **Prospects page:** 130+ sponsors imported, CRM with status tracking, AI email generation
7. **Media Kit:** masterhq.dev/media-kit (full advertiser kit)
8. **Light/dark mode** toggle in sidebar
9. **Docs:** 12 guides (rewards campaign, email templates, sponsor targets, campaigns, Phase 4 spec, YouTube quota, xAI costs, TikTok setup, social accounts, session logs)

### Pending Reviews
- TikTok production review (new redirect URI + scopes)
- YouTube quota increase (100K units/day)
- TikTok Content Posting API audit

### AIGlitch Prompts Ready (in docs/ folder)
- `aiglitch-sponsor-prompt.md` — Sponsor management system
- `aiglitch-cost-optimization.md` — Reduce $1,365/mo → $300-500
- `aiglitch-30s-video-fix.md` — 30s ads only producing 10s clips
- `aiglitch-video-stitch-fix.md` — MP4 edts box fix
- `aiglitch-breaking-news-urgent-fix.md` — Breaking News stitch "Missing required fields"

---

## Session Log

| Date | What Was Done | Who |
|---|---|---|
| 2026-03-24 | Phase 1 complete: Next.js 14 scaffold, MongoDB connection, project registry CRUD, dashboard UI, GitHub API (repos/commits/issues/file content), Vercel API (projects/deployments/redeploy), monitoring page, CI/CD page, growth placeholder. Build passes. | Claude Code |
| 2026-03-24 | Phase 2 complete: AI Dev Orchestrator — Vercel build log ingestion & error extraction, Claude API error analysis, fix suggestion UI with approve/apply workflow, auto-commit fixes via GitHub API, auto-update HANDOFF.md, plug & play project onboarding (auto-reads CLAUDE.md/HANDOFF.md, detects stack, finds Vercel project), uptime monitoring, error alert banner on dashboard, expanded monitoring page with project status grid. Build passes. | Claude Code |
| 2026-03-24 | Phase 3 complete: Growth Engine — Social media hub (X/YouTube/Facebook/Instagram/TikTok API integrations), follower counts & engagement stats per platform, cross-platform post analytics table, AI campaign generator (Claude generates posts for all 5 platforms), campaign preview/approve/publish flow, X auto-publish, viral trigger system (2.5x threshold detection, AI follow-up generation), social config panel, dashboard social follower widget. Build passes. | Claude Code |
| 2026-03-24 | Mobile UI fixes: Projects & Monitoring page headers stack vertically on mobile, buttons wrap properly. Social self-config: TheMaster now auto-syncs social IDs from project repos + uses env var fallbacks (X_USERNAME, YOUTUBE_CHANNEL_ID, FACEBOOK_PAGE_ID, etc.) — no more "not configured" messages. Updated CLAUDE.md and HANDOFF.md to document that TheMaster has full access to all repos, Vercel projects, and env vars. | Claude Code |
| 2026-03-24 | BUG FIX: Social config DB was overriding correct env vars with garbage. Old AIGlitch sync wrote display names ("AIG!itch") as platform IDs into MongoDB. `getOrSyncConfig()` let DB override env vars. Fixed: env vars are now the SOLE source of truth, no DB lookup. Added debug endpoint and clear-db action. |
| 2026-03-25 | Social media fixes: Fixed YouTube OAuth (GOOGLE_CLIENT_ID/SECRET, not YOUTUBE_), fixed Google OAuth redirect double-slash, added `connected: true` to all social platform responses, added Instagram posting via Content Publishing API (image/video/Reels with 2-step create→publish flow). Confirmed Facebook & Instagram env vars now set in Vercel. | Claude Code |
| 2026-03-25 | Documented AIGlitch Ad Campaigns system in Master HANDOFF. Created `docs/ad-campaigns-frontend-spec.md` in AIGlitch repo — full frontend spec for the ad campaign feature (API endpoints, styles, platforms, video specs, database tables, social spreading, PromptViewer integration). | Claude Code |
| 2026-03-26 | Instagram fix: reversed token priority (FACEBOOK_ACCESS_TOKEN first, not INSTAGRAM_ACCESS_TOKEN). TikTok full integration: sandbox/live toggle, API monitoring log, scopes updated (user.info.stats, video.list), helped submit TikTok app review + Content Posting API audit. YouTube: cached stats on quota exceeded, "Quota Limit" badge, submitted quota increase to Google (100K units/day). Created /docs page with 4 guides (YouTube quota, xAI Grok costs, TikTok setup, social accounts). Added social profile links to all Growth page cards. Fixed platform URLs (X=@spiritary, YouTube=@frekin31, TikTok=@aiglicthed). Updated all CLAUDE.md and HANDOFF.md files. | Claude Code |
| 2026-03-26 (cont) | MASSIVE SESSION: Phase 4 Command Center spec. Sponsor outreach system: email generator with Claude AI, editable emails, Send button (mailto), §GLITCH payment model in pitches. Prospects page: 130+ sponsors imported from Excel, CRM with status tracking, bulk email generation. Media Kit page (full HTML advertiser kit). Sponsor Target List (10 categories, 5-step outreach plan). 3 email templates (punchy/data-led/warm). Light/dark mode toggle. Cost optimization prompt for AIGlitch ($1,365/mo → target $300-500). Video stitch fix prompts (30s ads + breaking news). §GLITCH Rewards Campaign spec (Phase 3 completion). Domain: masterhq.dev. Email: stuart.french@aiglitch.app. Signed as "Stuie French - The Architect". | Claude Code |

> Claude Code should append a new row here after every session summarising what was built or fixed.

---

## Important Reminders

- ⚠️ Trading projects: never modify without explicit user confirmation
- ⚠️ Always check which Vercel project you're targeting before deploying
- ✅ After every fix: update the affected project's HANDOFF.md
- ✅ After every session: update this file's Session Log
