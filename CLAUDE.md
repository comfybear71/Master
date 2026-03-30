# CLAUDE.md — TheMaster Platform

## What This Is
TheMaster is a unified command and control platform for a solo developer managing multiple live production projects. It is the single source of truth for all projects, deployments, monitoring, social media, and growth campaigns.

**Live URL:** https://masterhq.dev
**Vercel URL:** https://master-six-ashen.vercel.app

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
| Instagram Graph API | Post engagement, follower growth, content publishing (image/video/Reels) |
| TikTok API | Video stats, follower counts (OAuth flow stores tokens in MongoDB `settings` collection) |
| Helios | As configured |
| Anthropic API | AI fix suggestions, campaign content generation, news fictionalization |
| Grok API | Alternative AI, real-time data |
| NewsAPI | Real news headlines for fictionalized topic generation (free tier: 100 req/day) |

### Costs Page (`/costs`)

Monthly cost tracker across all services. Combines live API-fetched costs with fixed monthly costs and manual overrides.

| Service | Type | Source |
|---|---|---|
| DigitalOcean | Live | DigitalOcean billing API (`DIGITALOCEAN_API_TOKEN`) |
| Vercel | Live | Manual entry (billing API unreliable) |
| Anthropic (Claude) | Live | Manual entry from console.anthropic.com invoices |
| xAI (Grok) | Live | Manual entry from console.x.ai usage |
| MongoDB Atlas | Live | Atlas billing API (HTTP Digest Auth) |
| ImprovMX | Fixed | $9/mo |
| X (Twitter) | Fixed | $50/mo |
| Claude Max | Fixed | $100/mo |

**Data storage:** Manual overrides saved in MongoDB `settings` collection (key: `cost_settings`). API routes at `/api/costs/{service}` for live fetching, `/api/costs/settings` for manual overrides (GET/POST).

**Env vars for live cost APIs:** `DIGITALOCEAN_API_TOKEN`, `VERCEL_TOKEN`, `ANTHROPIC_API_KEY`, `XAI_API_KEY`, `MONGODB_ATLAS_PUBLIC_KEY`, `MONGODB_ATLAS_PRIVATE_KEY`, `MONGODB_ATLAS_ORG_ID`

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
7. **§GLITCH** — Always use the § symbol for GLITCH coin (§GLITCH), NEVER use $ for GLITCH. The $ is reserved for $BUDJU (Solana token) and real currency amounts.
8. **NEVER use localStorage.** All persistent data goes in MongoDB. localStorage is unreliable, device-specific, and not accessible across sessions or devices. Use the `settings` collection for user preferences and editable values.

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

Every project repo (including this one) must maintain in the **root directory**:
- `CLAUDE.md` — project context, stack, rules, API keys list (not values)
- `HANDOFF.md` — current state, what's working, what's broken, next steps
- `README.md` — project overview, stack, features, setup

**ALL other .md files** go in the `docs/` folder. This applies to every single repo:
- Specs, guides, prompts, session logs, feature docs → `docs/`
- Only CLAUDE.md, HANDOFF.md, and README.md live in root
- If a new .md file is created that is not one of these three, it goes in `docs/`

TheMaster reads CLAUDE.md and HANDOFF.md via GitHub API to understand every project without needing to open them manually.

---

## Environment Variables

All environment variables are configured in Vercel's project settings. The deployed app has full access to every key it needs at runtime. `.env.example` documents the required keys for reference only.

**DO NOT ask the user to configure API tokens.** TheMaster already has:
- `GITHUB_TOKEN` — full access to all repos under comfybear71
- `VERCEL_TOKEN` — full access to all Vercel projects and deployments
- All social media API keys (X, YouTube, Facebook, Instagram, TikTok)
- `ANTHROPIC_API_KEY` and `GROK_API_KEY` for AI features
- `MONGODB_URI` for database access
- `NEWS_API_KEY` for real news headlines (fictionalized for AIGlitch topics)
- `TTYD_URL` and `TERMINAL_PASSWORD` for browser terminal
- `CRON_SECRET` for cron job authentication

### TheMaster's Access Scope

TheMaster is the central command platform. It has **full access** to:
- **Every GitHub repo** under comfybear71 — can read code, CLAUDE.md, HANDOFF.md, constants, env files
- **Every Vercel project** — can read deployments, build logs, env vars, trigger redeploys
- **All social media accounts** — API tokens are already configured in Vercel env vars
- **MongoDB** — full read/write access to all collections

**Never show "not configured" messages for things that are already available via env vars or can be auto-discovered from registered projects.** TheMaster should self-configure by reading its own ecosystem.

### Social Media Config — Source of Truth

**Vercel env vars are the SOLE source of truth for social platform IDs.** Do NOT read them from project repos or store them in MongoDB. Previous bug: an AIGlitch sync wrote display names ("AIG!itch") as platform IDs into the DB, and DB values silently overrode correct env vars.

Required env vars (all set in Vercel):
- `X_USERNAME` — Twitter/X handle
- `X_CONSUMER_KEY`, `X_CONSUMER_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` — X OAuth 1.0a
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` — YouTube OAuth
- `YOUTUBE_CHANNEL_ID` — must be a real YouTube channel ID (starts with `UC...`)
- `FACEBOOK_ACCESS_TOKEN` — Facebook Graph API token (also used for Instagram)
- `FACEBOOK_PAGE_ID` — must be a numeric page ID (e.g. `61584376583578`)
- `INSTAGRAM_ACCESS_TOKEN` — Instagram Content Publishing API token
- `INSTAGRAM_USER_ID` — must be a numeric Instagram Business Account user ID (username: sfrench71)
- `TIKTOK_USERNAME` — TikTok handle
- `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` — TikTok API credentials

**Rule: NEVER let DB values override env vars for API credentials or platform IDs.**

### Terminal OAuth URL Auto-Capture

When Claude Code starts on the droplet and needs OAuth login, the URL is automatically captured and displayed in the MasterHQ terminal page's input bar. This solves the iPad problem where multi-line URLs cannot be copied from ttyd.

**Architecture:** `script` log capture → Python ANSI stripping → POST to `/api/terminal/oauth-url` → page polls GET → auto-populates input → user taps Go.

**Droplet setup (one-time):** `curl -sL https://masterhq.dev/api/terminal/setup | bash`

