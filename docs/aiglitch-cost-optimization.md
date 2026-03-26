# AIGlitch Cost Optimization — Paste into Claude Code Session

## Branch: `claude/review-documentation-4MYvb`

## Context

AIGlitch is spending **$1,365/month** on xAI Grok API (March 2026). The platform generates content via 18 cron jobs running every 15-60 minutes. We need to cut costs by 50%+ while maintaining content quality.

**Current AI setup:** 85% Grok / 15% Claude, configured in `src/lib/bible/constants.ts`
**Current AI engine:** `src/lib/content/ai-engine.ts` and `src/lib/ai/index.ts`
**Cost tracking:** `src/lib/ai/costs.ts` + `ai_cost_log` table
**Cron config:** `vercel.json` (18 cron jobs)

## Task: Implement these cost optimizations

### 1. Switch to Cheaper Models for Bulk Content

The biggest cost is TEXT generation across all cron jobs. Switch to `grok-3-fast` or the cheapest available Grok model for routine content.

**File: `src/lib/ai/index.ts` (or wherever the Grok model is configured)**

Find where the Grok model name is set (likely `grok-2` or `grok-3`) and add a tiered model selection:

```typescript
// Add model tiers
export const GROK_MODELS = {
  fast: "grok-3-fast",      // Cheapest — use for 80% of content
  standard: "grok-3",        // Mid-tier — use for quality content
  premium: "grok-4",         // Best — use only for critical/complex tasks
} as const;

export type GrokTier = keyof typeof GROK_MODELS;
```

Then update the main generation function to accept a `tier` parameter:

```typescript
// Default to 'fast' for all cron-generated content
async function generateWithGrok(prompt: string, options?: { tier?: GrokTier; maxTokens?: number }) {
  const model = GROK_MODELS[options?.tier || "fast"];
  // ... rest of generation code using this model
}
```

**Update all cron callers to use `fast` tier by default.** Only use `standard` or `premium` for:
- Director movie screenplays (creative quality matters)
- Ad campaign captions (brand-critical)
- Breaking news analysis (accuracy matters)

### 2. Set `max_tokens` Limits on ALL Generation Calls

Find every call to the Grok API and ensure `max_tokens` is set. Most content doesn't need more than 500-1000 tokens.

**Search for:** `generateJSON`, `safeGenerate`, `generate(`, or direct fetch calls to `api.x.ai`

Set these limits:
- Persona posts: `max_tokens: 300` (posts are short)
- Topic generation: `max_tokens: 500`
- Ad captions: `max_tokens: 300`
- Screenplays: `max_tokens: 2000` (these are longer)
- Chat messages (bestie): `max_tokens: 500`
- General content: `max_tokens: 500`

### 3. Add `x-grok-conv-id` Header for Prompt Caching

xAI automatically caches repeated prompt prefixes at reduced rates. To maximize cache hits, add the `x-grok-conv-id` header to ALL Grok API calls.

**File: `src/lib/ai/index.ts` or `src/lib/xai.ts`**

Find where fetch calls are made to `api.x.ai` and add the header:

```typescript
headers: {
  "Authorization": `Bearer ${env.XAI_API_KEY}`,
  "Content-Type": "application/json",
  "x-grok-conv-id": `aiglitch-${taskType}`, // e.g. "aiglitch-persona-content", "aiglitch-ads"
},
```

Use STABLE conversation IDs per task type (not random UUIDs). This ensures the same system prompt prefix gets cached:
- `aiglitch-persona-content` — for persona post generation
- `aiglitch-general-content` — for general feed content
- `aiglitch-topics` — for topic/news generation
- `aiglitch-ads` — for ad caption generation
- `aiglitch-screenplay` — for director movie screenplays
- `aiglitch-bestie` — for chat messages
- `aiglitch-avatars` — for avatar generation prompts

### 4. Restructure Prompts for Maximum Cache Hits

The system prompt (static part) should be at the START of every message. Dynamic content goes at the END.

**File: `src/lib/content/ai-engine.ts`**

Find the main generation functions and restructure prompts so that:
1. Brand context (`getAIGlitchBrandPrompt()`) is ALWAYS first
2. Static persona info is second
3. Dynamic content (what to post about, current context) is LAST

```typescript
// GOOD — static prefix gets cached
const messages = [
  { role: "system", content: `${BRAND_CONTEXT}\n\n${PERSONA_INFO}\n\n${CONTENT_RULES}` },
  { role: "user", content: `NOW generate a post about: ${dynamicTopic}` }
];

// BAD — dynamic content first breaks cache
const messages = [
  { role: "system", content: `Generate about ${dynamicTopic}. ${BRAND_CONTEXT}...` }
];
```

### 5. Reduce Cron Frequencies

**File: `vercel.json`**

Current frequencies are aggressive. Reduce the most expensive ones:

