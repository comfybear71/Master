# CLAUDE.md — TheMaster Platform

## What This Is
TheMaster is a unified command and control platform for a solo developer managing multiple live production projects. It is the single source of truth for all projects, deployments, monitoring, social media, and growth campaigns.

This is the MASTER repo. All other projects are registered here and managed from here.

---

## Developer Profile
- Solo independent developer
- Works primarily via browser-based tools and Claude Code
- Prefers complete ready-to-use code — no partial snippets
- All projects deployed on Vercel
- Version control via GitHub
- Primary database: MongoDB
- AI stack: Claude API (Anthropic) + Grok

---

## Platform Architecture

### Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB (project registry, campaign data, logs)
- **Auth**: NextAuth.js (single user — the developer)
- **Hosting**: Vercel
- **AI**: Claude API + Grok API

### Key Integrations
| Service | Purpose |
|---|---|
| GitHub API | Repo monitoring, commits, issues, reading CLAUDE.md files |
| Vercel API | Deployment status, build logs, error detection, redeploys |
| MongoDB Atlas API | Cluster health, database stats |
| X (Twitter) API | Posts, analytics, follower counts |
| YouTube Data API | Video stats, channel analytics |
| Facebook Graph API | Page stats, post performance |
| Instagram Graph API | Post engagement, follower growth |
| TikTok API | Video stats, follower counts |
| Helios | As configured |
| Anthropic API | AI fix suggestions, campaign content generation |
| Grok API | Alternative AI, real-time data |

---

## Registered Projects

Projects are stored in MongoDB `projects` collection. Each project added via the UI is auto-registered. When working on any registered project always go to that project's own CLAUDE.md and HANDOFF.md first.

### Project Categories
- **E-commerce / Dropshipping** — online shopping platforms
- **Trading** — automated trading robots (⚠️ LIVE MONEY — extra caution required)
- **Education** — educational software platforms
- **Marketing** — growth and social tools
- **Infrastructure** — this platform and supporting tools

---

## Critical Rules

### General
1. Always read this file AND HANDOFF.md before starting any session
2. Always read the target project's CLAUDE.md before touching that project
3. Always update HANDOFF.md at the end of every session
4. Use TypeScript strictly — no `any` types without a comment explaining why
5. All secrets via environment variables — never hardcode anything
6. Every API route needs proper error handling and meaningful error messages

### Deployment
7. Never deploy directly to production without showing the user a summary first
8. Always verify the correct Vercel project is targeted before deploying
9. After every deployment update the relevant project's HANDOFF.md

### Trading Projects — SPECIAL RULES
10. ⚠️ NEVER make changes to any trading bot or trading platform without EXPLICIT written confirmation from the user
11. ⚠️ NEVER restart, redeploy, or modify trading logic without confirmation
12. ⚠️ Always flag if a change could affect live trading

### Adding New Projects
13. When a new project is added, auto-read its CLAUDE.md and HANDOFF.md
14. Register it in MongoDB projects collection
15. Set up Vercel monitoring immediately
16. Add uptime check for its live URL

---

## File Conventions

Every project repo (including this one) must maintain:
- `CLAUDE.md` — project context, stack, rules, API keys list (not values)
- `HANDOFF.md` — current state, what's working, what's broken, next steps

TheMaster reads these files via GitHub API to understand every project without needing to open them manually.

---

## Environment Variables

All environment variables are configured in Vercel's project settings. The deployed app has full access to every key it needs at runtime. `.env.example` documents the required keys for reference only.

**DO NOT ask the user to configure API tokens.** TheMaster already has:
- `GITHUB_TOKEN` — full access to all repos under comfybear71
- `VERCEL_TOKEN` — full access to all Vercel projects and deployments
- All social media API keys (X, YouTube, Facebook, Instagram, TikTok)
- `ANTHROPIC_API_KEY` and `GROK_API_KEY` for AI features
- `MONGODB_URI` for database access

### TheMaster's Access Scope

TheMaster is the central command platform. It has **full access** to:
- **Every GitHub repo** under comfybear71 — can read code, CLAUDE.md, HANDOFF.md, constants, env files
- **Every Vercel project** — can read deployments, build logs, env vars, trigger redeploys
- **All social media accounts** — API tokens are already configured in Vercel env vars
- **MongoDB** — full read/write access to all collections

**Never show "not configured" messages for things that are already available via env vars or can be auto-discovered from registered projects.** If a social account ID is needed, read it from the project repos (e.g. AIGlitch's constants.ts) or from the Vercel env vars. TheMaster should self-configure by reading its own ecosystem.

---

## Folder Structure

```
TheMaster/
├── app/
│   ├── page.tsx                  # Main dashboard
│   ├── projects/                 # Project registry
│   ├── growth/                   # Campaigns & social
│   ├── monitoring/               # Errors & uptime
│   ├── cicd/                     # Deployment controls
│   └── api/                      # All API routes
├── components/                   # UI components
├── lib/                          # API client libraries
├── CLAUDE.md                     # This file
├── HANDOFF.md                    # Current state
└── .env.local                    # Secrets (not committed)
```

---

## Design System

- **Theme**: Dark only
- **Base background**: `#0a0f1e`
- **Primary accent**: `#00d4ff` (electric blue)
- **Success / Live**: `#00ff88` (green)
- **Error**: `#ff4444` (red)
- **Warning**: `#ffaa00` (amber)
- **Fonts**: JetBrains Mono (data/code), Inter (UI)
- **Refresh**: Real-time polling every 60 seconds

---

## Session Start Checklist

Before every Claude Code session on TheMaster:
- [ ] Read this CLAUDE.md
- [ ] Read HANDOFF.md
- [ ] Check what phase is currently being built
- [ ] Confirm no trading projects are affected by today's work
- [ ] Ask user what they want to focus on today