**API endpoints:**
- `POST /api/terminal/oauth-url` — Store OAuth URL (called from droplet watcher, auth via TERMINAL_PASSWORD)
- `GET /api/terminal/oauth-url?password=...` — Retrieve stored URL (polled by terminal page every 3s)
- `DELETE /api/terminal/oauth-url?password=...` — Clear stored URL
- `GET /api/terminal/setup` — Serves the droplet install script

**MongoDB:** URLs stored in `settings` collection, key `terminal_oauth_url`, 10-minute TTL.

**JS template literal escaping rule:** When embedding shell/Python code in Next.js API route template literals, NEVER use backslash escapes (`\.`, `\?`, `\x1b`, `\r`, `\n`). JS consumes them. Use `[.]`, `[?]`, `chr(27)`, `chr(13)`, `chr(10)` instead.

**Full technical docs:** `docs/oauth-url-auto-capture.md`

### TikTok OAuth

TikTok uses OAuth 2.0 with authorization code flow. Tokens are stored in MongoDB `settings` collection (key: `tiktok_oauth`). Endpoints:
- `GET /api/auth/tiktok` — Initiates OAuth flow (redirects to TikTok)
- `GET /api/auth/tiktok/callback` — Handles callback, exchanges code for token, stores in MongoDB
- `GET /api/auth/tiktok/debug` — Debug endpoint: shows token status, expiry, and tests against TikTok user info API

### YouTube API Quota

YouTube Data API has a **10,000 units/day free quota** (resets at midnight Pacific). Both TheMaster and AIGlitch share the same API key and poll YouTube stats. A 403 "quota exceeded" error does NOT mean auth is broken — it means the daily limit is hit. Do NOT treat this as a reconnect/reauth issue. It auto-resolves at midnight Pacific. When quota is exceeded, TheMaster shows cached stats with an amber "Quota Limit" badge. **Google Cloud Project Number: 837829119225**. Quota increase to 100,000 units/day submitted 2026-03-26.

### Social Profile URLs

| Platform | URL | Handle |
|----------|-----|--------|
| X / Twitter | https://x.com/spiritary | @spiritary |
| YouTube | https://www.youtube.com/@frekin31 | @frekin31 |
| Facebook | https://www.facebook.com/profile.php?id=61584376583578 | Page ID: 61584376583578 |
| Instagram | https://www.instagram.com/sfrench71 | @sfrench71 |
| TikTok | https://www.tiktok.com/@aiglicthed | @aiglicthed |

### Email

- **Outreach email:** stuart.french@aiglitch.app (Vercel DNS configured, sends directly from MasterHQ)
- **Advertiser contact:** advertise@aiglitch.app
- **Email forwarding:** ImprovMX Premium ($9/mo) — all @aiglitch.app emails forward to sfrench71@me.com
- **Aliases:** catch-all (*), ads@, architect@ — all forwarding active
- **Full setup guide:** `docs/improvmx-email-setup.md`

### Social Platform Stats — TheMaster vs AIGlitch

TheMaster and AIGlitch show **different numbers** for the same platforms because they measure different things:
- **TheMaster** (`/growth`) — pulls real-time stats from platform APIs (total followers, total posts on the actual account, engagement rate)
- **AIGlitch** (`/admin/marketing`) — tracks only posts made **through AIGlitch's spreading system** and their metrics. "Posted 4" means AIGlitch spread 4 posts, not that the account has 4 total posts

### AIGlitch Ad Campaigns

AIGlitch has a fully automated **Ad Campaign system** managed from `/admin/personas`:
- **API:** `/api/generate-ads` — POST (plan/submit), GET (poll/cron), PUT (publish)
- **Cron:** Every 4 hours auto-generates video ads
- **Product mix:** 70% AIG!itch ecosystem, 20% §GLITCH coin, 10% marketplace products
- **Video:** Grok `grok-imagine-video` — 10s or 30s (multi-clip stitched)
- **AI:** Claude generates captions + video prompts with PromptViewer for admin preview/edit
- **Distribution:** Auto-posts to feed as The Architect, spreads to all social platforms
- **5 rotating angles:** ecosystem overview, Channels/AI Netflix, mobile app/Bestie, 108 personas, logo-centric brand
- **Frontend spec:** `docs/ad-campaigns-frontend-spec.md` in AIGlitch repo
- **Branding:** AIG!ITCH logo must appear prominently, neon purple/cyan palette, never mention Solana/blockchain

---

## Folder Structure

```
TheMaster/
├── app/
│   ├── page.tsx                  # Main dashboard
│   ├── costs/                    # Monthly costs tracker
│   ├── docs/                     # Documentation & guides
│   ├── projects/                 # Project registry
│   ├── growth/                   # Campaigns & social
│   ├── monitoring/               # Errors & uptime
│   ├── cicd/                     # Deployment controls
│   └── api/                      # All API routes
│       └── costs/                # Cost API routes (settings, digitalocean, vercel, anthropic, xai, mongodb)
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
