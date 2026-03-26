# AIGlitch Breaking News Stitch Fix — "Missing required fields"

## Branch: `claude/review-documentation-4MYvb`

## The Problem

Breaking News broadcasts fail at the stitch step with "Stitch failed: Missing required fields" every time. 8 out of 9 clips generate successfully, but stitching always fails.

## Error Location

`src/app/api/generate-director-movie/route.ts` line 413-418 (PUT handler):

```typescript
if (!sceneUrls || !title) {
  return NextResponse.json({
    error: "Missing required fields",
    missing: missingFields.filter(f => !f.includes("defaulted")),
    hint: `Required: sceneUrls, title. Received keys: ${Object.keys(body).join(", ")}`,
  }, { status: 400 });
}
```

## How to Debug

1. Open your browser dev tools → Network tab
2. Trigger a Breaking News "GO LIVE"
3. When the stitch fails, look at the PUT request to `/api/generate-director-movie`
4. Check the request body — what keys are being sent?
5. Check the response — the `hint` field tells you exactly what keys were received vs what's expected

The response `hint` field says `Required: sceneUrls, title. Received keys: ...` — this tells you exactly what the frontend is sending.

## Most Likely Cause

The Breaking News frontend code that calls the PUT endpoint is probably sending different field names than what the PUT handler expects. Common mismatches:

- Frontend sends `scene_urls` but handler expects `sceneUrls`
- Frontend sends `videoUrls` but handler expects `sceneUrls`
- Frontend sends `clipUrls` but handler expects `sceneUrls`
- Frontend doesn't send `title` at all (or sends it as `headline` or `name`)

## How to Fix

1. Find the Breaking News stitch call in the frontend. Search for:
   - `PUT` calls to `/api/generate-director-movie`
   - The string "Stitching" in the briefing/directors page
   - The breaking news generation flow

2. Check what the frontend is sending in the PUT body

3. Either:
   - Fix the frontend to send `sceneUrls` (object with scene numbers as keys) and `title` (string)
   - OR update the PUT handler to accept alternative field names

The PUT handler expects:
```typescript
{
  sceneUrls: { [sceneNumber: string]: string },  // e.g. { "1": "https://...", "2": "https://..." }
  title: string,
  genre?: string,
  directorUsername?: string,
  directorId?: string,
  synopsis?: string,
  tagline?: string,
  castList?: string[],
  channelId?: string,
  folder?: string,
}
```

4. Also check: is the Breaking News flow using a different stitch path than director movies? If so, it may need its own handler or the existing one needs to handle both formats.

## Quick Temporary Fix

If you need it working NOW, add more flexible field name handling in the PUT handler. In `src/app/api/generate-director-movie/route.ts`, at the body destructuring (around line 385), add aliases:

```typescript
const sceneUrls = body.sceneUrls || body.scene_urls || body.videoUrls || body.clipUrls || body.urls;
const title = body.title || body.headline || body.name || "Breaking News Broadcast";
```

This will accept any common field name variation the frontend might be sending.

## Don't Forget
- Run `npx tsc --noEmit` before pushing
- Check browser Network tab to see the exact request body being sent
- The error response includes a `hint` field that shows exactly what was received
