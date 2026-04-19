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
| **TheMaster** | Infrastructure | comfybear71/Master | master | active |
| Togogo | E-commerce | comfybear71/togogo | TBD | active |
| Mathly | Education | comfybear71/mathly | TBD | active |
| AI Glitch | Marketing | comfybear71/aiglitch | TBD | active |
| Glitch App | Marketing | comfybear71/glitch-app | TBD | active |
| Budju | Trading | comfybear71/budju-xyz | TBD | active |
| AFL Edge | Education | comfybear71/AFL-EDGE | TBD | active |
| ComfyTV | Entertainment | comfybear71/COMFYTV | COMFYTV | active |

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
- [x] Costs Page — monthly cost tracker with live API + manual entry for all services
- [x] SSH Terminal — browser-based terminal via ttyd iframe (iPad-friendly)
- [ ] §GLITCH Quest Campaign — task-based rewards system
- [ ] AI Assistant — ask questions about any project (Claude reads code via GitHub API)
- [ ] Code Browser — browse file trees of all registered repos
- [ ] Code Editor — edit files inline, diff preview, commit & push
- [ ] Build Monitor — live Vercel build log streaming, one-click redeploy
- [ ] Documentation Hub — auto-pull CLAUDE.md/HANDOFF.md from all repos, searchable
- [ ] Cross-project error detection + AI fix from one interface
- [ ] Full spec at `/docs` → "Phase 4: Command Center"

**Terminal Feature — COMPLETE AND WORKING:**
- `masterhq.dev/terminal` — password protected, full-screen terminal
- Connects to masterhq-dev-syd1 (170.64.133.9) via `terminal.masterhq.dev`
- HTTPS via Let's Encrypt SSL (nginx reverse proxy → ttyd on port 7681)
- Auto-renews every 90 days
- Works on iPad AND desktop PC (primary use case: iPad when away from PC)
- **CRITICAL:** Port 443 must be open in UFW — was the final missing piece
- ttyd runs with `-W` flag (writable mode) — without it terminal is read-only
- Vercel env vars: `TTYD_URL=https://terminal.masterhq.dev`, `TERMINAL_PASSWORD` set
- DNS: `terminal` A record → 170.64.133.9 (in Vercel DNS)
- Setup guide: `docs/DEV-DROPLET-SETUP.md`

**OAuth URL Auto-Capture — COMPLETE AND WORKING (2026-03-29):**
- When Claude Code needs OAuth login, the URL auto-appears in the terminal page's input bar
- User just taps "Go" to open the login page — no manual copy needed
- Works via: `script` log capture → Python ANSI stripping → API relay → page polling
- One-time setup on droplet: `curl -sL https://masterhq.dev/api/terminal/setup | bash`
- Full technical deep dive: `docs/oauth-url-auto-capture.md`
- APIs: `/api/terminal/oauth-url` (POST/GET/DELETE), `/api/terminal/setup` (install script)
- Debug: `cat /tmp/claude_oauth_debug.log` on the droplet

**Approaches that FAILED (documented in `docs/oauth-url-auto-capture.md`):**
1. Monitoring WebSocket + tmux capture-pane — user doesn't use tmux
2. Embedded xterm.js replacing iframe — ttyd auth token required, disconnects on input
3. Clipboard API / OSC 52 paste — iPad Safari truncates to first visual line
4. Server-side WebSocket from Vercel — firewall blocks Vercel → droplet connection
5. Shell `tee` pipe — breaks Claude Code's TUI (isatty detection)

**iPad Workflow (recommended):**
1. Open `masterhq.dev/terminal` on iPad Safari
2. Enter TERMINAL_PASSWORD
3. Type `claude` (the wrapper captures OAuth URLs automatically)
4. If OAuth needed → URL appears in the input bar → tap Go → authorize → paste code back
5. Navigate to project: `cd ~/my-project`
6. If iPad sleeps → reopen terminal → `tmux attach -t claude` (if using tmux) → right back where you left off

### DigitalOcean Droplet Architecture

