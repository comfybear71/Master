# AIGlitch Sponsored Ad Campaign System — Build Prompt

> Paste this entire file into a Claude Code session on the AIGlitch repo, branch `claude/review-documentation-4MYvb`.

---

## Context

You are working on the **AIGlitch** codebase. AIGlitch already has a fully automated Ad Campaign system that generates AI-powered video ads and distributes them across 6 social platforms (X, TikTok, Instagram, Facebook, YouTube, Telegram).

**Your task**: Build a Sponsored Ad Campaign system that lets external sponsors pay (in §GLITCH tokens or cash) to have their products featured in AIG!itch-branded video ads, distributed through the existing ad pipeline.

### Existing System Reference

- **Ad campaign admin UI**: `/admin/personas` (collapsible section) — may have moved to `/admin/campaigns`
- **Ad campaign API**: `/api/generate-ads` — POST (plan/submit), GET (poll/cron), PUT (publish)
- **Video generation**: Grok `grok-imagine-video` — 10s standard or 30s extended (multi-clip stitched)
- **AI content**: Claude generates captions + video prompts; PromptViewer component for admin preview/edit
- **Auto-spread**: Posts to feed as The Architect (glitch-000), spreads to X, TikTok, Instagram, Facebook, YouTube, Telegram
- **Database**: Neon Postgres with raw SQL via `@neondatabase/serverless`
- **Migrations**: `src/lib/db.ts` using `safeMigrate()` pattern
- **Admin auth**: `ADMIN_PASSWORD` env var
- **AI split**: Grok (85%) + Claude (15%) — use Claude for email generation specifically
- **Frontend spec**: `docs/ad-campaigns-frontend-spec.md`

### Important Rules

- Always run `npx tsc --noEmit` before pushing
- Branch: `claude/review-documentation-4MYvb`
- Read the project's `CLAUDE.md` and `HANDOFF.md` before starting
- Use existing patterns in the codebase (check how other admin pages, API routes, and DB migrations are structured)
- Reuse the existing `PromptViewer` component wherever AI-generated text needs preview/editing
- Maintain the existing dark theme / neon aesthetic (purple/cyan palette)
- AIG!ITCH branding must appear prominently in all sponsored ads — sponsors get featured placement, not brand takeover

---

## Feature 1: Sponsored Ad Campaign Database Tables

### Table: `sponsors`

Add this migration to `src/lib/db.ts` inside `safeMigrate()`:

```sql
CREATE TABLE IF NOT EXISTS sponsors (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  industry VARCHAR(100),
  website VARCHAR(500),
  status VARCHAR(50) NOT NULL DEFAULT 'inquiry',
  -- status values: 'inquiry', 'contacted', 'negotiating', 'active', 'paused', 'churned'
  glitch_balance INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsors_status ON sponsors(status);
CREATE INDEX IF NOT EXISTS idx_sponsors_email ON sponsors(contact_email);
```

### Table: `sponsored_ads`

```sql
CREATE TABLE IF NOT EXISTS sponsored_ads (
  id SERIAL PRIMARY KEY,
  sponsor_id INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  campaign_id INTEGER,
  -- campaign_id links to existing ad_campaigns table if one exists, otherwise nullable
  product_name VARCHAR(255) NOT NULL,
  product_description TEXT NOT NULL,
  product_image_url VARCHAR(500),
  ad_style VARCHAR(50) NOT NULL DEFAULT 'product_showcase',
  -- ad_style values: 'product_showcase', 'testimonial', 'comparison', 'lifestyle', 'unboxing'
  target_platforms TEXT[] NOT NULL DEFAULT ARRAY['x', 'tiktok', 'instagram', 'facebook', 'youtube', 'telegram'],
  duration INTEGER NOT NULL DEFAULT 10,
  -- duration in seconds: 10 or 30
  package VARCHAR(50) NOT NULL DEFAULT 'basic',
  -- package values: 'basic', 'standard', 'premium', 'ultra'
  glitch_cost INTEGER NOT NULL DEFAULT 0,
  cash_equivalent DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- status values: 'draft', 'pending_review', 'approved', 'generating', 'ready', 'published', 'completed', 'rejected'
  video_url VARCHAR(500),
  post_ids JSONB DEFAULT '[]',
  -- array of {platform, post_id} objects after publishing
  performance JSONB DEFAULT '{}',
  -- cached metrics: {views, likes, shares, clicks}
  follow_ups_remaining INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsored_ads_sponsor ON sponsored_ads(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_ads_status ON sponsored_ads(status);
```

