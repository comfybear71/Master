# CRITICAL FIX: 30-Second Ad Videos Only Producing 10-Second Clips

## Paste this into your AIGlitch Claude Code session (branch: claude/review-documentation-4MYvb)

## The Problem

When "30s Extended" is selected on `/admin/campaigns`, the ad system only generates a single 10-second clip. The user expects 3 clips stitched into a ~30-second video.

## Root Cause

There are TWO separate issues:

### Issue 1: POST handler ignores duration — always submits 1 clip

File: `src/app/api/generate-ads/route.ts`

The POST handler (admin interactive mode, around line 586) ALWAYS submits a single 10-second video to Grok:

```typescript
body: JSON.stringify({
  model: "grok-imagine-video",
  prompt: videoPrompt,
  duration: 10,        // ← HARDCODED TO 10 — ignores duration from frontend
  aspect_ratio: "9:16",
  resolution: "720p",
}),
```

The frontend sends `duration: "30s"` or similar in the body, but the backend never reads it. It always creates ONE 10-second clip.

**For 30s Extended**, the backend needs to:
1. Submit 3 separate 10-second video generation jobs to Grok (each with a different but related prompt)
2. Return all 3 `requestId`s to the frontend
3. Frontend polls all 3 until complete
4. Frontend calls PUT with all 3 `clip_urls` for stitching

OR (simpler approach):
1. Backend submits 3 clips sequentially
2. Polls all 3 internally
3. Stitches them
4. Returns the final 30s video

### Issue 2: MP4 stitching drops the `edts` box

File: `src/lib/media/mp4-concat.ts`, around line 424

Even when stitching IS attempted (via PUT with clip_urls), the `edts` (Edit List) box is deliberately dropped:

```typescript
} else if (child.type === "edts") {
  continue; // ← DROPS THE EDIT LIST — media players only play first 10s
}
```

This causes stitched videos to only play the first clip's duration.

## The Fix

### Fix 1: Make POST handle 30s by submitting 3 clips

In `src/app/api/generate-ads/route.ts`, the POST handler needs to:

1. Read `body.duration` from the frontend (will be `"30s"` or `"10s"`)
2. If 30s: generate 3 different but related video prompts (ask Claude for 3 scene variations)
3. Submit all 3 to Grok
4. Return all 3 `requestId`s

Find the admin interactive section (around line 552) and modify it. Here's the approach:

```typescript
// After generating videoPrompt and caption (around line 584):

const duration = (body.duration as string) || "10s";
const is30s = duration === "30s" || duration === "30";
const clipCount = is30s ? 3 : 1;

if (is30s) {
  // Generate 3 related but distinct prompts for the 3 clips
  const multiPromptRequest = `You are a creative director for AIG!itch.

Based on this 10-second video concept:
"${videoPrompt}"

Create 3 DIFFERENT but CONNECTED 10-second scenes that together form a 30-second ad:
- Scene 1: Opening hook — grab attention immediately
- Scene 2: Product/feature showcase — the core message
- Scene 3: Call to action — make them desperate to join

Each scene should be a vivid paragraph (under 80 words) for a 9:16 vertical video. They should feel like parts of the same ad, with consistent neon purple/cyan aesthetic and the AIG!ITCH logo visible.

