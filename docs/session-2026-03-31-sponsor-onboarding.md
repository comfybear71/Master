# Session Log: 2026-03-31 — Sponsor Onboarding Pipeline

**Duration:** Full session
**Task:** Build end-to-end sponsor onboarding flow — from cold email to paid campaign with asset upload and AIG!itch auto-import.

---

## What Was Built

### 1. Sponsor Onboarding Page (`/sponsor-onboarding.html`)
- Public-facing page with AIG!itch branding (dark theme, neon accents)
- Two pricing tiers: Glitch ($50, 30% frequency) and Chaos ($100, 80% frequency)
- Company name + email form fields
- Stripe Checkout integration (live payments)
- Post-payment asset upload form (logo + up to 5 product images)
- Drag-and-drop file upload with validation (JPEG, PNG, WebP, SVG, GIF)
- Success confirmation with image thumbnails

### 2. Stripe Checkout (`/api/stripe/checkout`)
- Creates Stripe Checkout sessions using `STRIPE_AIGLITCH_SECRET_KEY`
- Supports both tiers via `STRIPE_PRICE_GLITCH` and `STRIPE_PRICE_CHAOS` env vars
- Stores tier, company name, and email in Stripe metadata
- Redirects back to onboarding page with `?payment=success` or `?payment=cancelled`

### 3. Asset Upload API (`/api/sponsor/upload`)
- Accepts FormData: company, email, tier, logo (required), up to 5 images
- Validates file types and sizes (logo 5MB max, images 10MB max)
- Uploads to Vercel Blob Store under `sponsors/{company-slug}/`
- Saves metadata to MongoDB `sponsor_uploads` collection
- Returns JSON with uploaded file URLs

### 4. AIG!itch Auto-Import API (`/api/sponsor/list`)
- `GET` — Returns all sponsor uploads with enriched package details
- Filters: `?status=pending` (un-imported only), `?company=NAME`
- `POST` — Marks sponsor as imported to AIG!itch (`importedToAiglitch: true`)
- Derives package details from tier (frequency, placements, duration)

### 5. Blob Store Integration
- Connected `aiglitch-media` Blob Store to MasterHQ project in Vercel
- Both MasterHQ and AIG!itch share the same Blob Store
- Sponsor images accessible from both projects via `BLOB_READ_WRITE_TOKEN`

### 6. Email Templates (6 branded HTML templates)
- 3 tones: casual, formal, bold
- 2 personas: The Architect, Founder
- Dark theme with neon cyan/yellow accents
- Stats row (108 AI creators, 6 platforms, 24/7), pricing table, CTA buttons
- Links to sponsor onboarding page with tier pre-selected

### 7. AIG!itch Sponsor Prompt Updated (`docs/aiglitch-sponsor-prompt.md`)
- Added MasterHQ auto-import feature (zero manual handling)
- Changed from 4 tiers ($50-$500) to 2 tiers ($50/$100)
- Added `product_images` JSONB array (replaces single `product_image_url`)
- Added `frequency`, `campaign_days`, `masterhq_sponsor_id` DB fields
- Auto-fetch pending sponsors on admin page load
- One-click import creates sponsor + campaign with all images
- "Import All" button for batch import

---

## First Sponsor Test

- **BUDJU** (crypto platform) — $50 Glitch tier
- Payment processed via Stripe ($50 real payment)
- Logo + 3 product images uploaded
- Data saved to MongoDB `sponsor_uploads` collection
- Images initially showed as broken placeholders (MasterHQ didn't have Blob Store token)
- Fixed by connecting `aiglitch-media` blob store to MasterHQ project in Vercel

---

## Architecture

```
Email (Resend API)
  → Sponsor clicks tier link in email
    → masterhq.dev/sponsor-onboarding?tier=glitch
      → Fills in company name + email
        → Stripe Checkout ($50 or $100)
          → Stripe redirects back with ?payment=success
            → Upload form appears (logo + up to 5 images)
              → POST /api/sponsor/upload
                → Files → Vercel Blob Store (aiglitch-media)
                → Metadata → MongoDB sponsor_uploads
                  → AIG!itch admin auto-fetches GET /api/sponsor/list?status=pending
                    → Admin clicks "Import" → sponsor + campaign created
                      → POST /api/sponsor/list marks as imported
```

---

## Files Created/Modified

| File | Type | Purpose |
|------|------|---------|
| `public/sponsor-onboarding.html` | New | Public sponsor onboarding page |
| `app/sponsor-onboarding/page.tsx` | New | Next.js redirect wrapper |
| `app/api/stripe/checkout/route.ts` | New | Stripe Checkout session creation |
| `app/api/sponsor/upload/route.ts` | New | File upload to Blob Store + MongoDB |
| `app/api/sponsor/list/route.ts` | New | AIG!itch auto-import API |
| `public/email-architect-casual.html` | New | Architect casual email template |
| `public/email-architect-formal.html` | New | Architect formal email template |
| `public/email-architect-bold.html` | New | Architect bold email template |
| `public/email-founder-casual.html` | New | Founder casual email template |
| `public/email-founder-formal.html` | New | Founder formal email template |
| `public/email-founder-bold.html` | New | Founder bold email template |
| `docs/aiglitch-sponsor-prompt.md` | Updated | Added MasterHQ auto-import, multi-image, $50/$100 tiers |
| `CLAUDE.md` | Updated | Added sponsor onboarding pipeline docs |
| `HANDOFF.md` | Updated | Session log, current state, next steps |

---

## Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `STRIPE_AIGLITCH_SECRET_KEY` | Stripe API key (AIG!itch account) |
| `STRIPE_PRICE_GLITCH` | Stripe Price ID for $50 tier |
| `STRIPE_PRICE_CHAOS` | Stripe Price ID for $100 tier |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Store token (auto-added when connecting aiglitch-media) |
| `MONGODB_URI` | MongoDB connection (already configured) |

---

## Next Steps

1. **AIG!itch auto-import** — Give AIG!itch the prompt at `docs/aiglitch-sponsor-prompt.md`
2. **Re-test upload** — Verify images save correctly after Blob Store connection + redeploy
3. **Stripe webhooks** — Future: auto-create sponsor in AIG!itch DB on payment (no manual import)
4. **Confirmation email** — Send sponsor an email confirming their campaign details after upload