---

## Feature 2: Admin Sponsors Page (`/admin/sponsors`)

Create a new admin page at `src/app/admin/sponsors/page.tsx`.

### Requirements

1. **Auth**: Protected by `ADMIN_PASSWORD` (follow the same pattern as other admin pages)
2. **Layout**: Dark theme, consistent with the rest of the admin UI

### Sections

#### Section A: Sponsor List (top of page)

- Table showing all sponsors with columns: Company Name, Contact, Industry, Status, §GLITCH Balance, Total Spent, Actions
- Status badges with colors: inquiry=gray, contacted=blue, negotiating=amber, active=green, paused=orange, churned=red
- Actions: Edit, View Ads, Delete (with confirmation)
- "Add Sponsor" button opens a modal/form with fields: company_name, contact_email, contact_name, industry, website, notes
- Click a sponsor row to expand/show their sponsored ads

#### Section B: Sponsored Ad Creator (middle of page)

- Form to create a new sponsored ad:
  - Select sponsor (dropdown of active sponsors)
  - Product name (text input)
  - Product description (textarea)
  - Product image URL (text input with preview)
  - Ad style (dropdown: product_showcase, testimonial, comparison, lifestyle, unboxing)
  - Package (dropdown showing the 4 tiers — auto-fills duration, platforms, cost)
  - Target platforms (checkboxes, pre-filled by package)
- "Generate Ad" button calls `/api/generate-ads` with sponsor data
- Shows PromptViewer for the AI-generated caption and video prompt before submission
- "Approve & Generate Video" triggers video generation via Grok
- "Publish" distributes through existing spread system

#### Section C: Email Outreach Generator (bottom of page)

- See Feature 3 below

#### Section D: Inquiries Feed

- List of new inquiries from the public sponsor page (status='inquiry')
- Quick actions: Mark as Contacted, Convert to Active Sponsor, Dismiss
- Shows submission date, company name, email, message

### API Endpoints for Sponsors Admin

#### `GET /api/admin/sponsors`
Returns all sponsors. Supports `?status=active` filter.

#### `POST /api/admin/sponsors`
Creates a new sponsor. Body:
```json
{
  "company_name": "string (required)",
  "contact_email": "string (required)",
  "contact_name": "string",
  "industry": "string",
  "website": "string",
  "notes": "string"
}
```

#### `PUT /api/admin/sponsors`
Updates a sponsor. Body includes `id` and fields to update.

#### `DELETE /api/admin/sponsors?id=123`
Deletes a sponsor and cascades to their ads.

#### `GET /api/admin/sponsors/[id]/ads`
Returns all sponsored ads for a given sponsor.

#### `POST /api/admin/sponsors/[id]/ads`
Creates a new sponsored ad. Body:
```json
{
  "product_name": "string (required)",
  "product_description": "string (required)",
  "product_image_url": "string",
  "ad_style": "product_showcase|testimonial|comparison|lifestyle|unboxing",
  "package": "basic|standard|premium|ultra",
  "target_platforms": ["x", "tiktok", "instagram", "facebook", "youtube", "telegram"]
}
```
The endpoint auto-calculates `duration`, `glitch_cost`, `cash_equivalent`, and `follow_ups_remaining` based on the selected package.

### Package Definitions (use as constants)

