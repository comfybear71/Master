# HANDOFF.md — TheMaster Platform

> This file is updated after every Claude Code session. Always read this before starting work.

---

## Current Status: 🟡 INITIALISING

**Last Updated**: Project created — no build sessions yet  
**Current Phase**: Phase 1 — Not started  
**Platform Live URL**: Not deployed yet  
**Repo**: github.com/[YOUR-USERNAME]/TheMaster  

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
| *(none yet — add via dashboard)* | | | | |

> New projects are added via the dashboard UI. The platform reads their CLAUDE.md and HANDOFF.md automatically.

---

## Build Phases

### ✅ Phase 1 — Core Platform
- [ ] Next.js 14 app scaffolded
- [ ] MongoDB connection established
- [ ] Project registry (add/list/remove projects)
- [ ] Main dashboard UI
- [ ] GitHub API connected (repos, commits, issues)
- [ ] Vercel API connected (deployments, build status)
- [ ] MongoDB Atlas API connected (cluster health)
- [ ] Website uptime monitoring
- [ ] Social follower counts (X, YouTube, Facebook, Instagram, TikTok)
- [ ] Deployed to Vercel

### ⏳ Phase 2 — Dev Orchestrator
- [ ] Vercel error log ingestion
- [ ] AI error analysis (Claude API)
- [ ] Fix suggestion UI (user approves before applying)
- [ ] Auto-commit and push fixes
- [ ] Auto-update HANDOFF.md after fixes
- [ ] Plug & play new project onboarding flow

### ⏳ Phase 3 — Growth Engine
- [ ] Unified social media dashboard
- [ ] Follower growth charts
- [ ] Post engagement analytics
- [ ] AI campaign generator (Claude + Grok)
- [ ] Post scheduler
- [ ] Auto-publish to all platforms
- [ ] Viral trigger detection and alerts

---

## Environment Variables Status

| Variable | Status |
|---|---|
| GITHUB_TOKEN | ⬜ Not added yet |
| VERCEL_TOKEN | ⬜ Not added yet |
| MONGODB_URI | ⬜ Not added yet |
| MONGODB_ATLAS_PUBLIC_KEY | ⬜ Not added yet |
| X_API_KEY | ✅ Have it |
| YOUTUBE_API_KEY | ✅ Have it |
| FACEBOOK_APP_ID | ✅ Have it |
| INSTAGRAM_ACCESS_TOKEN | ✅ Have it |
| TIKTOK_CLIENT_KEY | ✅ Have it |
| ANTHROPIC_API_KEY | ✅ Have it |
| GROK_API_KEY | ✅ Have it |
| NEXTAUTH_SECRET | ⬜ Generate on setup |

---

## Known Issues

*None yet — project not started*

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

1. Open Claude Code in the TheMaster repo
2. Paste the contents of `CLAUDE_CODE_PROMPT.md` 
3. Claude Code will scaffold Phase 1
4. Fill in `.env.local` with your API keys as it builds
5. First working milestone: dashboard showing GitHub repos + Vercel deployments

---

## Session Log

| Date | What Was Done | Who |
|---|---|---|
| *(first session not started)* | | |

> Claude Code should append a new row here after every session summarising what was built or fixed.

---

## Important Reminders

- ⚠️ Trading projects: never modify without explicit user confirmation
- ⚠️ Always check which Vercel project you're targeting before deploying
- ✅ After every fix: update the affected project's HANDOFF.md
- ✅ After every session: update this file's Session Log
