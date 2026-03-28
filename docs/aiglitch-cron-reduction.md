# AIGlitch — Cron Frequency Reduction (50% Cost Savings)

## Paste this into your AIGlitch Claude Code session

## The Problem

AIGlitch is burning $1,365+/month on xAI API calls. The biggest cost driver is **600+ cron fires per day** — many running every 15 minutes, each calling Grok/Claude.

### Current Fire Rate

| Endpoint | Current | Daily Fires |
|----------|---------|-------------|
| `/api/generate` | every 15 min | 96x/day |
| `/api/ai-trading` | every 15 min | 96x/day |
| `/api/budju-trading` | every 15 min | 96x/day |
| `/api/x-react` | every 15 min | 96x/day |
| `/api/generate-persona-content` | every 20 min | 72x/day |
| `/api/generate-avatars` | every 30 min | 48x/day |
| `/api/generate-channel-content` | every 30 min | 48x/day |
| `/api/telegram/credit-check` | every 30 min | 48x/day |
| **TOTAL** | | **600+ fires/day** |

## The Fix — 50% Reduction

Update `vercel.json` — change ONLY these 5 cron schedules:

```json
{
  "path": "/api/generate",
  "schedule": "*/30 * * * *"
}
```

```json
{
  "path": "/api/ai-trading?action=cron",
  "schedule": "*/30 * * * *"
}
```

```json
{
  "path": "/api/budju-trading?action=cron",
  "schedule": "*/30 * * * *"
}
```

```json
{
  "path": "/api/x-react",
  "schedule": "*/30 * * * *"
}
```

```json
{
  "path": "/api/generate-persona-content",
  "schedule": "*/40 * * * *"
}
```

**Leave ALL other crons completely unchanged.**

### After Fix

| Endpoint | Before | After | Reduction |
|----------|--------|-------|-----------|
| `/api/generate` | 96x/day | 48x/day | -50% |
| `/api/ai-trading` | 96x/day | 48x/day | -50% |
| `/api/budju-trading` | 96x/day | 48x/day | -50% |
| `/api/x-react` | 96x/day | 48x/day | -50% |
| `/api/generate-persona-content` | 72x/day | 36x/day | -50% |
| **Total saved** | | | **~300 fires/day** |

### Expected Savings

- Current daily fires: ~600
- After fix: ~300
- **~50% reduction in API calls**
- At $1,365/month, this should save approximately **$500-700/month**
- Content still posts frequently — every 30 min for main generation, every 40 min for persona content
- Users won't notice any difference in feed activity

## Additional: Reduce generate-topics (MasterHQ handles news now)

MasterHQ now has a news pipeline that fetches real headlines every 6 hours, fictionalizes them, and serves them via `https://masterhq.dev/api/topics`. AIGlitch should pull from this instead of generating its own topics.

In `vercel.json`, also change:

```json
{
  "path": "/api/generate-topics",
  "schedule": "0 */6 * * *"
}
```

Changed from every 2 hours to every 6 hours — aligned with MasterHQ's news pipeline. The generate-topics cron should now:
1. First pull fictionalized topics from `https://masterhq.dev/api/topics`
2. Only generate its own topics as fallback if MasterHQ returns 0 results

See `docs/aiglitch-news-topics-client.md` in the Master repo for the client code.

## Don't Forget
- Run `npx tsc --noEmit` before pushing
- Only change the 5 crons listed above — leave everything else alone
- The trading crons are safe to slow down — they check for opportunities, not execute live trades on a timer
- Commit with message: "Reduce cron frequencies 50% — save ~$500-700/month on API calls"
