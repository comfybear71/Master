# TheMaster — Claude Code Initial Build Prompt

Paste this entire prompt into Claude Code when you first open the TheMaster repo.

---

## PROMPT START — COPY EVERYTHING BELOW THIS LINE

You are the AI brain of **TheMaster** — a unified command and control platform built for a solo developer managing multiple live projects simultaneously. Your job is to build, monitor, fix, deploy, and grow every project from this single platform.

Read `CLAUDE.md` and `HANDOFF.md` in this repo before doing anything else. They contain the full context of what this platform does and the current state of work.

---

## WHAT YOU ARE BUILDING

Build a full-stack **Next.js 14** application (App Router) with the following structure:

```
TheMaster/
├── app/
│   ├── page.tsx                  # Main dashboard
│   ├── projects/                 # Project registry & management
│   ├── growth/                   # Social media & campaigns
│   ├── monitoring/               # Errors, logs, uptime
│   ├── cicd/                     # Deployment controls
│   └── api/
│       ├── github/               # GitHub API routes
│       ├── vercel/               # Vercel API routes
│       ├── mongodb/              # MongoDB Atlas API routes
│       ├── social/               # X, YouTube, Facebook, Instagram, TikTok
│       ├── projects/             # Project registry CRUD
│       └── ai/                   # Claude + Grok AI routes
├── components/
│   ├── dashboard/
│   ├── projects/
│   ├── social/
│   └── monitoring/
├── lib/
│   ├── github.ts
│   ├── vercel.ts
│   ├── mongodb.ts
│   ├── social.ts
│   └── ai.ts
├── CLAUDE.md
├── HANDOFF.md
└── .env.local
```

---

## PHASE 1 — BUILD THIS FIRST

### 1. Project Registry System
- MongoDB collection called `projects`
- Each project document:
```json
{
  "name": "ProjectName",
  "repo": "github-username/repo-name",
  "vercelProjectId": "xxxx",
  "stack": "Next.js / Supabase / Stripe",
  "description": "What this project does",
  "status": "active",
  "liveUrl": "https://example.com",
  "addedAt": "2025-01-01"
}
```
- UI to add new project by entering repo name — system auto-reads CLAUDE.md and HANDOFF.md from that repo and populates the rest
- All projects shown as cards on dashboard with live status indicators

### 2. Dashboard (Main Page)
Dark theme, professional, at-a-glance overview showing:
- Total projects count
- Live vs broken deployments (Vercel API)
- GitHub: recent commits across all repos
- MongoDB Atlas: cluster health
- Social media: follower counts for X, YouTube, Facebook, Instagram, TikTok
- Uptime status for all live URLs
- Recent errors detected
- Active campaigns

### 3. GitHub Integration
Connect to GitHub API with token from env:
- List all repos
- Show recent commits per project
- Show open issues and PRs
- Read CLAUDE.md and HANDOFF.md from any repo on demand
- Trigger GitHub Actions workflows

### 4. Vercel Integration
Connect to Vercel API with token from env:
- Show all projects and deployment status
- Show build logs
- Detect failed deployments and surface errors
- Trigger redeploys

### 5. MongoDB Atlas Integration
Connect to MongoDB Atlas API:
- Show cluster status
- List databases per project
- Show storage and connection stats

---

## PHASE 2 — BUILD AFTER PHASE 1 IS WORKING

### Dev Orchestrator (AI Error Fixer)
- Pull error logs from Vercel for all projects
- Send errors + CLAUDE.md context to Claude API
- Claude suggests fix
- Fix is shown to user for approval
- On approval: Claude Code applies fix, commits, pushes, Vercel auto-deploys
- HANDOFF.md is automatically updated after every fix

### Plug & Play New Project Flow
When user adds a new repo:
1. Platform connects to GitHub and reads CLAUDE.md + HANDOFF.md
2. Auto-detects stack (Next.js, Vite, etc.)
3. Finds matching Vercel project
4. Registers in MongoDB projects collection
5. Monitoring starts immediately
6. No manual config needed

---

## PHASE 3 — GROWTH ENGINE

### Social Media Hub
- Unified view of all platforms: X, YouTube, Facebook, Instagram, TikTok
- Follower counts and growth charts
- Recent posts with engagement stats
- All using pre-approved APIs already set up

### AI Campaign Generator
- User types: "Create a campaign for [Project] targeting [audience]"
- Claude API generates:
  - Posts for each platform (correctly formatted per platform)
  - Hashtags
  - Optimal posting times
  - Campaign schedule
- User reviews and approves
- Posts are scheduled and published automatically via APIs

### Viral Trigger System
- Monitor engagement across all platforms
- When a post exceeds engagement threshold → auto-boost with follow-up content
- Notify user of viral opportunities in real time

---

## ENVIRONMENT VARIABLES NEEDED

Create `.env.local` with these — user will fill in values:

```env
# GitHub
GITHUB_TOKEN=
GITHUB_USERNAME=

# Vercel
VERCEL_TOKEN=
VERCEL_TEAM_ID=

# MongoDB Atlas
MONGODB_URI=
MONGODB_ATLAS_PUBLIC_KEY=
MONGODB_ATLAS_PRIVATE_KEY=
MONGODB_ATLAS_PROJECT_ID=

# Social Media
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_SECRET=
YOUTUBE_API_KEY=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_ACCESS_TOKEN=
INSTAGRAM_ACCESS_TOKEN=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# AI
ANTHROPIC_API_KEY=
GROK_API_KEY=

# Auth (protect the dashboard)
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Uptime monitoring
UPTIME_CHECK_INTERVAL_MINUTES=5
```

---

## DESIGN REQUIREMENTS

- Dark theme only — deep navy/charcoal backgrounds (#0a0f1e base)
- Electric blue accents (#00d4ff)
- Green for healthy/live (#00ff88)
- Red for errors (#ff4444)
- Amber for warnings (#ffaa00)
- Font: JetBrains Mono for data, Inter for UI
- Smooth animations on status updates
- Mobile responsive
- Real-time updates using polling every 60 seconds

---

## RULES YOU MUST FOLLOW

1. Always read CLAUDE.md and HANDOFF.md before starting any work
2. Always update HANDOFF.md after completing any significant work
3. Never touch trading bot projects without explicit user confirmation — they handle live money
4. Always show user a preview before pushing any fix to production
5. When adding a new feature, check if it breaks any existing project first
6. Use TypeScript strictly throughout
7. All API keys come from environment variables — never hardcode
8. Every API route must have error handling

---

## START HERE

1. Scaffold the Next.js 14 app with TypeScript and Tailwind
2. Set up MongoDB connection
3. Build the project registry (add/list projects)
4. Build the main dashboard UI
5. Connect GitHub API
6. Connect Vercel API
7. Show me the dashboard working with real data before moving to Phase 2

## PROMPT END
