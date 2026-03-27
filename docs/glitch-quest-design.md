# §GLITCH Quest Campaign System — Design Document

> **Status:** Planned (not yet built)
> **Last updated:** 2026-03-27
> **Built on:** MasterHQ (handles quests for AIGlitch and all future projects)

---

## Overview

A shareable "quest" page where users complete 10-20 tasks to earn §GLITCH rewards. Users grow the platform by completing tasks (subscribe, like, share, download), and get rewarded with §GLITCH tokens.

MasterHQ is the quest engine — it manages quests for AIGlitch and any future campaigns across all projects.

---

## User Flow

1. User lands on `/quest` (or `/quest/[slug]`) — shareable public page
2. Sees the quest: "Complete 15 tasks, earn §500 GLITCH"
3. Connects Phantom wallet to start
4. Task checklist appears with progress bar
5. Auto-verified tasks check instantly (likes, subscriptions, wallet connected)
6. Self-reported tasks show an upload/link button
7. When all required tasks done → "Claim Reward" button
8. §GLITCH transferred to their wallet (on-chain or in-app)
9. Confetti, share buttons, referral link

---

## Task Types (3 categories)

### Auto-verified (checked in our DB)
| Task | How we verify |
|------|--------------|
| Connect Phantom wallet | `human_users.phantom_wallet_address` exists |
| Like X posts on AIG!itch | Count in `human_likes` table |
| Subscribe to X personas | Count in `human_subscriptions` table |
| Comment on X posts | Count in `human_comments` table |
| Hatch an AI Bestie | `ai_personas` with `owner_wallet_address` matching |
| Hold §GLITCH balance above X | Check on-chain SPL balance |
| Buy an NFT from marketplace | `marketplace_purchases` table |
| Watch X director movies | Track via view events |
| Visit X different channels | Track via channel feed views |

### Platform-verified (check via API)
| Task | How we verify |
|------|--------------|
| Follow @spiritary on X | X API followers check |
| Follow @aiglicthed on TikTok | TikTok API (limited) |
| Subscribe to YouTube @frekin31 | YouTube API |

### Self-reported (user submits proof)
| Task | Proof type |
|------|-----------|
| Share AIG!itch on X with #AIGlitch | Link to tweet |
| Join AIG!itch Telegram | Screenshot |
| Download G!itch Bestie app | Screenshot |
| Invite a friend (referral code) | Auto-tracked via referral |
| Post about AIG!itch with #AIGlitch | Link to post |

---

## Database Tables

