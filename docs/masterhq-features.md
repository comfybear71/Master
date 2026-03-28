# MasterHQ — Complete Feature Reference

> **Last updated:** 2026-03-27
> **URL:** https://masterhq.dev
> **Repo:** github.com/comfybear71/Master
> **This is an evolving document — update as features are added.**

---

## Platform Overview

MasterHQ is a unified command and control platform for managing multiple live production projects. It monitors all GitHub repos, Vercel deployments, social media accounts, and provides campaign management, prospect CRM, and documentation — all from one place.

**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, MongoDB, Claude API, Grok API
**Auth:** NextAuth.js (single user)
**Hosting:** Vercel
**Domain:** masterhq.dev

---

## Pages

### Dashboard (`/`)
**What it does:** Main overview showing all projects, recent commits, deployments, errors, and social follower counts at a glance.
- Project cards with GitHub/Vercel status
- Recent commit feed across all repos
- Deployment list with status badges
- Social follower widget (X, YouTube, Facebook, Instagram, TikTok)
- Error alert banner for active issues

### Projects (`/projects`)
**What it does:** Project registry — add, view, and manage all registered projects.
- Add new projects (auto-reads CLAUDE.md and HANDOFF.md from GitHub)
- View project details (stack, Vercel project, live URL)
- Remove projects
- Auto-discovers Vercel project for each repo

### Monitoring (`/monitoring`)
**What it does:** Error detection and uptime monitoring across all projects.
- Website uptime checks for all live URLs
- Vercel build error detection and log viewing
- AI error analysis (Claude analyzes errors and suggests fixes)
- Fix suggestion UI (approve before applying)
- Auto-commit fixes via GitHub API

### CI/CD (`/cicd`)
**What it does:** Deployment controls for all Vercel projects.
- View all deployments across projects
- Trigger redeploys
- View build logs
- Deployment status badges

### Growth (`/growth`)
**What it does:** Social media management, campaigns, viral detection, and sponsor outreach.

**Tabs:**
- **Social Overview** — Platform cards (X, YouTube, Facebook, Instagram, TikTok) showing followers, posts, engagement, recent posts. TikTok has sandbox/live toggle + API monitoring log. YouTube shows cached stats with "Quota Limit" badge when quota exceeded.
- **Campaigns** — AI-generated multi-platform campaigns. Create with brief + project + audience → Claude generates 5 posts (one per platform). Preview, approve, publish.
- **Outreach** — AI-generated sponsor pitch emails. Enter company/industry/tone → Claude generates personalized email with real platform stats. Editable subject/body. Send button (mailto). Initial + follow-up email.
- **Viral Alerts** — Scans for posts performing 2.5x above average. AI generates follow-up posts to capitalize on momentum.

### Prospects (`/prospects`)
**What it does:** Sponsor CRM with 130+ prospects imported from Excel.
- Import from Excel spreadsheet (bundled as JSON)
- Searchable/filterable table (company, industry, status, country)
- Status tracking pipeline: New → Contacted → Replied → Meeting → Closed
- One-click AI email generation per prospect
- Bulk email generation (select multiple, generate all)
- Mark as contacted (tracks email count + last contact date)
- Stats dashboard (counts by status and industry)
- Pagination (30 per page)

### Docs (`/docs`)
**What it does:** Documentation hub with sidebar navigation.
- §GLITCH Quest Campaign spec
- Sponsor Email Templates (3 versions)
- Sponsor Target List & Outreach Strategy
- Campaigns & Viral Detection guide
- Phase 4: Command Center spec
- Session logs (dated, preserved permanently)
- YouTube API Quota guide
- xAI Grok Cost Optimization
- TikTok API Setup guide
- Social Media Accounts reference
- Custom markdown renderer (headings, tables, code blocks, lists, links)

### Media Kit (`/media-kit`)
**What it does:** Full-page advertiser media kit for potential sponsors.
- Embedded HTML page with professional design
- Platform overview, ad formats, audience demographics
- Pricing tiers (Starter $500, Growth $1,800/mo, Enterprise custom)
- Contact section (advertise@aiglitch.app)
- Shareable URL: masterhq.dev/media-kit

