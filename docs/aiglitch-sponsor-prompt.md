# AIGlitch Sponsored Ad Campaign System — Build Prompt

> Paste this entire file into a Claude Code session on the AIGlitch repo.

---

## Context

You are working on the **AIGlitch** codebase. AIGlitch already has a fully automated Ad Campaign system that generates AI-powered video ads and distributes them across 6 social platforms (X, TikTok, Instagram, Facebook, YouTube, Telegram).

**Your task**: Build a Sponsored Ad Campaign system with **AUTO-IMPORT from MasterHQ**. When a sponsor pays and uploads assets on MasterHQ (masterhq.dev), their data should automatically appear in AIG!itch admin — ready to create campaigns with zero manual data entry.

### MasterHQ Integration (CRITICAL — THIS IS THE KEY FEATURE)

MasterHQ (masterhq.dev) handles the sponsor onboarding pipeline:
1. Sponsor receives outreach email → clicks tier link
2. Lands on sponsor-onboarding page → pays via Stripe ($50 or $100)
3. After payment, uploads 1 logo + up to 5 product images
4. Files stored in Vercel Blob Store (shared aiglitch-media blob store)
5. Upload metadata saved in MasterHQ MongoDB `sponsor_uploads` collection

**MasterHQ API endpoint (already built):**
```
GET https://masterhq.dev/api/sponsor/list
```
Returns:
```json
{
  "sponsors": [
    {
      "id": "mongodb_object_id",
      "company": "BUDJU",
      "email": "contact@budju.xyz",
      "tier": "glitch",
      "files": [
        { "name": "Logo", "url": "https://jug8pwv8lcpdrski.public.blob.vercel-storage.com/sponsors/budju/logo.png", "type": "logo" },
        { "name": "Product Image 1", "url": "https://...image-1.jpg", "type": "image" },
        { "name": "Product Image 2", "url": "https://...image-2.jpg", "type": "image" },
        { "name": "Product Image 3", "url": "https://...image-3.jpg", "type": "image" }
      ],
      "createdAt": "2026-03-31T...",
      "importedToAiglitch": false,
      "package": { "name": "Glitch", "price": 50, "frequency": 30, "placements": 210, "duration": 7 }
    }
  ],
  "count": 1
}
```

**Filter options:**
- `?status=pending` — only sponsors not yet imported to AIG!itch
- `?company=BUDJU` — filter by company name

**Mark as imported (prevents duplicates):**
```
POST https://masterhq.dev/api/sponsor/list
Body: { "sponsorId": "mongodb_object_id" }
```

### What AIG!itch Admin Must Do Automatically

When admin opens the Sponsors page:
1. **Auto-fetch** pending sponsors from MasterHQ API (GET with `?status=pending`)
2. **Show a banner** if new sponsors are waiting: "2 new sponsors ready to import from MasterHQ"
3. **One-click import** button per sponsor that:
   - Creates the sponsor in AIG!itch Postgres `sponsors` table
   - Creates the first `sponsored_ad` with all their images attached
   - Sets up the campaign at the correct frequency (30% for Glitch, 80% for Chaos)
   - Marks the sponsor as imported on MasterHQ (POST to `/api/sponsor/list`)
4. **"Import All" button** to batch-import all pending sponsors at once

The admin should NEVER have to manually type a company name, email, or paste image URLs. Everything comes from MasterHQ.

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
  logo_url VARCHAR(500),
  -- logo uploaded via MasterHQ sponsor onboarding
  product_images JSONB DEFAULT '[]',
  -- array of image objects: [{ "url": "https://...", "type": "logo"|"image", "name": "Logo" }]
  -- replaces old single product_image_url field
  -- backward compat: if old ads have product_image_url, treat it as first image
  ad_style VARCHAR(50) NOT NULL DEFAULT 'product_showcase',
  -- ad_style values: 'product_showcase', 'testimonial', 'comparison', 'lifestyle', 'unboxing'
  target_platforms TEXT[] NOT NULL DEFAULT ARRAY['x', 'tiktok', 'instagram', 'facebook', 'youtube', 'telegram'],
  duration INTEGER NOT NULL DEFAULT 10,
  -- duration in seconds: 10 or 30
  frequency INTEGER NOT NULL DEFAULT 30,
  -- how often this sponsor's ad appears in the rotation (30% for Glitch tier, 80% for Chaos tier)
  campaign_days INTEGER NOT NULL DEFAULT 7,
  -- campaign duration in days
  package VARCHAR(50) NOT NULL DEFAULT 'glitch',
  -- package values: 'glitch' ($50, 30% freq), 'chaos' ($100, 80% freq)
  cash_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- status values: 'draft', 'pending_review', 'approved', 'generating', 'ready', 'published', 'completed', 'rejected'
  video_url VARCHAR(500),
  post_ids JSONB DEFAULT '[]',
  -- array of {platform, post_id} objects after publishing
  performance JSONB DEFAULT '{}',
  -- cached metrics: {views, likes, shares, clicks}
  masterhq_sponsor_id VARCHAR(100),
  -- the MongoDB ObjectId from MasterHQ sponsor_uploads, used to prevent duplicate imports
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

