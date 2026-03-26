"use client";

import { useState } from "react";

interface DocSection {
  id: string;
  title: string;
  icon: string;
  content: string;
}

const docs: DocSection[] = [
  {
    id: "campaigns-viral",
    title: "Campaigns & Viral Detection",
    icon: "\u26A1",
    content: `## Campaigns, Viral Detection & Sponsored Ads

### Overview

TheMaster's Growth Engine manages campaigns and viral detection across **all registered projects** — not just AIGlitch. Any project can have campaigns, viral monitoring, and sponsored content.

---

### 1. Campaign System (TheMaster)

TheMaster can generate and publish marketing campaigns for any project across all 5 social platforms.

**Current Flow:**
1. Go to **Growth** → **+ Campaign**
2. Select a project, write a brief, define audience
3. Claude AI generates platform-specific posts (X, YouTube, Facebook, Instagram, TikTok)
4. Preview and approve each post
5. Publish — auto-posts to selected platforms

**What Each Campaign Includes:**
- AI-generated text optimized per platform (character limits, hashtag style, tone)
- Optional image/video attachment
- Scheduled or immediate publishing
- Performance tracking (likes, comments, shares, views)

**Future Enhancements:**
- Scheduled campaigns (post at optimal times per platform)
- A/B testing (generate multiple versions, track which performs better)
- Campaign templates for recurring promotions
- Cross-project campaigns (promote Togogo on AIGlitch's audience, etc.)
- Email campaign generation (see Sponsor Outreach section below)

---

### 2. Viral Detection System

TheMaster monitors all social platforms for viral content using a **2.5x engagement threshold**.

**How It Works:**
1. Every refresh, TheMaster pulls recent posts from all platforms
2. Calculates engagement rate per post: \`(likes + comments + shares) / followers * 100\`
3. If any post exceeds **2.5x the platform average**, it's flagged as viral
4. Alert appears on the Growth page under **Viral Alerts**
5. Claude AI auto-generates follow-up content to capitalize on the viral moment

**Viral Response Workflow:**
1. Alert fires: "Your post on X got 10x normal engagement!"
2. Click the alert to see the viral post
3. AI suggests 3-5 follow-up posts to ride the momentum
4. Approve and publish immediately across all platforms

**Platform-Specific Thresholds:**
| Platform | Avg Engagement | Viral Threshold (2.5x) |
|----------|---------------|----------------------|
| X | 0.5-2% | >5% |
| YouTube | 2-5% | >12% |
| Facebook | 0.5-1% | >2.5% |
| Instagram | 1-3% | >7.5% |
| TikTok | 3-8% | >20% |

**Future Enhancements:**
- Real-time push notifications (not just on page refresh)
- Auto-publish follow-up content without approval (opt-in)
- Viral trend detection across platforms (not just your own posts)
- Historical viral analysis — what content types go viral for you

---

### 3. AIGlitch Sponsored Ad Campaigns

AIGlitch has a fully working **product placement ad system** where sponsors pay to have their product featured in AI-generated video ads.

#### Current Model (Manual)

1. **Sponsor contacts you** — wants their product in an AIGlitch ad
2. **They pay cash** (bank transfer, PayPal, etc.)
3. **You buy GLITCH coin** with their cash payment
4. **Execute their ad** via AIGlitch Ad Campaign system (\`/admin/personas\`)
5. **AI generates video** featuring their product with AIG!itch branding
6. **Auto-spreads** to X, TikTok, Instagram, Facebook, YouTube, Telegram

#### Ad Campaign Features (Already Built)

- **10 ad styles:** hype_beast, cinematic, retro, meme, infomercial, luxury, anime, glitch_art, minimal, auto
- **Product placement:** Sponsor's product appears in AI-generated video
- **10s or 30s videos** via Grok grok-imagine-video
- **5 rotating angles** for ecosystem ads
- **PromptViewer** — edit the AI prompt before generating
- **Auto-spread** to all 6 social platforms
- **Full spec:** See "xAI Grok Cost Optimization" doc and AIGlitch \`docs/ad-campaigns-frontend-spec.md\`

#### Pricing Model (Suggested)

| Package | Duration | Platforms | Price (GLITCH) | Cash Equivalent |
|---------|----------|-----------|---------------|----------------|
| Basic | 10s video | 3 platforms | 500 GLITCH | $50 |
| Standard | 10s video | All 6 platforms | 1,000 GLITCH | $100 |
| Premium | 30s video | All 6 platforms | 2,500 GLITCH | $250 |
| Ultra | 30s + 3x follow-ups | All 6 + pinned | 5,000 GLITCH | $500 |

*Prices are suggested starting points — adjust based on demand*

#### Future: Self-Service Sponsorship Portal

**Phase 1 (Current):** Manual — sponsor pays cash, you buy GLITCH, execute ad
**Phase 2:** Sponsor buys GLITCH coin themselves on the marketplace, submits ad request
**Phase 3:** Full self-service portal:
- Sponsor creates account on AIGlitch
- Browses ad packages and styles
- Uploads product info / images / brief
- Pays in GLITCH coin directly
- AI generates ad preview
- Sponsor approves → auto-published
- Performance dashboard for sponsor

---

### 4. Sponsor Outreach — Email Campaigns

Generate professional outreach emails to potential advertisers.

#### How to Use (From MasterHQ)

1. Go to **Growth** → **+ Campaign**
2. Select campaign type: "Sponsor Outreach" (future feature)
3. Define target: industry, company size, relevance
4. Claude AI generates personalized email templates
5. Review and send

#### Email Template Structure

**Subject lines (AI-generated, A/B testable):**
- "Your product + 108 AI personas = viral content"
- "AI-generated ads for [Product] — here's what it looks like"
- "AIG!itch: Where AI creates ads that humans actually watch"

**Email body should include:**
- What AIG!itch is (AI-only social network, 96+ personas, growing audience)
- What sponsored ads look like (link to example videos)
- Audience stats (followers across platforms, engagement rates, demographics)
- Pricing packages
- Call to action: "Reply to discuss" or "Book a call"
- Link to aiglitch.app

#### Target Sponsor Categories

| Category | Why They'd Sponsor | Example Companies |
|----------|-------------------|-------------------|
| AI/Tech startups | Aligned audience, tech-forward | AI tools, SaaS platforms |
| Crypto projects | GLITCH coin ecosystem overlap | DeFi, NFT marketplaces |
| Gaming | AI persona crossover audience | Indie games, gaming gear |
| Creator tools | Content creator audience | Video editors, design tools |
| Meme brands | Perfect for meme-style ads | Novelty products, meme coins |
| Web3/Metaverse | Future-focused audience | Virtual worlds, DAOs |

---

### 5. Cross-Project Campaign Strategy

MasterHQ manages campaigns for ALL projects, not just AIGlitch:

| Project | Campaign Focus | Target Audience |
|---------|---------------|-----------------|
| **AIGlitch** | Sponsored ads, ecosystem promotion | AI enthusiasts, crypto, creators |
| **Togogo** | Product launches, seasonal sales | Online shoppers, deal seekers |
| **Mathly** | Student acquisition, parent outreach | Students, parents, teachers |
| **AFL Edge** | Season predictions, match previews | AFL fans, sports bettors |
| **Budju** | Trading features, token promotion | Crypto traders |
| **Glitch App** | Mobile app installs, Bestie features | Mobile users, AI chat fans |

**Cross-promotion opportunities:**
- AIGlitch personas promote Togogo products (paid in GLITCH)
- Mathly educational content shared via AIGlitch channels
- AFL Edge predictions go viral on X via TheMaster campaigns
- All projects drive traffic to each other

---

### 6. Metrics to Track

| Metric | Description | Where |
|--------|-------------|-------|
| **Impressions** | Times post was displayed on screen | Growth page per platform |
| **Engagement rate** | (likes + comments + shares) / followers | Growth page per platform |
| **Click-through rate** | Clicks to your site / impressions | Platform analytics |
| **Viral coefficient** | How many new followers each viral post brings | Viral Alerts |
| **Sponsor ROI** | Views/engagement on sponsored ads vs price paid | Ad campaign results |
| **Cost per acquisition** | Total ad spend / new followers gained | Campaign analytics |
| **Revenue per ad** | GLITCH coin earned per sponsored video | AIGlitch admin |

---

### Quick Start Checklist

- [x] All 5 social platforms connected (X, YouTube, Facebook, Instagram, TikTok)
- [x] Campaign generator working (Claude AI + multi-platform publishing)
- [x] Viral detection active (2.5x threshold)
- [x] AIGlitch ad campaign system working (10s/30s videos, 10 styles, auto-spread)
- [x] Sponsored product placement working (manual cash → GLITCH flow)
- [ ] Scheduled campaigns (post at optimal times)
- [ ] Email outreach templates for sponsor acquisition
- [ ] Self-service sponsor portal on AIGlitch
- [ ] Cross-project campaign orchestration
- [ ] Push notifications for viral alerts`,
  },
  {
    id: "phase4-spec",
    title: "Phase 4: Command Center",
    icon: "\u2318",
    content: `## Phase 4 — Command Center Specification

**Goal:** Turn MasterHQ into the single application to rule all projects. Browse code, ask questions, make changes, fix errors, and document everything — all from one place.

**Status:** Planned — to be built in upcoming sessions

---

### Core Features

#### 1. AI Assistant (Ask Anything)

A chat-like interface where you can ask questions about any registered project:

- **"What does the auth flow look like in AIGlitch?"** — Claude reads the repo and explains
- **"Why is the TikTok posting failing?"** — Reads error logs + code and diagnoses
- **"How do I add a new cron job?"** — Reads vercel.json and constants.ts, gives instructions
- **"Show me all API routes in Togogo"** — Scans the repo and lists them

**How it works:**
- Select a project from dropdown (or ask about MasterHQ itself)
- Type a question in natural language
- Backend reads relevant files via GitHub API
- Claude API analyzes and responds
- Conversation history preserved per project

#### 2. Code Browser & Editor

Browse and edit files across all registered projects:

- **File tree sidebar** — browse any repo's folder structure via GitHub API
- **Code viewer** with syntax highlighting — read any file
- **Edit mode** — modify files inline with a code editor
- **Diff preview** — see changes before committing
- **Commit & push** — saves changes via GitHub API with commit message
- **Auto-trigger Vercel deploy** after push

**Supported operations:**
- View any file in any repo
- Edit single or multiple files
- Create new files
- Delete files
- Create branches for changes

#### 3. AI Fix & Improve

Extend the existing Phase 2 AI error fixer into a general-purpose tool:

- **Fix errors** — detect Vercel build errors, suggest and apply fixes
- **Improve code** — ask Claude to refactor, optimize, or add features
- **Review changes** — AI reviews your edits before commit
- **Bulk operations** — apply the same fix across multiple files/projects

**Workflow:**
1. Select project → see active errors (from Vercel build logs)
2. Click "AI Fix" → Claude reads the error + relevant code
3. Shows proposed fix with diff preview
4. Click "Apply" → commits and deploys
5. Monitor build result in real-time

#### 4. Build & Deploy Monitor

Real-time visibility into all Vercel deployments:

- **Live build log streaming** — watch builds as they happen
- **One-click redeploy** for any project
- **Rollback** to previous deployment
- **Environment variable editor** — view/edit Vercel env vars
- **Build status badges** on all project cards

#### 5. Centralized Documentation Hub

Everything documented in one place (expanding current /docs page):

- **Session logs** — dated entries for every major session (auto-preserved)
- **Project guides** — auto-read CLAUDE.md and HANDOFF.md from each repo
- **API references** — generated from scanning route files
- **Runbooks** — step-by-step guides for common tasks (YouTube quota, TikTok setup, etc.)
- **Decision log** — why we chose X over Y
- **Search** across all documentation

#### 6. Cross-Project Dashboard

Enhanced dashboard showing everything at a glance:

- **Health status** per project (build passing, uptime, last deploy)
- **Recent activity** across all repos (commits, PRs, issues)
- **Error summary** — active errors across all projects
- **Social media stats** (already built in Phase 3)
- **Cost tracking** — AI API costs across all projects

---

### UI Layout

\`\`\`
+--------------------------------------------------+
| MasterHQ - Command Center                        |
+--------+-----------------------------------------+
|        |  [Project Selector: AIGlitch v]         |
| Side   |                                         |
| bar    |  +-----------------------------------+  |
|        |  | AI Chat / Question Panel          |  |
| - Dash |  |                                   |  |
| - Proj |  | > What routes handle posting?     |  |
| - Mon  |  |                                   |  |
| - CI/CD|  | Claude: The posting routes are... |  |
| - Grow |  +-----------------------------------+  |
| - Docs |                                         |
| - CMD  |  +-----------------------------------+  |
|        |  | Code Editor / File Browser        |  |
|        |  | [File Tree] | [Editor Panel]      |  |
|        |  |             | [Diff Preview]      |  |
|        |  +-----------------------------------+  |
|        |                                         |
|        |  +-----------------------------------+  |
|        |  | Build Log / Deploy Monitor        |  |
|        |  | [Live streaming build output]     |  |
|        |  +-----------------------------------+  |
+--------+-----------------------------------------+
\`\`\`

---

### Technical Implementation

#### API Routes Needed

| Route | Purpose |
|-------|---------|
| \`/api/command/ask\` | AI assistant — send question + project, get answer |
| \`/api/command/files\` | Browse repo file tree via GitHub API |
| \`/api/command/file\` | Read/write single file via GitHub API |
| \`/api/command/commit\` | Commit changes to a repo |
| \`/api/command/diff\` | Generate diff preview before committing |
| \`/api/command/build-log\` | Stream Vercel build logs |
| \`/api/command/redeploy\` | Trigger Vercel redeploy |
| \`/api/command/env-vars\` | Read/edit Vercel environment variables |
| \`/api/command/errors\` | Get active errors across all projects |
| \`/api/command/docs\` | Read CLAUDE.md/HANDOFF.md from any project |

#### Key Dependencies

- **GitHub API** — already integrated (read files, commit, push)
- **Vercel API** — already integrated (deployments, build logs, redeploy)
- **Claude API** — already integrated (AI analysis, suggestions)
- **MongoDB** — store conversation history, session logs, cached docs
- **Monaco Editor** — VS Code's editor component for the browser (or CodeMirror)

#### What We Already Have (Reusable)

- GitHub file reading (\`getRepoFileContent()\`)
- Vercel build log fetching
- AI error analysis (Claude API)
- Auto-commit via GitHub API
- Project registry in MongoDB

#### New Components Needed

- \`CommandCenter\` page (\`/command\`)
- \`AIChat\` component — question/answer panel
- \`FileBrowser\` component — repo file tree
- \`CodeEditor\` component — syntax-highlighted editor
- \`DiffViewer\` component — before/after comparison
- \`BuildLogStream\` component — live build output
- \`ProjectSelector\` component — dropdown for switching projects

---

### Build Order (Recommended)

**Sprint 1 — AI Assistant**
- AI chat panel with project selector
- Reads files from GitHub, sends to Claude, displays answers
- Conversation history per project

**Sprint 2 — Code Browser**
- File tree sidebar (GitHub API)
- Code viewer with syntax highlighting
- Read-only browsing of any repo

**Sprint 3 — Code Editor**
- Edit mode on files
- Diff preview
- Commit & push via GitHub API
- Auto-trigger Vercel deploy

**Sprint 4 — Build Monitor**
- Live build log streaming
- One-click redeploy
- Error detection + AI fix suggestions

**Sprint 5 — Documentation Hub**
- Auto-pull CLAUDE.md/HANDOFF.md from all repos
- Search across all docs
- Session log management

---

### What This Replaces

Once Phase 4 is complete, you'll be able to do **almost everything** from masterhq.dev:

| Task | Before | After |
|------|--------|-------|
| Read project code | Open GitHub/VS Code | Browse in MasterHQ |
| Fix errors | Open Claude Code CLI | Ask AI in MasterHQ |
| Edit files | Clone repo + edit + push | Edit in MasterHQ editor |
| Check builds | Open Vercel dashboard | View in MasterHQ |
| Monitor social | Open each platform | Growth page |
| Read docs | Open repo CLAUDE.md | Docs page |
| Ask questions | Start new Claude session | AI Chat in MasterHQ |

**What you'll still need external tools for:**
- Running local tests/builds (no server-side execution)
- Complex multi-file refactors (better in VS Code/Claude Code)
- Database management (MongoDB Atlas)
- Domain/DNS management (Vercel dashboard)`,
  },
  {
    id: "session-2026-03-26",
    title: "Session Log: 26 Mar 2026",
    icon: "\u2B50",
    content: `## Session Log — 26 March 2026

### What Was Done

#### Instagram Fix
- **Problem:** Instagram showed "Cannot parse access token" error on Growth page
- **Root Cause:** Code tried \`INSTAGRAM_ACCESS_TOKEN\` first, which was invalid/expired. Instagram Business API uses \`FACEBOOK_ACCESS_TOKEN\` (Facebook Page token)
- **Fix:** Reversed priority — now uses \`FACEBOOK_ACCESS_TOKEN\` first, \`INSTAGRAM_ACCESS_TOKEN\` as fallback only
- **Result:** Instagram now shows 3 followers, 109 posts, Connected

#### TikTok Integration (Full Setup)
- **App approved** by TikTok Developer Portal (Login Kit + Content Posting API)
- **Scopes:** user.info.basic, user.info.stats, video.publish, video.upload, video.list
- **Redirect URIs configured:**
  - \`https://aiglitch.app/api/auth/callback/tiktok\` (AIGlitch)
  - \`https://masterhq.dev/api/auth/tiktok/callback\` (TheMaster)
- **Sandbox/Live toggle** added to TikTok card on Growth page
- **API monitoring log** added — shows every step (token lookup, API calls, responses)
- **Sandbox keys** added to Vercel: TIKTOK_SANDBOX_CLIENT_KEY, TIKTOK_SANDBOX_CLIENT_SECRET
- **TikTok working in sandbox:** 31 followers, 27 posts, 0.7% engagement
- **Terms of Service & Privacy Policy** added to AIGlitch homepage for TikTok compliance
- **Content Posting API audit** submitted to TikTok
- **Pending:** Production review for new redirect URI + user.info.stats + video.list scopes

#### TikTok 401 Fix
- **Problem:** TikTok showed "Authorize TikTok" button even when token existed but got 401
- **Fix:** When token exists but is rejected, show "Connected" with informative error instead of authorize button

#### YouTube Quota Handling
- **Problem:** YouTube showed red "Error" badge with raw 403 JSON when daily quota exceeded
- **Fix:** Returns cached stats from MongoDB when quota is hit
- **UI:** Shows amber "Quota Limit" badge, quota usage bar (100% used), "cached data" note
- **Quota increase submitted** to Google (requesting 100,000 units/day, up from 10,000)
- **Google Cloud Project Number:** 837829119225

#### Social Platform Profile Links
- All platform cards on Growth page now have clickable links to actual profiles
- **X:** https://x.com/spiritary
- **YouTube:** https://www.youtube.com/@frekin31
- **Facebook:** https://www.facebook.com/profile.php?id=61584376583578
- **Instagram:** https://www.instagram.com/sfrench71
- **TikTok:** https://www.tiktok.com/@aiglicthed

#### Documentation
- Created **/docs** page on TheMaster with sidebar navigation
- 4 reference guides: YouTube Quota, xAI Grok Costs, TikTok Setup, Social Accounts
- Added Docs link to sidebar navigation
- Updated all CLAUDE.md and HANDOFF.md files (Master + AIGlitch)

#### AIGlitch Instagram Fix (Separate Repo)
- **Problem:** Posts created in glitch-app never reached Instagram
- **Root Cause:** DB seed set Instagram account_id to empty string, extra_config had no instagram_user_id, wrong token env mapping
- **Fix:** Migration to update existing row, seed includes INSTAGRAM_USER_ID, ENV_TOKEN_KEYS maps instagram to FACEBOOK_ACCESS_TOKEN
- **Also fixed:** X token env key was mapped to XAI_API_KEY (Grok) instead of X_ACCESS_TOKEN
- **Status:** Fix applied by AIGlitch team separately

### Pending Items

| Item | Status | ETA |
|------|--------|-----|
| TikTok production review (new URI + scopes) | Submitted | 1-3 days |
| YouTube quota increase (100K units/day) | Submitted | 1-3 business days |
| TikTok Content Posting API audit | Submitted | Unknown |
| Switch TikTok from sandbox to production | After review approval | — |

### Key Numbers After Session

| Platform | Followers | Posts | Status |
|----------|-----------|-------|--------|
| X / Twitter | 967 | 2,434 | Connected |
| YouTube | — | — | Quota Limit (cached) |
| Facebook | 24 | 10 | Connected |
| Instagram | 3 | 109 | Connected |
| TikTok | 31 | 27 | Connected (Sandbox) |
| **Total** | **1,025** | — | — |`,
  },
  {
    id: "youtube-quota",
    title: "YouTube API Quota Increase",
    icon: "\u25B6",
    content: `## How to Increase YouTube API Quota

YouTube Data API has a **10,000 units/day free quota** which resets at midnight Pacific. Both TheMaster and AIGlitch share this quota.

### Steps to Request Increase

1. Go to **console.cloud.google.com**
2. Select your project (the one with YouTube Data API enabled)
3. Navigate to **APIs & Services** → **Enabled APIs** → **YouTube Data API v3**
4. Click **Quotas & System Limits**
5. Find **"Queries per day"** (shows 10,000)
6. Click the **pencil/edit icon** next to it
7. Enter your requested limit (recommended: **50,000** or **100,000**)
8. Use this justification:

> We run AIG!itch, an AI-only social media platform (https://aiglitch.app) and TheMaster, an admin dashboard (https://masterhq.dev). Both use the YouTube Data API to monitor our channel stats (subscriber count, video views, engagement metrics) and display them in our admin dashboards. We poll stats periodically and the 10,000 unit/day limit is insufficient for our two applications sharing the same API credentials. We are requesting 50,000 units/day to avoid quota exhaustion.

9. Submit the request

**Timeline:** Google usually approves reasonable increases within 1-3 business days. It's free.

### API Unit Costs

| Operation | Units |
|-----------|-------|
| channels.list | 1 |
| search.list | 100 |
| videos.list | 1 |
| Each page refresh (3 calls) | ~102 |

### Current Usage Pattern

- TheMaster polls on every page refresh
- AIGlitch marketing-metrics cron runs every hour
- Combined: can burn through 10K units in a few hours of active use

### When Quota is Exceeded

- YouTube card shows **"Quota Limit"** badge (amber) instead of error
- Cached stats from last successful fetch are displayed
- Auto-resolves at **midnight Pacific time** daily
- **Do NOT reconnect OAuth** — this is a usage limit, not an auth issue`,
  },
  {
    id: "xai-grok-costs",
    title: "xAI Grok Cost Optimization",
    icon: "\u2726",
    content: `## xAI Grok Cost Optimization Guide

**Goal:** Reduce monthly AI content generation costs (currently $1,000+/month) while maintaining output quality. We generate AI-powered content (posts, images, videos) using Grok models via the xAI API.

**Consoles:** console.x.ai (primary Grok API) and console.x.com (X platform integrations/credits)

---

### 1. Billing & Credit Strategy

**Prepaid Credits (Primary)**
- Set up at https://console.x.ai with prepaid credits as primary billing
- Charged upfront when purchased — safer than invoiced billing
- Buy in optimal amounts to unlock first-purchase or volume bonuses

**Data Sharing Program**
- Requires at least $5 prior spend
- Provides up to **$150/month in free API credits**
- Shares API requests with xAI for training/improvement
- Check eligibility in console

**X API Cross-Credits**
- Spending on X API credits earns up to **20% back** in xAI credits
- Link console.x.com usage where beneficial
- Useful for real-time X data pulls for trending topics

**Spending Controls**
- Set strict monthly spending limits and alerts in console
- Default to prepaid exhaustion stopping usage
- Track total effective cost after all credits/bonuses
- **Target: 40-70% net spend reduction** through credits + optimizations

---

### 2. Model Selection

| Task | Cheap Model | Premium Model | When to Upgrade |
|------|-------------|---------------|-----------------|
| **Text** | Grok 4.1 Fast (~$0.20/M input, $0.50/M output) | Grok 4 / Grok 4.20 | High-complexity reasoning, quality-critical |
| **Images** | grok-imagine-image ($0.02/image) | grok-imagine-image-pro ($0.07/image) | Superior quality needed |
| **Video** | grok-imagine-video (~$0.05-0.07/sec) | N/A | Use sparingly, shortest viable duration |

**Routing Rule:** Use cheaper models for **80%+ of volume**. Classify requests (simple vs complex) and route dynamically.

**Batch API:** For non-urgent work (bulk text, batch images, data processing), use the Batch API for **50% off** standard pricing. Completed within 24 hours. Ideal for daily/weekly content batches.

---

### 3. Technical Optimizations

#### Prompt Caching (Automatic)

xAI automatically caches repeated prompt prefixes at reduced rates.

**Best Practices:**
- Front-load all static content (system prompts, brand guidelines, style instructions, few-shot examples) at the **beginning** of messages
- Append dynamic/content-specific parts at the **end**
- Always set the \`x-grok-conv-id\` HTTP header (use stable conversation/session ID)
- Never modify earlier messages in a conversation — only append
- Monitor cached vs non-cached usage in console Usage Explorer
- **Target: >50-70% cache hit rate**

#### Reduce Token Consumption

- Set strict \`max_tokens\` limits on all outputs
- Use concise system prompts and summarization layers
- Maintain compact "memory" instead of full conversation history
- For long contexts (up to 2M tokens): only use when truly needed
- Implement semantic caching: store and reuse identical/similar previous generations

#### Batching & Queuing

- Queue non-real-time generations → process via Batch API
- Generate multiple image/video variants in one batch call
- Schedule bulk jobs during off-peak hours

---

### 4. Architecture Requirements

**Backend Service (Node.js):**
1. Classify incoming requests (text/image/video, urgency, complexity)
2. Apply model routing, caching logic, and batching
3. Log detailed usage (tokens, cached %, model used, cost estimate)
4. Error handling, retries with backoff, rate-limit awareness

**Integration:**
- Use xAI API via official SDKs or OpenAI-compatible endpoints
- Version control all prompts/templates centrally (maximizes cache hits)
- Environment variables for API keys
- Team-based access in console.x.ai

---

### 5. Content Generation Workflow

| Type | Strategy |
|------|----------|
| **Daily/weekly bulk** | Queue all → Batch API + cheapest models + heavy caching |
| **On-demand (user-triggered)** | Real-time with fast model + caching |
| **Image/Video pipeline** | Optimize prompts for fewer iterations (better first-prompt success = fewer re-generations) |
| **Quality control** | Post-generation validation on sampled outputs only |

---

### 6. Measurement & Targets

- **Baseline** current monthly cost and token/image/video volume
- **Target:** Reduce effective cost per piece of content by **at least 50%** within first month
- Weekly reviews of usage reports from console.x.ai
- Adjust routing, prompts, and batch sizes based on data
- Document all optimizations for maintainability

---

### Key Links

- xAI Console: https://console.x.ai
- xAI Docs: https://docs.x.ai
- X Console: https://console.x.com
- Current AI ratio: 85% Grok / 15% Claude (configured in \`bible/constants.ts\`)
- Cost tracking: \`ai_cost_log\` table + \`/admin\` events page in AIGlitch`,
  },
  {
    id: "tiktok-setup",
    title: "TikTok API Setup",
    icon: "\u266A",
    content: `## TikTok API Integration Guide

### TikTok Developer Portal Setup

1. Create app at https://developers.tiktok.com/
2. **App settings:**
   - Category: Entertainment
   - Platforms: Web
   - Web/Desktop URL: https://aiglitch.app
   - Terms of Service: https://aiglitch.app/terms
   - Privacy Policy: https://aiglitch.app/privacy

3. **Products:**
   - Login Kit (handles OAuth)
   - Content Posting API (enables video posting, Direct Post enabled)

4. **Scopes:**
   - \`user.info.basic\` — display name, avatar, open_id
   - \`user.info.stats\` — follower_count, video_count, likes_count
   - \`video.list\` — list recent videos with engagement stats
   - \`video.publish\` — directly post to user's profile
   - \`video.upload\` — upload drafts

5. **Redirect URIs:**
   - \`https://aiglitch.app/api/auth/callback/tiktok\` (AIGlitch)
   - \`https://masterhq.dev/api/auth/tiktok/callback\` (TheMaster)

### Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| \`TIKTOK_CLIENT_KEY\` | Both | Production client key |
| \`TIKTOK_CLIENT_SECRET\` | Both | Production client secret |
| \`TIKTOK_SANDBOX_CLIENT_KEY\` | Both | Sandbox client key |
| \`TIKTOK_SANDBOX_CLIENT_SECRET\` | Both | Sandbox client secret |

### OAuth Flow

1. **Initiate:** \`GET /api/auth/tiktok?mode=sandbox\` (or \`mode=production\`)
2. User authorizes on TikTok
3. **Callback:** \`GET /api/auth/tiktok/callback\` — exchanges code for token
4. Token stored in MongoDB \`settings.tiktok_oauth\`
5. Tokens expire in ~24h — auto-refresh via refresh_token

### Token Exchange

\`\`\`
POST https://open.tiktokapis.com/v2/oauth/token/
Content-Type: application/x-www-form-urlencoded

client_key, client_secret, code, grant_type=authorization_code, redirect_uri
\`\`\`

### Fetching Stats

\`\`\`
GET https://open.tiktokapis.com/v2/user/info/?fields=follower_count,video_count,likes_count,display_name
Authorization: Bearer <token>
\`\`\`

### Fetching Recent Videos

\`\`\`
POST https://open.tiktokapis.com/v2/video/list/?fields=id,title,like_count,comment_count,view_count,share_count,create_time
Authorization: Bearer <token>
Body: { "max_count": 10 }
\`\`\`

### Key Gotchas

- **Redirect URI must match EXACTLY** — including trailing slashes
- **Sandbox mode** — only works with test users added in Developer Portal
- **Token exchange uses \`application/x-www-form-urlencoded\`** — NOT JSON
- **Access tokens expire in ~24h** — always implement refresh logic
- **Scopes must be approved** — don't request unapproved scopes
- **\`x-grok-conv-id\` header** is NOT related to TikTok (that's xAI)

### TheMaster Integration

- Sandbox/Live toggle on TikTok card in Growth page
- API monitoring log shows every step
- Mode stored in MongoDB — auto-uses matching keys
- Debug: \`GET /api/auth/tiktok/debug\``,
  },
  {
    id: "social-accounts",
    title: "Social Media Accounts",
    icon: "\u2B21",
    content: `## Social Media Account Links

| Platform | URL | Username |
|----------|-----|----------|
| **X / Twitter** | https://x.com/spiritary | @spiritary |
| **YouTube** | https://www.youtube.com/@frekin31 | @frekin31 (Franga French) |
| **Facebook** | https://www.facebook.com/profile.php?id=61584376583578 | Page ID: 61584376583578 |
| **Instagram** | https://www.instagram.com/sfrench71 | @sfrench71 |
| **TikTok** | https://www.tiktok.com/@aiglicthed | @aiglicthed |

### API Credentials (Vercel Env Vars)

All tokens are configured in Vercel for both TheMaster and AIGlitch.

| Platform | Env Vars |
|----------|----------|
| **X** | X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET |
| **YouTube** | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, YOUTUBE_CHANNEL_ID, YOUTUBE_REFRESH_TOKEN |
| **Facebook** | FACEBOOK_ACCESS_TOKEN, FACEBOOK_PAGE_ID |
| **Instagram** | INSTAGRAM_USER_ID (uses FACEBOOK_ACCESS_TOKEN) |
| **TikTok** | TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET + sandbox variants |

### Important Rules

- **Vercel env vars are the SOLE source of truth** — never let DB override them
- **Instagram uses FACEBOOK_ACCESS_TOKEN** (not a separate Instagram token)
- **YouTube 403 = quota limit**, not auth failure
- **TheMaster stats vs AIGlitch stats differ** — TheMaster shows real platform totals, AIGlitch only tracks posts spread through its own system`,
  },
];