```typescript
export const SPONSOR_PACKAGES = {
  basic: {
    name: 'Basic',
    duration: 10,
    platforms: ['x', 'tiktok', 'instagram'],
    glitch_cost: 500,
    cash_equivalent: 50,
    follow_ups: 0,
    pinned: false,
    description: '10s video ad on 3 platforms'
  },
  standard: {
    name: 'Standard',
    duration: 10,
    platforms: ['x', 'tiktok', 'instagram', 'facebook', 'youtube', 'telegram'],
    glitch_cost: 1000,
    cash_equivalent: 100,
    follow_ups: 0,
    pinned: false,
    description: '10s video ad on all 6 platforms'
  },
  premium: {
    name: 'Premium',
    duration: 30,
    platforms: ['x', 'tiktok', 'instagram', 'facebook', 'youtube', 'telegram'],
    glitch_cost: 2500,
    cash_equivalent: 250,
    follow_ups: 0,
    pinned: false,
    description: '30s video ad on all 6 platforms'
  },
  ultra: {
    name: 'Ultra',
    duration: 30,
    platforms: ['x', 'tiktok', 'instagram', 'facebook', 'youtube', 'telegram'],
    glitch_cost: 5000,
    cash_equivalent: 500,
    follow_ups: 3,
    pinned: true,
    description: '30s video + 3 follow-ups on all 6 platforms + pinned'
  }
} as const;
```

---

## Feature 3: Enhance `/api/generate-ads` for Sponsored Content

Modify the existing `/api/generate-ads` endpoint to support sponsored ads.

### Changes to POST (plan/submit)

Add optional fields to the request body:

```typescript
interface GenerateAdsRequest {
  // ... existing fields ...
  sponsored?: {
    sponsor_id: number;
    sponsored_ad_id: number;
    product_name: string;
    product_description: string;
    product_image_url?: string;
    ad_style: string;
    package: string;
  };
}
```

When `sponsored` is present in the request:

1. The AI prompt should instruct Claude/Grok to feature the sponsor's product prominently
2. The AIG!itch logo and branding MUST still appear (top or bottom of video, watermark, or intro/outro)
3. The caption should mention the product naturally, include the sponsor's website if provided, and tag with #ad #sponsored
4. The video prompt should describe the product visually with the AIG!itch neon aesthetic applied

### Sponsored Ad Prompt Template

Use this system prompt for Claude when generating sponsored ad content:

```
You are The Architect, the central AI persona of AIG!itch — a platform with 108 AI personas,
a social network, and a creative ecosystem. You are creating a SPONSORED ad that features
a partner's product while maintaining the AIG!itch brand identity.

SPONSOR PRODUCT:
- Name: {product_name}
- Description: {product_description}
- Style: {ad_style}

RULES:
1. The AIG!itch logo and branding must appear prominently (intro/outro or persistent watermark)
2. Feature the sponsor's product as the HERO of the ad — it should be the main visual focus
3. Frame it as "AIG!itch presents" or "Brought to you by AIG!itch" or "The Architect recommends"
4. Use the neon purple/cyan color palette but incorporate the product's brand colors if mentioned
5. Include #ad and #sponsored in the caption
6. The caption should feel authentic, not corporate — The Architect has personality
7. Never mention blockchain, Solana, or crypto unless the product is crypto-related
8. Duration: {duration} seconds

Generate:
1. A video prompt for Grok grok-imagine-video (visual description only, no dialogue)
2. A social media caption (under 280 chars for X compatibility, longer version for other platforms)
3. A short X-only caption (under 280 chars including hashtags)
```

### Status Flow for Sponsored Ads

```
draft -> pending_review -> approved -> generating -> ready -> published -> completed
                       \-> rejected
```

- `draft`: Just created, no AI content yet
- `pending_review`: AI content generated, waiting for admin review via PromptViewer
- `approved`: Admin approved, ready for video generation
- `generating`: Grok is generating the video
- `ready`: Video generated, ready to publish
- `published`: Distributed to target platforms
- `completed`: Campaign finished, performance metrics collected

Update the `sponsored_ads` table status at each step. Also update `sponsors.glitch_balance` when an ad is published (deduct the cost).

---

## Feature 4: Email Outreach Generator

### API Endpoint: `POST /api/admin/email-outreach`

**Auth**: Requires `ADMIN_PASSWORD` header.

**Request body**:
```json
{
  "company_name": "string (required)",
  "industry": "string (required)",
  "what_they_sell": "string (required)",
  "tone": "formal|casual (default: casual)",
  "sponsor_id": "number (optional — if provided, auto-fills from DB)"
}
```

**Implementation**:

1. If `sponsor_id` is provided, fetch the sponsor from DB and use their info
2. Use the **Claude API** (not Grok) for email generation — this is a text task
3. Fetch real platform stats from the database or cache:
   - Total followers across all platforms
   - Total posts/videos generated
   - Engagement rates
   - Number of active personas (108)
4. Generate a personalized pitch email using this prompt:

```
You are writing a sponsorship pitch email for AIG!itch, a viral AI social platform.

PLATFORM STATS (real data):
- {total_followers} total followers across 6 platforms (X, TikTok, Instagram, Facebook, YouTube, Telegram)
- 108 AI personas that create content 24/7
- Automated video ad generation and cross-platform distribution
- Average engagement rate: {avg_engagement}%

SPONSOR INFO:
- Company: {company_name}
- Industry: {industry}
- Products/Services: {what_they_sell}

TONE: {tone}

PRICING PACKAGES:
- Basic: 10s video ad, 3 platforms — 500 §GLITCH ($50)
- Standard: 10s video ad, all 6 platforms — 1,000 §GLITCH ($100)
- Premium: 30s video ad, all 6 platforms — 2,500 §GLITCH ($250)
- Ultra: 30s video + 3 follow-ups, all platforms + pinned — 5,000 §GLITCH ($500)

Generate:
1. EMAIL SUBJECT LINE — catchy, personalized to their industry
2. EMAIL BODY — formatted in plain text (not HTML), includes:
   - Personal greeting using contact name if available
   - Brief intro of what AIG!itch is (1-2 sentences, make it intriguing)
   - Why their product is a good fit (reference their industry specifically)
   - Platform stats as social proof
   - Mention the pricing packages briefly (recommend one based on their likely budget/industry)
   - Clear CTA (reply to schedule a call, or visit the sponsor page)
   - Sign off as "The AIG!itch Team"
3. FOLLOW-UP SUBJECT LINE — for a follow-up email if no response in 5 days
4. FOLLOW-UP BODY — shorter, references the original email, adds urgency
```

**Response format**:
```json
{
  "subject": "string",
  "body": "string",
  "followup_subject": "string",
  "followup_body": "string",
  "stats_used": {
    "total_followers": 0,
    "total_posts": 0,
    "avg_engagement": "0%",
    "active_personas": 108
  }
}
```

### Admin UI for Email Outreach

Add a collapsible section at the bottom of `/admin/sponsors` page:

1. **Form fields**: Company name, Industry, What they sell, Tone toggle (formal/casual)
2. If a sponsor is selected from the list above, auto-fill the form fields
3. "Generate Email" button calls the API
4. Display results using `PromptViewer` component (allows editing before copying)
5. "Copy to Clipboard" buttons for subject and body separately
6. "Copy All" button that copies the full email (subject + body formatted)
7. Also show the follow-up email in a separate PromptViewer below

---

## Feature 5: Public Sponsor Page (`/sponsor`)

Create a public-facing page at `src/app/sponsor/page.tsx`.

**No auth required** — this is a public landing page.

### Design

- Full dark theme with the AIG!itch neon aesthetic (purple/cyan gradients, glitch effects)
- Mobile responsive
- Sections flow vertically

### Sections

#### Hero Section
- Headline: "Advertise on AIG!itch"
- Subheadline: "Reach audiences across 6 platforms with AI-generated video ads"
- Brief description: AIG!itch has 108 AI personas, generates video content 24/7, and distributes across X, TikTok, Instagram, Facebook, YouTube, and Telegram
- Show real follower count total if available (fetch from a public stats endpoint), otherwise use a placeholder

#### How It Works (3 steps)
1. "Tell us about your product" — icon + short description
2. "AI generates your ad" — mention Grok video generation, AIG!itch branding
3. "Distributed everywhere" — show the 6 platform icons

#### Pricing Packages
Display the 4 tiers as cards:

| | Basic | Standard | Premium | Ultra |
|---|---|---|---|---|
| **Price** | 500 §GLITCH ($50) | 1,000 §GLITCH ($100) | 2,500 §GLITCH ($250) | 5,000 §GLITCH ($500) |
| **Video** | 10s | 10s | 30s | 30s |
| **Platforms** | X, TikTok, Instagram | All 6 | All 6 | All 6 |
| **Follow-ups** | - | - | - | 3 follow-ups |
| **Pinned** | - | - | - | Yes |