| Droplet | Hostname | Spec | Monthly | Purpose |
|---------|----------|------|---------|---------|
| **Trading Bot** | budju-syd1 (134.199.149.205) | 512MB RAM | ~$4/mo | Solana trading bot ONLY — DO NOT TOUCH |
| **Dev Droplet** | masterhq-dev-syd1 (170.64.133.9) | 2GB RAM, 50GB SSD | $12/mo | Claude Code + terminal (terminal.masterhq.dev) |

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

### 🛡️ How to start a session on MasterHQ
Paste the starter prompt from `docs/prompts/starter-prompt.md` (or copy from masterhq.dev/docs → Prompts → New Session Starter). All sessions follow the web-only PR workflow:
feature branch → PR → squash-merge → delete branch → tag release.

### 🔐 Authentication
Site is behind Google OAuth (manual implementation, NOT NextAuth). Only `sfrench71@gmail.com` can access. Session cookie lasts 7 days. Public pages (media-kit, sponsor-onboarding, grant-pitch) accessible without login.

### 📊 Accounting System — current state
- **22+ Anthropic invoices uploaded** — OCR'd and in the system
- **~96 more Anthropic invoices to add** — user will bulk upload from PC via Invoice Radar
- **Invoices from other vendors still pending:** xAI, Vercel, DigitalOcean, Starlink, Resend, ImprovMX
- **Payslip OCR ready** — auto-detects payslips vs invoices, extracts gross/PAYG/super
- **ATO Tax Guide tab live** — brackets, super, home office, deductions, instant asset write-off
- **Pagination + filters live** — search, vendor filter, status filter, sort, bulk confirm (25/page)

### 🔒 Pending: Cloudflare R2 provisioning (Layer 7 blob backup)
The blob mirror endpoint is built and deployed (`/api/backup/blob-mirror`) but
inert until R2 env vars are set. ~10 minutes of web work to finish:
1. Sign up at https://cloudflare.com (free)
2. Enable R2 → Create bucket `masterhq-blob-backup`
3. Generate R2 API token → Add 9 env vars to Vercel
4. Test: `masterhq.dev/api/backup/blob-mirror?password=XXX&dryRun=true`
Full setup guide: `docs/code-preservation-protocol.md` Layer 7 section.

### Accounting — next phases to build
| Phase | Feature | Status |
|---|---|---|
| Session 4 | CSV/PDF export for accountant (end-of-year package) | ⏳ |
| Session 5 | Rent receipt generator + email to tenants via Resend | ⏳ |
| Session 6 | Home office hours logger (for 67c/hr ATO claim) | ⏳ |
| Session 7 | Monthly expense dashboard + trend charts | ⏳ |

### Invoice Radar (when on PC)
User plans to install Invoice Radar on Windows PC to bulk-download all
Anthropic/xAI invoices, then drag-drop the entire folder onto
masterhq.dev/accounting for bulk upload + OCR.

### Other pending items
- Provision Cloudflare R2 (blob backup — ~10 min)
- `budju-blob` legacy Blob Store — scheduled for deletion
- CLAUDE.md safety blocks on togogo/propfolio/glitch-app (mathly done)
- Audit togogo's "Goodbye World" commit from Apr 8
- Upstash Redis archived-due-to-inactivity state (may affect AIG!itch)
- AIG!itch Sponsor Auto-Import: `docs/aiglitch-sponsor-prompt.md`

### Current State
1. **Sponsor Onboarding Pipeline COMPLETE** — Email → Stripe payment → asset upload → MongoDB + Blob Store → AIG!itch auto-import API
2. **Blob Store connected** — aiglitch-media Blob Store shared between MasterHQ and AIG!itch projects
3. **Costs page LIVE** — March 2026: $1,697.02 total (DigitalOcean $2.71, Vercel $38.07, Anthropic $1,281.80, xAI $215.44, MongoDB $0, ImprovMX $9, X $50, Claude Max $100)
4. All 5 social platforms connected (X, YouTube, Facebook, Instagram, TikTok)
5. **TikTok in SANDBOX** — switch to LIVE once production review approved
6. **YouTube quota increase submitted** (100K units/day) — check if approved
7. **Domain:** masterhq.dev (NEXTAUTH_URL updated)
8. **Email:** stuart.french@aiglitch.app (Vercel DNS configured)
9. **Prospects page:** 130+ sponsors imported, CRM with status tracking, AI email generation
10. **Media Kit:** masterhq.dev/media-kit (full advertiser kit)
11. **Light/dark mode** toggle in sidebar
12. **Docs:** 13 guides (rewards campaign, email templates, sponsor targets, campaigns, Phase 4 spec, YouTube quota, xAI costs, TikTok setup, social accounts, session logs)