---

## API Routes

### Social (`/api/social`)
| Action | Method | Purpose |
|--------|--------|---------|
| `?action=stats` | GET | Fetch live stats from all 5 platforms |
| `?action=debug` | GET | Show env var status and resolved config |
| `?action=cached` | GET | Return MongoDB cached stats |
| `?action=history` | GET | Historical stats (last 90 entries) |
| `?action=configure` | POST | Save social config |
| `?action=clear-db` | POST | Clear stale DB records |

### Campaigns (`/api/campaigns`)
| Action | Method | Purpose |
|--------|--------|---------|
| (none) | GET | List recent campaigns |
| `?action=generate` | POST | Generate AI campaign (brief, project, audience) |
| `?action=publish` | POST | Publish all posts in a campaign |
| `?action=delete` | POST | Delete a campaign |

### Viral (`/api/viral`)
| Action | Method | Purpose |
|--------|--------|---------|
| (none) | GET | List viral alerts |
| `?action=scan` | POST | Scan for viral posts (2.5x threshold) |
| `?action=generate-followup` | POST | AI generates follow-up for viral post |
| `?action=dismiss` | POST | Dismiss an alert |

### Outreach (`/api/outreach`)
| Action | Method | Purpose |
|--------|--------|---------|
| (none) | GET | List generated emails |
| `?action=generate` | POST | Generate AI pitch email |
| `?action=delete` | POST | Delete an email |

### Prospects (`/api/prospects`)
| Action | Method | Purpose |
|--------|--------|---------|
| (none) | GET | List prospects (with search/filter/pagination) |
| `?action=import` | GET | Import 130+ prospects from bundled JSON |
| `?action=stats` | GET | Prospect counts by status and industry |
| `?action=update-status` | POST | Update prospect pipeline status |
| `?action=generate-email` | POST | Generate AI email for a prospect |
| `?action=mark-contacted` | POST | Mark prospect as contacted (increment counter) |
| `?action=bulk-generate` | POST | Generate emails for multiple prospects (max 10) |

### Topics / News Pipeline (`/api/topics`)
| Action | Method | Purpose |
|--------|--------|---------|
| (none) | GET | Public endpoint — returns fictionalized news topics for AIGlitch (CORS enabled) |
| `?action=generate` | POST | Cron trigger — fetch real news, fictionalize with Claude, store in DB |

**Pipeline:** NewsAPI (real headlines) → Claude (fictionalize names/places) → MongoDB → Public API → AIGlitch reads
**Cron:** Runs every 6 hours (0:00, 6:00, 12:00, 18:00 UTC)
**Topics expire** after 8 hours (with overlap between runs)

### TikTok Auth (`/api/auth/tiktok`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/tiktok` | GET | Initiate OAuth flow (supports `?mode=sandbox`) |
| `/api/auth/tiktok/callback` | GET | OAuth callback — exchanges code for token |
| `/api/auth/tiktok/debug` | GET | Debug token status and test API |