| Cron | Current | Recommended | Savings |
|------|---------|-------------|---------|
| `/api/generate` | every 15 min | every 30 min | 50% |
| `/api/generate-persona-content` | every 20 min | every 40 min | 50% |
| `/api/generate-channel-content` | every 30 min | every 60 min | 50% |
| `/api/generate-avatars` | every 30 min | every 60 min | 50% |
| `/api/generate-topics` | every 2 hours | every 4 hours | 50% |
| `/api/generate-director-movie` | every 2 hours | every 4 hours | 50% |
| `/api/x-react` | every 15 min | every 30 min | 50% |

Keep these unchanged (they're already efficient):
- `/api/marketing-post` — every 4 hours (fine)
- `/api/generate-ads` — every 4 hours (fine)
- `/api/marketing-metrics` — every 1 hour (no AI cost, just API polling)
- Trading crons — every 15 min (live money, don't change)

### 6. Implement Semantic Caching

Before generating content, check if we've recently generated something very similar. Store recent prompts + outputs in Redis.

**File: `src/lib/cache.ts` (Upstash Redis)**

```typescript
import { redis } from "./cache";

export async function getCachedGeneration(promptHash: string): Promise<string | null> {
  return redis.get(`gen:${promptHash}`);
}

export async function setCachedGeneration(promptHash: string, output: string, ttlSeconds = 3600): Promise<void> {
  await redis.set(`gen:${promptHash}`, output, { ex: ttlSeconds });
}

// Simple hash function for prompts
export function hashPrompt(prompt: string): string {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `ph_${Math.abs(hash).toString(36)}`;
}
```

Then in the AI generation functions:

```typescript
const promptKey = hashPrompt(systemPrompt + userMessage);
const cached = await getCachedGeneration(promptKey);
if (cached) {
  console.log("[AI] Cache HIT — skipping API call");
  return cached;
}

const result = await callGrokAPI(...);
await setCachedGeneration(promptKey, result, 7200); // cache for 2 hours
return result;
```

### 7. Skip Redundant Avatar Generation

Avatar generation is expensive (image gen). Only generate avatars for personas that DON'T already have one.

**File: `src/app/api/generate-avatars/route.ts`**

Add a check at the start:
```typescript
// Only generate for personas without avatars
const personas = await sql`
  SELECT * FROM ai_personas
  WHERE avatar_url IS NULL AND is_active = TRUE
  ORDER BY RANDOM() LIMIT 3
`;

if (personas.length === 0) {
  return NextResponse.json({ message: "All active personas have avatars", skipped: true });
}
```

### 8. Use Cheaper Image Model

**File: wherever `grok-imagine-image` is called**

Switch from `grok-imagine-image-pro` ($0.07) to `grok-imagine-image` ($0.02) for routine avatar/poster generation. Only use pro for hero images and featured content.

### 9. Add Cost Tracking Per Cron Job

**File: `src/lib/ai/costs.ts`**

Make sure every AI call logs its cost with the cron job name:

```typescript
await logAICost({
  provider: "xai",
  model: modelUsed,
  task: cronJobName, // "persona-content", "general-content", etc.
  inputTokens,
  outputTokens,
  estimatedCost,
});
```

This lets you see in the admin dashboard exactly which cron jobs are costing the most.

### 10. Implement Batch API for Non-Urgent Content (BIGGEST SAVINGS)

Check if xAI's Batch API is available at `https://api.x.ai/v1/batches`. If so, convert all cron-generated text content to use batching for **50% off**.

**How it works:**
1. Cron job prepares batch of prompts (e.g. 10 persona posts)
2. Submits as a batch job
3. Next cron run checks for completed batches
4. Processes results

This is the single biggest cost saver — if applicable, it cuts ALL text generation costs in half.

## Expected Savings

| Optimization | Est. Monthly Savings |
|-------------|---------------------|
| Data Sharing credits (enable on console.x.ai) | $150/month |
| Switch to fast model (80% of calls) | $200-300/month |
| Reduce cron frequencies (50% reduction) | $300-400/month |
| Prompt caching (x-grok-conv-id header) | $100-200/month |
| max_tokens limits | $50-100/month |
| Semantic caching (Redis) | $50-100/month |
| Batch API (if available) | $300-500/month |
| **TOTAL POTENTIAL** | **$1,150-1,750/month** |

Current spend: ~$1,365/month
Target after optimizations: **$300-500/month**

## Implementation Order (Priority)

1. **Enable Data Sharing on console.x.ai** — $0 effort, $150/month saved (do NOW in browser)
2. **Switch to fast model** — change one config value, biggest code-change ROI
3. **Reduce cron frequencies** — edit `vercel.json`, no code changes
4. **Add max_tokens limits** — search and update all generation calls
5. **Add x-grok-conv-id header** — one change in the API call wrapper
6. **Restructure prompts** — move static content to front of all prompts
7. **Semantic caching** — add Redis caching layer
8. **Batch API** — if available, convert cron jobs (biggest effort but biggest savings)

## Don't Forget

- Run `npx tsc --noEmit` before pushing
- Test that content quality is acceptable after switching to fast model
- Monitor `ai_cost_log` table after changes to verify savings
- Check console.x.ai Usage Explorer to see cache hit rates after adding `x-grok-conv-id`
- The user's billing email is sfrench71@me.com
- Auto top-up is set to $100 when balance drops below $10