JSON: {"scenes": ["scene 1 prompt", "scene 2 prompt", "scene 3 prompt"]}`;

  let scenePrompts: string[] = [];
  try {
    const parsed = await claude.generateJSON<{ scenes: string[] }>(multiPromptRequest, 800);
    scenePrompts = parsed?.scenes || [];
  } catch {
    // Fallback: use the same prompt 3 times with slight variations
    scenePrompts = [
      videoPrompt,
      videoPrompt.replace("Camera", "Close-up shot").replace("crashes", "pushes"),
      videoPrompt.replace("Camera", "Final shot").replace("crashes", "reveals"),
    ];
  }

  if (scenePrompts.length < 3) {
    scenePrompts = [videoPrompt, videoPrompt, videoPrompt]; // Fallback
  }

  // Submit all 3 clips to Grok
  const requestIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const createRes = await fetch("https://api.x.ai/v1/videos/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-imagine-video",
        prompt: scenePrompts[i],
        duration: 10,
        aspect_ratio: "9:16",
        resolution: "720p",
      }),
    });

    if (createRes.ok) {
      const data = await createRes.json();
      if (data.request_id) requestIds.push(data.request_id);
    }
  }

  if (requestIds.length === 0) {
    return NextResponse.json({ success: false, error: "Failed to submit any clips to Grok" });
  }

  console.log(`[ads] 30s ad: submitted ${requestIds.length} clips`);

  return NextResponse.json({
    success: true,
    phase: "submitted",
    requestIds,  // Array of IDs — frontend needs to poll all of them
    clipCount: requestIds.length,
    caption,
    prompt: videoPrompt,
    is30s: true,
  });
}

// ... existing 10s single-clip code follows
```

### Fix 2: Update the GET handler to support polling multiple clips

The GET handler currently only polls a single `id`. For 30s ads, it needs to accept multiple IDs.

Add a new parameter `ids` (comma-separated) alongside the existing `id`:

