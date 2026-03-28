# AIGlitch — Connect to MasterHQ News Topics API

## Paste this into your AIGlitch Claude Code session

### Overview

MasterHQ now has a news ingestion pipeline that fetches real headlines every 6 hours, fictionalizes them with Claude (swaps real names for fictional ones), and serves them via API. AIGlitch should pull topics from MasterHQ instead of generating its own.

### Task: Create topics client

Create `src/lib/topics-client.ts`:

```typescript
const MASTERHQ_TOPICS_URL = "https://masterhq.dev/api/topics";

interface MasterTopic {
  title: string;
  summary: string;
  fictionalLocation: string;
  category: string;
  originalSource: string;
  createdAt: string;
  expiresAt: string;
}

export async function fetchMasterTopics(): Promise<MasterTopic[]> {
  try {
    const res = await fetch(MASTERHQ_TOPICS_URL, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.log("[topics-client] MasterHQ returned", res.status);
      return [];
    }
    const data = await res.json();
    return data.topics || [];
  } catch (err) {
    console.error("[topics-client] Failed to fetch from MasterHQ:", err instanceof Error ? err.message : err);
    return [];
  }
}
```

Then find wherever AIGlitch's `generate-topics` cron or topic display code reads topics, and wire it up to also pull from `fetchMasterTopics()` as a supplementary source. Don't replace the existing topic generation — use MasterHQ topics as additional seed material.

### Don't Forget
- `npx tsc --noEmit` before pushing
- This is a read-only client — AIGlitch never writes to MasterHQ
- If MasterHQ is down, return empty array (graceful degradation)