Highlight "Standard" as "Most Popular" and "Ultra" as "Best Value".

#### Example Ads (placeholder section)
- Placeholder grid for 3-4 example ad thumbnails/videos
- Text: "Example sponsored ads coming soon" for now
- Later this can pull from published sponsored_ads with status='completed'

#### Contact Form
Fields:
- Company Name (required)
- Contact Email (required)
- Contact Name
- Industry (dropdown: Tech, Gaming, Fashion, Food & Beverage, Health & Fitness, Finance, Education, Entertainment, Other)
- Website URL
- Message / What do you want to advertise? (textarea, required)
- Preferred Package (dropdown: Basic, Standard, Premium, Ultra, Not sure)

On submit:
1. Call `POST /api/sponsor/inquiry`
2. This endpoint inserts into the `sponsors` table with `status = 'inquiry'` and saves the message in `notes`
3. Show a success message: "Thanks! We'll be in touch within 24 hours."

### API: `POST /api/sponsor/inquiry`

**No auth required** (public endpoint).

**Rate limiting**: Add basic rate limiting — max 5 submissions per IP per hour (store in memory or use a simple counter).

**Request body**:
```json
{
  "company_name": "string (required)",
  "contact_email": "string (required)",
  "contact_name": "string",
  "industry": "string",
  "website": "string",
  "message": "string (required)",
  "preferred_package": "string"
}
```

**Validation**:
- `company_name` and `contact_email` are required
- `contact_email` must be a valid email format
- `message` must be at least 10 characters

**Response**: `{ success: true, message: "Inquiry submitted successfully" }`

---

## Implementation Order

Build in this order to minimize broken states:

1. **Database migrations** — Add both tables in `safeMigrate()`
2. **Package constants** — Create `src/lib/sponsor-packages.ts` with the `SPONSOR_PACKAGES` object
3. **Sponsor CRUD API** — `/api/admin/sponsors` (GET, POST, PUT, DELETE)
4. **Sponsored Ads API** — `/api/admin/sponsors/[id]/ads` (GET, POST)
5. **Enhance `/api/generate-ads`** — Add sponsored ad support
6. **Admin page** — `/admin/sponsors` with all 4 sections
7. **Email outreach API** — `/api/admin/email-outreach`
8. **Email outreach UI** — Section C on the admin page
9. **Public sponsor page** — `/sponsor`
10. **Public inquiry API** — `/api/sponsor/inquiry`

After each step, run `npx tsc --noEmit` to verify no type errors.

---

## File Structure (expected new files)

```
src/
├── app/
│   ├── admin/
│   │   └── sponsors/
│   │       └── page.tsx           # Admin sponsors management page
│   ├── sponsor/
│   │   └── page.tsx               # Public sponsor landing page
│   └── api/
│       ├── admin/
│       │   ├── sponsors/
│       │   │   ├── route.ts       # Sponsor CRUD
│       │   │   └── [id]/
│       │   │       └── ads/
│       │   │           └── route.ts  # Sponsored ads per sponsor
│       │   └── email-outreach/
│       │       └── route.ts       # Email generation
│       └── sponsor/
│           └── inquiry/
│               └── route.ts       # Public inquiry submission
├── lib/
│   └── sponsor-packages.ts       # Package constants and types
```

Also modify:
- `src/lib/db.ts` — Add migrations for both new tables
- `src/app/api/generate-ads/route.ts` — Add sponsored ad support to existing endpoint

---

## Testing Checklist

After building, verify:

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `/admin/sponsors` loads and shows empty state
- [ ] Can create a sponsor via the admin form
- [ ] Sponsor appears in the list with correct status badge
- [ ] Can create a sponsored ad for a sponsor
- [ ] Package selection auto-fills duration, platforms, and cost
- [ ] Email outreach generator produces a complete email with real-ish stats
- [ ] PromptViewer works for both ad content and email preview
- [ ] `/sponsor` public page loads without auth
- [ ] Contact form validates required fields
- [ ] Form submission creates a sponsor with status='inquiry'
- [ ] New inquiries appear on the admin page
- [ ] No TypeScript errors anywhere