### `quest_campaigns`
```sql
CREATE TABLE quest_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  banner_url VARCHAR(500),
  reward_glitch INTEGER NOT NULL DEFAULT 0,
  reward_type VARCHAR(50) NOT NULL DEFAULT 'in_app',
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  max_participants INTEGER,
  min_tasks_required INTEGER,
  share_text TEXT,
  referral_bonus INTEGER DEFAULT 0,
  project VARCHAR(100) DEFAULT 'aiglitch',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `quest_tasks`
```sql
CREATE TABLE quest_tasks (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES quest_campaigns(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  emoji VARCHAR(10),
  task_type VARCHAR(50) NOT NULL DEFAULT 'auto',
  verification_method VARCHAR(50) NOT NULL DEFAULT 'db_check',
  verification_config JSONB DEFAULT '{}',
  reward_glitch INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `quest_participants`
```sql
CREATE TABLE quest_participants (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES quest_campaigns(id) ON DELETE CASCADE,
  wallet_address VARCHAR(255),
  session_id VARCHAR(255),
  referrer_id INTEGER REFERENCES quest_participants(id),
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  total_tasks INTEGER NOT NULL DEFAULT 0,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  reward_amount INTEGER NOT NULL DEFAULT 0,
  reward_tx_hash VARCHAR(255),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(campaign_id, wallet_address)
);
```

### `quest_task_completions`
```sql
CREATE TABLE quest_task_completions (
  id SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES quest_participants(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES quest_tasks(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  proof_url VARCHAR(500),
  verified_at TIMESTAMPTZ,
  verified_by VARCHAR(50),
  UNIQUE(participant_id, task_id)
);
```

---

## Example Quest: "The AIG!itch Initiation"

| # | Task | Type | Reward | Required |
|---|------|------|--------|----------|
| 1 | Connect Phantom Wallet | Auto | §50 | Yes |
| 2 | Follow @spiritary on X | Self-report | §25 | Yes |
| 3 | Follow @aiglicthed on TikTok | Self-report | §25 | No |
| 4 | Like 5 posts on AIG!itch | Auto | §50 | Yes |
| 5 | Subscribe to 3 AI personas | Auto | §50 | Yes |
| 6 | Comment on 3 posts | Auto | §50 | Yes |
| 7 | Share AIG!itch on X (#AIGlitch) | Self-report | §25 | No |
| 8 | Join AIG!itch Telegram | Self-report | §25 | No |
| 9 | Download G!itch Bestie app | Self-report | §25 | No |
| 10 | Watch 3 director movies | Auto | §25 | No |
| 11 | Visit 3 different channels | Auto | §25 | No |
| 12 | Hatch an AI Bestie (costs §1000) | Auto | §100 | No |
| 13 | Share a channel video | Self-report | §25 | No |
| 14 | Invite a friend (referral) | Auto | §50 | No |
| 15 | Hold §500 GLITCH for 24h | Auto | §100 | No |
| | **TOTAL** | | **§650** | |

---

## Reward Distribution

### Phase 1: In-app §GLITCH balance (build first)
- Credit user's `coin_transactions` balance
- No on-chain cost
- They can later swap to on-chain via the exchange

### Phase 2: On-chain SPL token transfer (later)
- Transfer from treasury wallet to user's Phantom wallet
- Requires `TREASURY_PRIVATE_KEY` to sign
- Logged in `blockchain_transactions`
- Costs SOL for transaction fees

---

## API Endpoints (MasterHQ)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/quest` | GET | List active quests |
| `/api/quest/[slug]` | GET | Get quest details + user progress |
| `/api/quest/[slug]/join` | POST | Join quest (connect wallet) |
| `/api/quest/[slug]/check` | POST | Check auto-verified tasks |
| `/api/quest/[slug]/submit` | POST | Submit proof for self-reported task |
| `/api/quest/[slug]/claim` | POST | Claim reward |
| `/api/admin/quests` | GET/POST/PUT/DELETE | Quest CRUD |
| `/api/admin/quests/[id]/tasks` | GET/POST/PUT/DELETE | Task CRUD |
| `/api/admin/quests/[id]/participants` | GET | View participants + progress |
| `/api/admin/quests/[id]/approve` | POST | Approve/reject self-reported tasks |

Note: For auto-verified tasks that check AIGlitch's database (likes, subscriptions, comments), MasterHQ calls AIGlitch's API endpoints to verify. MasterHQ is the quest engine; AIGlitch provides the verification data.

---

## Admin Dashboard (MasterHQ `/admin/quests` or `/quests`)

- **Quest List:** All quests with status, participant count, completion rate
- **Quest Creator:** Form to create new quests with task builder
- **Task Builder:** Add/edit/reorder tasks with verification config
- **Participant View:** See who's participating, progress, drop-off points
- **Approval Queue:** Self-reported tasks waiting for admin review
- **Analytics:** Task completion rates, referral tracking, funnel
- **Reward Tracker:** Total §GLITCH distributed, pending claims

---

## Public Quest Page (MasterHQ `/quest/[slug]`)

- Full dark theme with neon aesthetic (or light mode)
- Mobile responsive (iPad + phone)
- No auth required to view — wallet connection required to participate
- Hero: Quest name, description, total reward, time remaining
- Progress bar
- Task checklist with status indicators
- Claim reward button
- Share buttons + referral link

---

## Referral System

- Each participant gets unique referral link: `/quest/[slug]?ref=[participant_id]`
- Referred user joins AND completes → referrer gets bonus §GLITCH
- One level only (no MLM chains)
- Bonus amount configured per quest

---

## Shareable Campaign

- OG meta tags for social sharing
- Pre-written share text per quest
- QR code for mobile sharing
- Auto-spread quest link via MasterHQ Growth Engine to all platforms

---

## Decisions Made

| Decision | Answer |
|----------|--------|
| Reward type | In-app balance first, on-chain later |
| Verification | Auto-approve auto-verified, admin review self-reported |
| Multiple quests | Yes — run several simultaneously |
| Referral bonus | Yes — configurable per quest |
| Time limit | Optional per campaign |
| Minimum tasks | Must complete all REQUIRED tasks, bonus tasks optional |
| Where it lives | MasterHQ manages quests for all projects |

---

## Implementation Order

1. Database tables (MongoDB collections on MasterHQ)
2. Quest CRUD API + admin page
3. Public quest page (`/quest/[slug]`)
4. Auto-verification engine (calls AIGlitch APIs)
5. Self-report submission + admin approval
6. Reward distribution (in-app first)
7. Referral system
8. Social sharing + OG tags
9. Growth Engine auto-spread
10. On-chain rewards (later)

---

*This document will be updated when the system is built.*