```typescript
// At the start of the GET handler:
const singleId = request.nextUrl.searchParams.get("id");
const multiIds = request.nextUrl.searchParams.get("ids"); // comma-separated for 30s

if (multiIds) {
  // Poll all clips for 30s ad
  const ids = multiIds.split(",");
  const results: { id: string; status: string; videoUrl?: string }[] = [];

  for (const rid of ids) {
    const pollRes = await fetch(`https://api.x.ai/v1/videos/${encodeURIComponent(rid)}`, {
      headers: { "Authorization": `Bearer ${env.XAI_API_KEY}` },
    });
    if (pollRes.ok) {
      const data = await pollRes.json();
      results.push({
        id: rid,
        status: data.status || "unknown",
        videoUrl: data.video?.url,
      });
    } else {
      results.push({ id: rid, status: "error" });
    }
  }

  const allDone = results.every(r => r.videoUrl || r.status === "failed" || r.status === "moderation_failed" || r.status === "expired");
  const completedClips = results.filter(r => r.videoUrl);

  if (!allDone) {
    return NextResponse.json({
      success: false,
      phase: "polling",
      clips: results.map(r => ({ id: r.id, status: r.status })),
      completed: completedClips.length,
      total: ids.length,
    });
  }

  // All clips finished — download and stitch
  if (completedClips.length >= 2) {
    const clipBuffers: Buffer[] = [];
    for (const clip of completedClips) {
      const res = await fetch(clip.videoUrl!);
      if (res.ok) clipBuffers.push(Buffer.from(await res.arrayBuffer()));
    }

    if (clipBuffers.length >= 2) {
      try {
        const stitched = concatMP4Clips(clipBuffers);
        const blob = await put(`ads/ad-${uuidv4()}-30s.mp4`, stitched, {
          access: "public",
          contentType: "video/mp4",
        });

        // Create feed post + spread
        const sql = getDb();
        const postId = uuidv4();
        const postCaption = request.nextUrl.searchParams.get("caption") || "📺 30s Ad from AIG!itch";
        await sql`INSERT INTO posts (id, persona_id, content, post_type, media_url, media_type, ai_like_count, media_source)
          VALUES (${postId}, ${"glitch-000"}, ${postCaption}, ${"product_shill"}, ${blob.url}, ${"video/mp4"}, ${Math.floor(Math.random() * 200) + 50}, ${"ad-studio"})`;
        await sql`UPDATE ai_personas SET post_count = post_count + 1 WHERE id = ${"glitch-000"}`;
        const spread = await spreadPostToSocial(postId, "glitch-000", "AIG!itch", "🤖", { url: blob.url, type: "video/mp4" });

        return NextResponse.json({
          success: true,
          phase: "done",
          status: "posted",
          videoUrl: blob.url,
          postId,
          spreading: spread.platforms,
          clipCount: clipBuffers.length,
          duration: clipBuffers.length * 10,
        });
      } catch (err) {
        console.error("[ads] 30s stitch failed:", err);
        // Fall through to single clip
      }
    }
  }

  // Fallback: use first completed clip
  if (completedClips.length > 0) {
    // ... post single clip as fallback (same as existing single-clip code)
  }

  return NextResponse.json({ success: false, phase: "done", status: "all_clips_failed" });
}
```

### Fix 3: Fix the `edts` box in mp4-concat.ts

In `src/lib/media/mp4-concat.ts`, in the `rebuildTrak` function inside `rebuildMoov`, find:

```typescript
} else if (child.type === "edts") {
  // CRITICAL: Drop the edit list (elst) from the stitched file.
  // The original elst limits playback to the first clip's duration (~10s).
  // Without edts, the player uses the full duration from tkhd/mdhd,
  // which we've already patched to the combined total duration.
  continue;
```

Replace with:

```typescript
} else if (child.type === "edts") {
  // Rebuild edts with a single elst entry spanning the full combined duration.
  // The original elst only covered the first clip — we extend it to all stitched clips.
  const elstData = Buffer.alloc(4 + 4 + 12);
  elstData.writeUInt32BE(0, 0); // version 0, flags 0
  elstData.writeUInt32BE(1, 4); // entry_count = 1
  elstData.writeUInt32BE(trackMediaDuration, 8); // segment_duration = full combined
  elstData.writeInt32BE(0, 12); // media_time = 0
  elstData.writeUInt16BE(1, 16); // media_rate = 1.0
  elstData.writeUInt16BE(0, 18); // media_rate_fraction = 0
  const elstBox = makeFullBox("elst", 0, 0, elstData);
  const edtsBox = makeBox("edts", elstBox);
  parts.push(edtsBox);
```

### Fix 4: Update the frontend to handle multi-clip polling

In the admin campaigns page (wherever the polling logic is), when the POST returns `is30s: true` and `requestIds` (array), the frontend needs to:

1. Poll using `GET /api/generate-ads?ids=id1,id2,id3&caption=...` instead of single `id`
2. Show progress: "Clip 1/3 ready... Clip 2/3 ready... Clip 3/3 ready... Stitching..."
3. The response will have `clipCount` and `duration` to confirm it worked

Look for the polling code in the admin page — it probably does something like:
```typescript
const pollUrl = `/api/generate-ads?id=${requestId}&caption=${caption}`;
```

Change it to handle both single and multi:
```typescript
const pollUrl = is30s && requestIds
  ? `/api/generate-ads?ids=${requestIds.join(",")}&caption=${encodeURIComponent(caption)}`
  : `/api/generate-ads?id=${requestId}&caption=${encodeURIComponent(caption)}`;
```

## Files to Modify

1. `src/app/api/generate-ads/route.ts` — POST (submit 3 clips), GET (poll multiple), PUT (already works)
2. `src/lib/media/mp4-concat.ts` — Fix edts/elst box rebuild
3. Admin campaigns page (frontend) — Handle multi-clip polling UI

## Testing

1. Select "30s Extended" → Launch Ad Campaign
2. Should see "Submitting 3 clips to Grok..."
3. Polling shows "Clip 1/3 ready... 2/3... 3/3..."
4. "Stitching..." then "Video ready!"
5. Resulting video plays for ~30 seconds
6. Check blob storage — file should be ~3x the size of a 10s clip

## Don't Forget

- Run `npx tsc --noEmit` before pushing
- The `concatMP4Clips()` function re-throws errors (doesn't silently fallback) — but callers catch and fallback
- All 3 clips MUST have identical encoding (same Grok model + resolution + aspect ratio) — which they do since we use the same params
