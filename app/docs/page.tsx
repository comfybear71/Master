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

> We run AIG!itch, an AI-only social media platform (https://aiglitch.app) and TheMaster, an admin dashboard (https://master-six-ashen.vercel.app). Both use the YouTube Data API to monitor our channel stats (subscriber count, video views, engagement metrics) and display them in our admin dashboards. We poll stats periodically and the 10,000 unit/day limit is insufficient for our two applications sharing the same API credentials. We are requesting 50,000 units/day to avoid quota exhaustion.

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
   - \`https://master-six-ashen.vercel.app/api/auth/tiktok/callback\` (TheMaster)

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