#### Section B: MasterHQ Auto-Import (TOP PRIORITY — show above everything else)

This is the **primary workflow**. When a sponsor pays on MasterHQ, their data should appear here automatically.

- On page load, fetch `GET https://masterhq.dev/api/sponsor/list?status=pending`
- If pending sponsors exist, show a prominent banner:
  ```
  🔔 2 new paid sponsors ready to import from MasterHQ
  [Import All]
  ```
- For each pending sponsor, show a card with:
  - Company name, email, tier (Glitch $50 / Chaos $100)
  - Logo thumbnail + product image thumbnails (from the `files` array)
  - Package details (frequency, placements, duration)
  - **[Import & Create Campaign]** button
- When "Import & Create Campaign" is clicked:
  1. Create sponsor in AIG!itch `sponsors` table (company, email, status='active')
  2. Create `sponsored_ad` with all images from MasterHQ (`files` array → `product_images` JSONB, logo → `logo_url`)
  3. Set frequency from the package (30% for Glitch, 80% for Chaos)
  4. Set campaign duration to 7 days
  5. Mark as imported on MasterHQ: `POST https://masterhq.dev/api/sponsor/list` with `{ "sponsorId": "..." }`
  6. Show success: "BUDJU imported! Campaign ready at 30% frequency for 7 days."
- **"Import All"** button does the above for all pending sponsors in one click

#### Section C: Sponsored Ad Creator (for manual creation if needed)

- Form to create a new sponsored ad:
  - Select sponsor (dropdown of active sponsors)
  - Product name (text input)
  - Product description (textarea)
  - Logo URL (text input with preview)
  - Product Image URLs (up to 5, add/remove dynamically, each with preview)
  - Ad style (dropdown: product_showcase, testimonial, comparison, lifestyle, unboxing)
  - Package (dropdown: Glitch $50 / Chaos $100 — auto-fills frequency, duration)
  - Target platforms (checkboxes, pre-filled to all 6)
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

These match the MasterHQ sponsor onboarding tiers exactly:

```typescript
export const SPONSOR_PACKAGES = {
  glitch: {
    name: 'Glitch',
    price: 50,
    frequency: 30,        // 30% of ad rotation
    placements: 210,      // estimated placements over 7 days
    duration: 7,          // campaign duration in days
    platforms: ['x', 'tiktok', 'instagram', 'facebook', 'youtube', 'telegram'],
    description: '7-day campaign, 30% frequency, ~210 placements across all platforms'
  },
  chaos: {
    name: 'Chaos',
    price: 100,
    frequency: 80,        // 80% of ad rotation
    placements: 560,      // estimated placements over 7 days
    duration: 7,
    platforms: ['x', 'tiktok', 'instagram', 'facebook', 'youtube', 'telegram'],
    description: '7-day campaign, 80% frequency, ~560 placements across all platforms'
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
- Glitch: 7-day campaign, 30% ad frequency, ~210 placements across all 6 platforms — $50
- Chaos: 7-day campaign, 80% ad frequency, ~560 placements across all 6 platforms — $100

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
Display the 2 tiers as cards:

| | Glitch | Chaos |
|---|---|---|
| **Price** | $50 | $100 |
| **Frequency** | 30% of ad rotation | 80% of ad rotation |
| **Duration** | 7 days | 7 days |
| **Placements** | ~210 | ~560 |
| **Platforms** | All 6 | All 6 |

Highlight "Chaos" as "Most Popular".

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
- Preferred Package (dropdown: Glitch $50, Chaos $100, Not sure)

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