### Sponsor Onboarding Flow (end-to-end)
```
Prospect receives email → clicks $50/$100 tier link
→ Lands on masterhq.dev/sponsor-onboarding
→ Pays via Stripe Checkout (STRIPE_AIGLITCH_SECRET_KEY)
→ Redirected back with ?payment=success
→ Uploads logo + up to 5 product images
→ Files saved to Vercel Blob Store (aiglitch-media, shared)
→ Metadata saved to MongoDB sponsor_uploads collection
→ AIG!itch admin calls GET masterhq.dev/api/sponsor/list?status=pending
→ One-click import creates sponsor + campaign with all images
→ POST masterhq.dev/api/sponsor/list marks as imported (prevents duplicates)
```

### Pending Reviews
- TikTok production review (new redirect URI + scopes)
- YouTube quota increase (100K units/day)
- TikTok Content Posting API audit

### AIGlitch Prompts Ready (in docs/ folder)
- `aiglitch-sponsor-prompt.md` — Sponsor management + MasterHQ auto-import (UPDATED 2026-03-31)
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
| 2026-03-28 | Terminal feature COMPLETE: Created DigitalOcean dev droplet (masterhq-dev-syd1, 170.64.133.9, $12/mo, 2GB RAM). Installed Claude Code v2.1.85, ttyd 1.7.4, tmux, nginx. Set up SSL via Let's Encrypt on terminal.masterhq.dev. Critical fix: port 443 must be open in UFW. ttyd requires -W flag for writable mode. Terminal page on masterhq.dev/terminal working on iPad + desktop. Two-droplet architecture documented (budju trading bot completely isolated). §GLITCH Quest design doc finalized with SQL schemas. iPad workflow documented (tmux + Claude Code). | Claude Code |
| 2026-03-29 | MARATHON SESSION (4hrs, 14 commits): OAuth URL auto-copy for iPad terminal. Tried 5 approaches that failed (monitoring WebSocket, embedded xterm.js, clipboard API, server-side WebSocket from Vercel, shell tee pipe) before succeeding with: `script` log capture → Python ANSI stripping → curl POST to MasterHQ API → page polls → auto-populates URL bar → user taps Go. Fixed 7+ JS template escaping bugs (use `[.]` not `\.`, `chr(27)` not `\x1b`). APIs: `/api/terminal/oauth-url`, `/api/terminal/setup`, `/api/terminal/get-url`, `/api/terminal/token`. Added TheMaster to its own project registry. Full session log: `docs/session-2026-03-29-oauth-autocapture.md`. Full technical docs: `docs/oauth-url-auto-capture.md`. | Claude Code |
| 2026-03-30 | Costs page: Entered March 2026 costs manually via live API — Anthropic $1,281.80 (summed from invoices), xAI Grok $215.44, Vercel $38.07. Total March: $1,697.02 (live $1,538.02 + fixed $159.00). Updated CLAUDE.md with costs page docs and HANDOFF.md with session log. Pushed branch to GitHub. | Claude Code |
| 2026-03-31 | SPONSOR ONBOARDING PIPELINE: Full end-to-end sponsor flow — Stripe payment ($50 Glitch / $100 Chaos tiers), asset upload (logo + 5 images to Vercel Blob Store), MongoDB metadata storage. Built: sponsor-onboarding page (public HTML), /api/stripe/checkout, /api/sponsor/upload (Blob Store + MongoDB), /api/sponsor/list (AIG!itch auto-import API with pending filter + mark-as-imported). Connected aiglitch-media Blob Store to MasterHQ (shared storage). Updated aiglitch-sponsor-prompt.md with MasterHQ auto-import, multiple images, $50/$100 tiers. BUDJU tested as first sponsor ($50 payment). 6 branded HTML email templates (3 tones x 2 personas). Session log: docs/session-2026-03-31. | Claude Code |
| 2026-04-10 | Grant pitch email page: fixed mobile UI (non-sticky controls, full-width inputs, iOS Safari 16px font fix, 2x2 stats grid, horizontal table scroll). Added send action to `/api/outreach` with proper inline-styled email template (email clients strip CSS classes) + recipient name personalization + media kit/sponsor onboarding/social links sections. **CODE PRESERVATION PROTOCOL:** Created `docs/code-preservation-protocol.md` — 7-layer backup strategy (branch protection, backup remote, tags, local clones, DB backups, Blob backups, weekly checklist). Added to SAFETY-RULES.md, CLAUDE.md rules #17-24, and docs page. Every production project must now have branch protection + backup remote. | Claude Code |
| 2026-04-10 (cont) | **FULL PRESERVATION PROTOCOL ROLLOUT (epic session).** Branch protection ruleset "Protect Master" applied to all 7 production repos. Stable release tags on all 7. Careful-dance merges for togogo + propfolio (Vercel production branch switches). Blob mirror endpoint + weekly cron. Prompts collection (starter, resume, PR handoff, circuit breaker) with copy buttons. Fix-spiral counting rule. Docs page improvements. Full details in prior session log entry. | Claude Code |
| 2026-04-13 | **GOOGLE AUTH + ACCOUNTING SYSTEM.** Built manual Google OAuth for entire site (replaced NextAuth after 5+ failed attempts — NextAuth had persistent "invalid_client" token exchange error despite correct credentials). Only sfrench71@gmail.com can access. 7-day encrypted session cookie (AES-256-CBC). Dark-themed login page. **Accounting system expanded:** Claude Vision OCR auto-reads invoices AND payslips (gross pay, PAYG tax, super, pay period, YTD). 22+ Anthropic invoices uploaded and OCR'd. Private Blob Store (accounting-vault) for secure invoice storage + proxy endpoint for viewing. ATO Tax Guide tab (2025-26 brackets, super rates, home office 67c/hr, business deductions, instant asset write-off $20k, GST threshold). Pagination (25/page) + search + vendor/status filters + sort + bulk confirm for invoice list. Employment Income category added. Cleanup: removed dead NextAuth code (AuthProvider.tsx, next-auth dependency). Fixed Vercel MasterHQ production branch (was on old feature branch — same Rule #12 pattern as togogo/propfolio). PRs merged: #44-#58. Tags: v1.0 through v1.8-2026-04-13. | Claude Code |
| 2026-04-17 | **COMFYTV ONBOARDING.** Registered ComfyTV (renamed from iptv) as 8th project. Updated code-preservation-protocol.md (8 repos, all 7 originals marked protected, ComfyTV pending). Updated CLAUDE.md with full 8-repo table + Entertainment category. Updated HANDOFF.md project registry. Branch protection instructions provided for COMFYTV. Abandoned corrupted `claude/fix-mobile-sticky-bar-C71Xk` branch (6,600 lines of deletions from prior session). Added Tutorials docs section (Git Concepts, Safe Change Workflow for Working Copy + VS Code, Quick Reference Card). | Claude Code |
| 2026-04-18 | **MASTER RULES v9.** Integrated learnings from aiglitch-api strangler migration (10 sessions, 12 tags, 74 tests, zero downtime). Added Rule 9 (slice-by-slice migrations), Rule 10 (strangler config in new repo with `beforeFiles` rewrites), Rule 11 (sandbox network boundary — Claude can't hit live URLs), Rule 12 (cross-repo handoffs with self-contained brief). Amended Rule 3 (7→8 repos) and Rule 4 (counter scope: per underlying issue, not per symptom). Confirmed Rule 5 release tag schema (patch/minor/major + date suffix always appended). Added "Known Gotchas" appendix (tsconfig.json auto-modification, Vercel Cache-Control stripping, Vercel fallback 403s, `beforeFiles` requirement). | Claude Code |

> Claude Code should append a new row here after every session summarising what was built or fixed.

---

## Important Reminders

- ⚠️ Trading projects: never modify without explicit user confirmation
- ⚠️ Always check which Vercel project you're targeting before deploying
- ✅ After every fix: update the affected project's HANDOFF.md
- ✅ After every session: update this file's Session Log
