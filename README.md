# MasterHQ

**The one app to rule them all.**

MasterHQ is a unified command and control platform for managing multiple live production projects. Monitor GitHub repos, Vercel deployments, social media, run campaigns, manage sponsor prospects, and document everything — from one place.

## Live

- **URL:** https://masterhq.dev
- **Vercel:** https://master-six-ashen.vercel.app

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- MongoDB
- Claude API (Anthropic)
- Grok API (xAI)
- Vercel

## Features

- **Dashboard** — All projects, commits, deployments, social stats at a glance
- **Projects** — Registry for all repos with auto-read CLAUDE.md/HANDOFF.md
- **Monitoring** — Uptime checks, error detection, AI-powered fix suggestions
- **CI/CD** — Deployment controls, build logs, one-click redeploy
- **Growth** — Social media hub (X, YouTube, Facebook, Instagram, TikTok), campaigns, viral detection, sponsor outreach emails
- **Prospects** — 130+ sponsor CRM with AI email generation
- **Docs** — Complete documentation hub with guides and session logs
- **Media Kit** — Advertiser media kit for sponsor outreach
- **Light/Dark Mode** — Toggle in sidebar

## File Structure

```
Root directory:
├── CLAUDE.md          # Project context for Claude Code sessions
├── HANDOFF.md         # Current state, session logs, next steps
├── README.md          # This file
├── docs/              # ALL other documentation goes here
│   ├── masterhq-features.md
│   ├── aiglitch-*.md  (prompts for AIGlitch sessions)
│   └── ...
├── app/               # Next.js pages and API routes
├── components/        # UI components
└── lib/               # API clients, AI functions, types
```

## Convention

Every repo in our ecosystem follows this structure:
- `CLAUDE.md` — in root (project context for AI sessions)
- `HANDOFF.md` — in root (current state, session logs)
- `README.md` — in root (project overview)
- `docs/` — ALL other .md files go here

## Registered Projects

| Project | Repo | Category |
|---------|------|----------|
| AIG!itch | comfybear71/aiglitch | Marketing |
| Glitch App | comfybear71/glitch-app | Marketing |
| Togogo | comfybear71/togogo | E-commerce |
| Mathly | comfybear71/mathly | Education |
| AFL Edge | comfybear71/AFL-EDGE | Education |
| Budju | comfybear71/budju-xyz | Trading |

## Contact

- **Email:** stuart.french@aiglitch.app
- **Advertiser:** advertise@aiglitch.app
