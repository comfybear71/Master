# URGENT: Fix Breaking News "Missing required fields" Stitch Error

## Paste this into your AIGlitch Claude Code session immediately

## The Problem

Breaking News "GO LIVE" generates all 9 clips successfully but ALWAYS fails at stitching with "Missing required fields". Directors movies work fine with the same stitch endpoint.

## The Fix

The PUT handler in `src/app/api/generate-director-movie/route.ts` (around line 385) is too strict about field names. The Breaking News frontend sends different field names than what the handler expects.

**Find the PUT handler** (search for `export async function PUT`) and replace the body destructuring section with this more flexible version:

```typescript
export async function PUT(request: NextRequest) {
  const body = await request.json();

  // Flexible field extraction — accept multiple naming conventions
  // Breaking News sends different field names than Director Movies
  const sceneUrls = body.sceneUrls || body.scene_urls || body.videoUrls || body.clipUrls || body.urls || body.scenes;
  const title = body.title || body.headline || body.name || body.broadcastTitle || "Breaking News Broadcast";
  const directorUsername = body.directorUsername || body.director_username || body.director || body.anchor || "sir_david_attenbot";
  const directorId = body.directorId || body.director_id || "glitch-000";
  const synopsis = body.synopsis || body.description || body.summary || "";
  const tagline = body.tagline || body.subtitle || "";
  const castList = body.castList || body.cast_list || body.cast || [];
  const channelId = body.channelId || body.channel_id || body.channel || null;
  const folder = body.folder || body.blobFolder || body.blob_folder || null;
  const genre = body.genre || "breaking_news";
```

Then update the validation to log what was actually received:

```typescript
  // Log ALL received keys for debugging
  console.log(`[director-movie] PUT received keys: ${Object.keys(body).join(", ")}`);
  console.log(`[director-movie] PUT resolved: sceneUrls=${!!sceneUrls} (${sceneUrls ? Object.keys(sceneUrls).length + " scenes" : "null"}), title="${title}"`);

  if (!sceneUrls || (typeof sceneUrls === "object" && Object.keys(sceneUrls).length === 0)) {
    return NextResponse.json({
      error: "Missing required fields",
      missing: ["sceneUrls"],
      hint: `Required: sceneUrls (object with scene URLs). Received keys: ${Object.keys(body).join(", ")}`,
      receivedBody: JSON.stringify(body).slice(0, 500),
    }, { status: 400 });
  }
```

**This fix makes the handler accept ANY reasonable field name** the frontend might use, and logs exactly what was received for debugging. The title defaults to "Breaking News Broadcast" so it never fails on a missing title.

## Alternative: Fix the Frontend

If you prefer to fix the frontend instead, find the Breaking News stitch call (wherever "Stitching X clips into news broadcast" is logged) and make sure it sends:

```typescript
body: JSON.stringify({
  sceneUrls: sceneUrls,  // Record<number, string> — { 1: "url", 2: "url", ... }
  title: screenplay.title || "Breaking News",
  genre: "breaking_news",
  directorUsername: "sir_david_attenbot",
  directorId: "glitch-000",
  channelId: "ch-gnn",
  folder: "breaking-news",
})
```

## Don't Forget
- `npx tsc --noEmit` before pushing
- The `receivedBody` in the error response will show EXACTLY what the frontend sent — check Vercel logs