### Other API Routes
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects` | GET/POST | Project CRUD |
| `/api/errors` | GET/POST | Error detection and AI analysis |
| `/api/deployments` | GET/POST | Vercel deployment management |
| `/api/uptime` | GET/POST | Website uptime monitoring |

---

## AI Functions (`lib/ai.ts`)

### `askClaude(systemPrompt, messages)`
Base function for all Claude API calls. Uses `claude-sonnet-4-20250514`.

### `analyzeError(errorLog, projectContext)`
Analyzes Vercel build errors and suggests fixes.

### `generateCampaign(brief, projectName, targetAudience, projectContext)`
Generates a multi-platform campaign with 5 posts (X, YouTube, Facebook, Instagram, TikTok).

### `generateViralFollowUp(platform, originalPost, engagementData)`
Creates a follow-up post to capitalize on a viral post's momentum.

### `generateSponsorEmail(companyName, industry, productDescription, tone, stats)`
Generates personalized sponsor pitch email with real platform stats. Includes initial email + 5-day follow-up. Signs as "Stuie French - The Architect".

### `generateCrossProjectCampaign(projects, brief, targetAudience)`
Generates campaigns that cross-promote multiple projects.

---

## Social Platform Functions (`lib/social.ts`)

### `getAllSocialStats(config)`
Fetches stats from all 5 platforms in parallel.

### `getXStats(username)`
X/Twitter — followers, posts, engagement, recent tweets.

### `getYouTubeStats(channelId)`
YouTube — subscribers, video count, recent videos. Returns cached data on 403 quota.

### `getFacebookStats(pageId)`
Facebook — page followers, posts, engagement.

### `getInstagramStats(userId)`
Instagram — followers, media count, recent posts. Uses FACEBOOK_ACCESS_TOKEN.

### `getTikTokStats()`
TikTok — followers, videos, engagement. Supports sandbox/production mode. Returns monitoring logs.

### `publishToplatform(platform, content, config)`
Publish content to a specific platform (X auto-publish, Instagram Content Publishing API).

---

## UI Components

### `LayoutShell` (`components/LayoutShell.tsx`)
Main layout with sidebar navigation and light/dark mode toggle.

**Sidebar Links:**
- Dashboard, Projects, Monitoring, CI/CD, Growth, Prospects, Terminal, Docs, Media Kit

**Features:**
- Mobile-responsive (hamburger menu)
- Light/dark mode toggle (persists in localStorage)

### Dashboard Components (`components/dashboard/`)
- `StatsCard` — Summary stat card
- `ProjectCard` — Project overview card
- `CommitFeed` — Recent commits list
- `DeploymentList` — Deployment status list

---

## Configuration

### Environment Variables (Vercel)
All configured in Vercel project settings:
- `GITHUB_TOKEN`, `VERCEL_TOKEN`, `MONGODB_URI`
- `ANTHROPIC_API_KEY`, `GROK_API_KEY`
- `X_CONSUMER_KEY/SECRET`, `X_ACCESS_TOKEN/SECRET`
- `GOOGLE_CLIENT_ID/SECRET`, `YOUTUBE_CHANNEL_ID`
- `FACEBOOK_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID`
- `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`
- `TIKTOK_CLIENT_KEY/SECRET`, `TIKTOK_SANDBOX_CLIENT_KEY/SECRET`
- `NEXTAUTH_URL=https://masterhq.dev`

### Design System
- **Theme:** Dark (default) + Light mode
- **Base background:** `#0a0f1e` (dark) / `#f8fafc` (light)
- **Primary accent:** `#00d4ff` (dark) / `#0284c7` (light)
- **Fonts:** Inter (UI), JetBrains Mono (data/code)
- **Polling:** Real-time polling every 60 seconds

---

## Docs Folder (`docs/`)

| File | Purpose |
|------|---------|
| `masterhq-features.md` | **THIS FILE** — complete feature reference |
| `DEV-DROPLET-SETUP.md` | Dev droplet setup guide (Claude Code, ttyd, SSL) |
| `ttyd-setup.md` | ttyd setup for budju droplet (reference only) |
| `glitch-quest-design.md` | §GLITCH Quest Campaign design document |
| `aiglitch-news-topics-client.md` | AIGlitch prompt: connect to MasterHQ news API |
| `aiglitch-sponsor-prompt.md` | AIGlitch prompt: sponsor management system |
| `aiglitch-cost-optimization.md` | AIGlitch prompt: cost reduction ($1,365→$300-500/mo) |
| `aiglitch-30s-video-fix.md` | AIGlitch fix: 30s ads only producing 10s clips |
| `aiglitch-video-stitch-fix.md` | AIGlitch fix: MP4 edts box causing 10s playback |
| `aiglitch-breaking-news-fix.md` | AIGlitch fix: Breaking News stitch debug |
| `aiglitch-breaking-news-urgent-fix.md` | AIGlitch fix: Breaking News field name mismatch |
| `aiglitch_prospect_list.xlsx` | 130+ sponsor prospects spreadsheet |
| `CLAUDE_CODE_PROMPT.md` | Original Claude Code session prompt |
