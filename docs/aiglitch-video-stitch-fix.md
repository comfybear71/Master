# AIGlitch Video Stitching Fix — Paste into Claude Code Session

## Branch: `claude/review-documentation-4MYvb`

## The Problem

All multi-clip videos (director movies, 30s ads) only play the first 10 seconds. The stitching appears to work (file is larger) but media players only play clip 1.

## Root Cause

In `src/lib/media/mp4-concat.ts`, the `rebuildMoov()` function at line ~424 **drops the `edts` (Edit List) box entirely**:

```typescript
} else if (child.type === "edts") {
  // CRITICAL: Drop the edit list (elst) from the stitched file.
  continue;
}
```

Without the `edts`/`elst` box, media players don't know the full playback timeline and only play the first clip's duration.

## The Fix

Replace the `edts` drop with a rebuilt `elst` that covers the full combined duration. The fix has two parts:

### Part 1: Fix `src/lib/media/mp4-concat.ts`

In the `rebuildTrak()` function inside `rebuildMoov()`, find the block that says:

```typescript
} else if (child.type === "edts") {
  // CRITICAL: Drop the edit list (elst) from the stitched file.
  // The original elst limits playback to the first clip's duration (~10s).
  // Without edts, the player uses the full duration from tkhd/mdhd,
  // which we've already patched to the combined total duration.
  continue;
```

Replace it with code that **rebuilds the `edts` box** with a single `elst` entry covering the full combined duration:

```typescript
} else if (child.type === "edts") {
  // Rebuild edts with a single elst entry spanning the full combined duration.
  // The original elst only covers the first clip's duration — we need to extend it
  // to cover all stitched clips. A single segment from 0 to totalDuration works
  // because we've already combined all sample tables into one continuous track.
  const elstData = Buffer.alloc(4 + 4 + 12); // version+flags + entry_count + 1 entry
  elstData.writeUInt32BE(0, 0); // version 0, flags 0
  elstData.writeUInt32BE(1, 4); // entry_count = 1
  // Entry: segment_duration (in movie timescale), media_time (0 = start), media_rate (1.0 = normal)
  elstData.writeUInt32BE(trackMediaDuration, 8); // segment_duration = full combined duration
  elstData.writeInt32BE(0, 12); // media_time = 0 (start from beginning)
  elstData.writeUInt16BE(1, 16); // media_rate_integer = 1
  elstData.writeUInt16BE(0, 18); // media_rate_fraction = 0
  const elstBox = makeFullBox("elst", 0, 0, elstData);
  const edtsBox = makeBox("edts", elstBox);
  parts.push(edtsBox);
```

**IMPORTANT**: The `makeBox` and `makeFullBox` functions are already defined in the file (around lines 304-315). They're module-level functions, so they're accessible from within `rebuildTrak`.

**ALSO IMPORTANT**: The variable `trackMediaDuration` is already available in scope — it's a parameter of the `rebuildTrak` function (line ~414).

### Part 2: Fix the silent fallback in all callers

The callers catch stitching errors and silently return the first clip. This hides failures. Update these three locations to **log clearly** when falling back:

#### A. `src/lib/content/director-movies.ts` (~line 1078-1080)

Change:
```typescript
} catch (err) {
  console.error(`[director-movies] MP4 concatenation failed, using first clip as fallback:`, err);
  stitched = clipBuffers[0];
}
```

To:
```typescript
} catch (err) {
  console.error(`[director-movies] MP4 concatenation FAILED for ${clipBuffers.length} clips:`, err);
  console.error(`[director-movies] FALLING BACK TO FIRST CLIP ONLY — video will be 10s instead of ${clipBuffers.length * 10}s`);
  stitched = clipBuffers[0];
}
```

#### B. `src/lib/media/multi-clip.ts` — find the `stitchAndPost` function's catch block

Look for similar pattern and add the same clear logging.

#### C. `src/app/api/generate-ads/route.ts` — find the PUT handler's catch block for stitching

Look for similar pattern and add the same clear logging.

### Part 3: Add diagnostic query to check scene completion

Add this to the existing admin health check or create a quick diagnostic:

```sql
-- Check if scenes are actually completing
SELECT
  j.id, j.title, j.clip_count, j.completed_clips, j.status,
  COUNT(CASE WHEN s.status = 'done' THEN 1 END) as scenes_done,
  COUNT(CASE WHEN s.status = 'failed' THEN 1 END) as scenes_failed,
  COUNT(CASE WHEN s.status = 'submitted' THEN 1 END) as scenes_pending,
  string_agg(CASE WHEN s.status = 'failed' THEN s.fail_reason END, ', ') as fail_reasons
FROM multi_clip_jobs j
LEFT JOIN multi_clip_scenes s ON s.job_id = j.id
WHERE j.created_at > NOW() - INTERVAL '7 days'
GROUP BY j.id, j.title, j.clip_count, j.completed_clips, j.status
ORDER BY j.created_at DESC
LIMIT 10;
```

This will show if scenes are failing (moderation, timeout) vs if stitching is the problem.

## How to Test

1. Apply the fix to `mp4-concat.ts`
2. Generate a director movie (admin panel → directors → generate)
3. Wait for all scenes to complete (check multi_clip_scenes status)
4. The stitched video should play for the full duration (60-80s for 6-8 scenes)
5. Check Vercel logs for `[mp4-concat] Stitched X clips` message — file size should be sum of all clips

## Files to Modify

1. `src/lib/media/mp4-concat.ts` — **THE FIX** (rebuild edts/elst instead of dropping)
2. `src/lib/content/director-movies.ts` — better fallback logging
3. `src/lib/media/multi-clip.ts` — better fallback logging
4. `src/app/api/generate-ads/route.ts` — better fallback logging

## Don't Forget

- Run `npx tsc --noEmit` before pushing
- This fix affects ALL multi-clip video output (director movies, 30s ads, multi-clip jobs)
- The `elst` segment_duration should use `trackMediaDuration` (media timescale), NOT movie timescale