export default function DocsPage() {
  const [activeDoc, setActiveDoc] = useState<string>(docs[0].id);

  const currentDoc = docs.find((d) => d.id === activeDoc) || docs[0];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Documentation</h1>
      <p className="text-slate-400 text-sm mb-6">Setup guides, API references, and operational runbooks</p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-base-card rounded-xl border border-slate-800 p-3 space-y-1">
            {docs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setActiveDoc(doc.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  activeDoc === doc.id
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <span className="text-base">{doc.icon}</span>
                <span className="font-medium">{doc.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-base-card rounded-xl border border-slate-800 p-6 md:p-8">
            <div className="prose prose-invert prose-sm max-w-none">
              <DocRenderer content={currentDoc.content} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let inBlockquote = false;
  let blockquoteLines: string[] = [];
  let inList = false;
  let listItems: { level: number; text: string }[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1.5 my-3 text-slate-300">
          {listItems.map((item, i) => (
            <li key={i} className="flex gap-2" style={{ paddingLeft: `${item.level * 16}px` }}>
              <span className="text-accent mt-1 shrink-0">-</span>
              <span><InlineRenderer text={item.text} /></span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushBlockquote = () => {
    if (blockquoteLines.length > 0) {
      elements.push(
        <blockquote key={`bq-${elements.length}`} className="border-l-2 border-accent/40 pl-4 my-4 text-slate-400 italic text-xs leading-relaxed">
          {blockquoteLines.map((l, i) => <p key={i}>{l}</p>)}
        </blockquote>
      );
      blockquoteLines = [];
      inBlockquote = false;
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const header = tableRows[0];
      const body = tableRows.slice(1).filter(r => !r.every(c => /^[-|:\s]+$/.test(c)));
      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-4">
          <table className="w-full text-sm border border-slate-700 rounded-lg">
            <thead>
              <tr className="bg-slate-800/50">
                {header.map((cell, i) => (
                  <th key={i} className="text-left p-2 text-slate-300 font-semibold border-b border-slate-700 text-xs">
                    <InlineRenderer text={cell.trim()} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri} className="border-b border-slate-800 last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="p-2 text-slate-400 text-xs">
                      <InlineRenderer text={cell.trim()} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${elements.length}`} className="bg-black/40 rounded-lg p-3 my-3 overflow-x-auto border border-slate-800">
            <code className="text-[11px] font-mono text-cyan-300 leading-relaxed">{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        flushList();
        flushBlockquote();
        flushTable();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Blockquotes
    if (line.startsWith("> ")) {
      flushList();
      flushTable();
      inBlockquote = true;
      blockquoteLines.push(line.slice(2));
      continue;
    }
    if (inBlockquote && line.trim() === "") {
      flushBlockquote();
      continue;
    }

    // Tables
    if (line.includes("|") && line.trim().startsWith("|")) {
      flushList();
      flushBlockquote();
      inTable = true;
      const cells = line.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      tableRows.push(cells);
      continue;
    }
    if (inTable) {
      flushTable();
    }

    // Lists
    if (/^(\s*)[-*]\s/.test(line)) {
      flushBlockquote();
      flushTable();
      inList = true;
      const match = line.match(/^(\s*)[-*]\s(.+)/);
      if (match) {
        const level = Math.floor(match[1].length / 2);
        listItems.push({ level, text: match[2] });
      }
      continue;
    }
    if (/^\d+\.\s/.test(line.trim())) {
      flushBlockquote();
      flushTable();
      inList = true;
      const match = line.match(/^\s*\d+\.\s(.+)/);
      if (match) {
        listItems.push({ level: 0, text: match[1] });
      }
      continue;
    }
    if (inList && line.trim() === "") {
      flushList();
      continue;
    }
    if (inList && line.trim() !== "") {
      flushList();
    }

    // Empty lines
    if (line.trim() === "") {
      continue;
    }

    // Horizontal rules
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={`hr-${elements.length}`} className="border-slate-700 my-6" />);
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-base font-semibold text-white mt-6 mb-3">
          {line.slice(4)}
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-lg font-bold text-white mt-4 mb-4 pb-2 border-b border-slate-800">
          {line.slice(3)}
        </h2>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${elements.length}`} className="text-slate-300 text-sm leading-relaxed my-2">
        <InlineRenderer text={line} />
      </p>
    );
  }

  // Flush remaining
  flushList();
  flushBlockquote();
  flushTable();

  return <>{elements}</>;
}

function InlineRenderer({ text }: { text: string }) {
  // Process inline markdown: **bold**, `code`, [link](url)
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Code
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Link
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    // Find earliest match
    const matches = [
      boldMatch && { type: "bold", index: remaining.indexOf(boldMatch[0]), match: boldMatch },
      codeMatch && { type: "code", index: remaining.indexOf(codeMatch[0]), match: codeMatch },
      linkMatch && { type: "link", index: remaining.indexOf(linkMatch[0]), match: linkMatch },
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    const first = matches[0]!;
    if (first.index > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, first.index)}</span>);
    }

    if (first.type === "bold") {
      parts.push(<strong key={key++} className="text-white font-semibold">{first.match![1]}</strong>);
    } else if (first.type === "code") {
      parts.push(<code key={key++} className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded text-[11px] font-mono">{first.match![1]}</code>);
    } else if (first.type === "link") {
      parts.push(
        <a key={key++} href={first.match![2]} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          {first.match![1]}
        </a>
      );
    }

    remaining = remaining.slice(first.index + first.match![0].length);
  }

  return <>{parts}</>;
}
