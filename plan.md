# ReviewIQ — AI-Powered Google Review Management SaaS
## Master Build Plan (Full Phases + Validation)

> **Supabase Project:** `db.gjlmkwdsqasevvzptrhq.supabase.co`
> **Stack:** Next.js 14 · TypeScript · Supabase · TailwindCSS · shadcn/ui · OpenAI · Google Business Profile API

---

## RULE SET (from Rules.txt)

- No partial implementations
- No TODO comments in code
- No mock API responses in production paths
- No secrets exposed in client bundle
- Every phase must pass validation before next phase begins
- Every page must: fetch real data · handle loading · handle empty · handle error · be mobile responsive
- After every major output: ask "Is this production ready?" — if no, fix first

---

## PHASE 1 — Core Architecture

### Goal
Establish production-ready skeleton with zero technical debt.

### Checklist
- [ ] Next.js 14 App Router scaffolded (`src/app/`)
- [ ] TypeScript strict mode (`"strict": true` in tsconfig.json)
- [ ] Tailwind CSS configured with CSS variables
- [ ] shadcn/ui component primitives installed
- [ ] Supabase browser client (`src/lib/supabase/client.ts`)
- [ ] Supabase server client (`src/lib/supabase/server.ts`)
- [ ] Supabase admin client (service-role for Edge Functions)
- [ ] Environment variables documented (`.env.example`)
- [ ] Middleware for auth session management (`src/middleware.ts`)
- [ ] PostCSS config
- [ ] `tailwind.config.ts` with full shadcn theme tokens
- [ ] `next.config.js` with image domains + server actions config
- [ ] `tsconfig.json` with `@/*` alias
- [ ] `package.json` with all dependencies pinned

### Files to Create
```
review-saas/
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── postcss.config.js
└── src/
    ├── middleware.ts
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts
    │   │   └── server.ts
    │   └── utils.ts
    ├── types/
    │   └── database.ts
    └── app/
        ├── globals.css
        ├── layout.tsx
        └── page.tsx  (landing page)
```

### Validation
- TypeScript compiles with zero errors (`tsc --noEmit`)
- `npm run dev` starts without errors
- Supabase client initializes correctly with env vars

---

## PHASE 2 — Database & RLS

### Goal
Full Postgres schema with zero RLS gaps across all tenants.

### Checklist
- [ ] All enum types created
- [ ] `businesses` table
- [ ] `users` table (references auth.users)
- [ ] `branches` table
- [ ] `google_tokens` table
- [ ] `reviews` table with all indexes
- [ ] `replies` table
- [ ] `review_tags` table
- [ ] `alerts` table
- [ ] `ai_summaries` table
- [ ] `team_invitations` table
- [ ] `sync_logs` table
- [ ] Auto-trigger: new auth user → insert into `users`
- [ ] Auto-trigger: `updated_at` on businesses + google_tokens
- [ ] RLS enabled on ALL tables
- [ ] Helper functions: `get_user_business_id()`, `get_user_role()`
- [ ] RLS policies: businesses, users, branches, google_tokens, reviews, replies, review_tags, alerts, ai_summaries, team_invitations, sync_logs
- [ ] `branch_stats` view with `get_branch_stats_for_user()` function
- [ ] Indexes: branch_id, rating, review_time, sentiment, reply_status

### Tables & Schema

| Table | Primary Key | Key FKs | Indexes |
|-------|-------------|---------|---------|
| businesses | uuid | — | — |
| users | uuid (→ auth.users) | business_id | — |
| branches | uuid | business_id | business_id |
| google_tokens | uuid | business_id | business_id UNIQUE |
| reviews | uuid | branch_id | branch_id, rating, review_time, sentiment |
| replies | uuid | review_id | review_id UNIQUE |
| review_tags | uuid | review_id | review_id, tag |
| alerts | uuid | business_id, branch_id, review_id | business_id, is_read |
| ai_summaries | uuid | branch_id | branch_id |
| team_invitations | uuid | business_id | token UNIQUE |
| sync_logs | uuid | business_id, branch_id | — |

### RLS Policy Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| businesses | own business | true (signup) | owner only | — |
| users | same business | own id only | own id only | owner/manager |
| branches | same business | owner/manager | owner/manager | owner |
| google_tokens | owner only | owner only | owner only | owner only |
| reviews | same business via branch | service role | owner/manager | — |
| replies | same business via review | authenticated | same business | — |
| review_tags | same business | service role | — | — |
| alerts | same business | service role | same business | — |
| ai_summaries | same business via branch | service role | — | — |
| team_invitations | same business OR token lookup | owner/manager | — | owner/manager |
| sync_logs | owner only | service role | — | — |

### Multi-Tenant Isolation Test
```sql
-- Simulate: User A (business_id = 'biz-A') cannot see Business B reviews
-- Set search_path to simulate user A's JWT
SET request.jwt.claims = '{"sub": "user-a-id"}';

-- This should return 0 rows (not user A's business)
SELECT * FROM reviews
WHERE branch_id IN (
  SELECT id FROM branches WHERE business_id = 'biz-B-id'
);
-- Expected: 0 rows (RLS blocks cross-tenant access)
```

### Migration File
```
supabase/migrations/001_initial_schema.sql
```

---

## PHASE 3 — Authentication & Roles

### Goal
Bulletproof auth with automatic tenant setup and role-gated UI.

### Checklist
- [ ] Supabase Auth email/password sign-up
- [ ] On signup: create `businesses` record → link `users.business_id`
- [ ] Middleware redirects unauthenticated users from `/dashboard/*`
- [ ] Middleware redirects authenticated users away from `/auth/*`
- [ ] Login page (`/auth/login`)
- [ ] Signup page (`/auth/signup`) — creates business on first sign-up
- [ ] API route: `POST /api/auth/setup` — creates business + links user atomically
- [ ] Session refresh handled in middleware
- [ ] Role propagated through dashboard layout to all child pages
- [ ] Role-gated sidebar navigation

### Role-Permission Matrix

| Permission | Owner | Manager | Staff |
|-----------|-------|---------|-------|
| View overview | ✓ | ✓ | ✓ |
| View reviews | ✓ | ✓ | ✓ |
| Reply to reviews | ✓ | ✓ | ✗ |
| View branches | ✓ | ✓ | ✓ |
| Add/edit branches | ✓ | ✓ | ✗ |
| Delete branches | ✓ | ✗ | ✗ |
| View AI insights | ✓ | ✓ | ✓ |
| View alerts | ✓ | ✓ | ✓ |
| Manage team | ✓ | ✓ | ✗ |
| View settings | ✓ | ✓ | ✓ |
| Change settings | ✓ | ✓ | ✗ |
| Connect Google | ✓ | ✗ | ✗ |
| Manage billing | ✓ | ✗ | ✗ |

### Files to Create
```
src/app/
├── auth/
│   ├── layout.tsx           ← split-panel auth layout
│   ├── login/page.tsx
│   └── signup/page.tsx
└── api/
    └── auth/
        ├── setup/route.ts   ← POST: create business + link user
        └── google/
            ├── route.ts     ← GET: redirect to Google OAuth
            └── callback/route.ts  ← GET: exchange code, store tokens
```

---

## PHASE 4 — Google OAuth Integration

### Goal
Full OAuth 2.0 flow for Google Business Profile API with token rotation.

### Checklist
- [ ] `GET /api/auth/google` — builds OAuth URL with correct scopes, redirects
- [ ] `GET /api/auth/google/callback` — exchanges code → access+refresh token
- [ ] Tokens stored in `google_tokens` (refresh token encrypted at rest)
- [ ] Token refresh function: `src/lib/google/token.ts`
- [ ] `accounts.list` call: fetches Google account IDs
- [ ] `locations.list` call: fetches all business locations
- [ ] Branches auto-upserted into DB (duplicate protection via `google_location_id`)
- [ ] Connect/Disconnect Google button in Settings page
- [ ] Error handling: expired token, revoked permission

### Scopes Required
```
https://www.googleapis.com/auth/business.manage
```

### OAuth Flow Diagram
```
User clicks "Connect Google"
       ↓
GET /api/auth/google
  → builds URL: accounts.google.com/o/oauth2/v2/auth
    ?client_id=...
    &redirect_uri=.../api/auth/google/callback
    &scope=business.manage
    &access_type=offline
    &prompt=consent
       ↓
User approves
       ↓
GET /api/auth/google/callback?code=...
  → POST oauth2.googleapis.com/token (exchange code)
  → Store access_token + refresh_token in google_tokens
  → Call mybusiness.googleapis.com/v1/accounts
  → For each account: call locations.list
  → Upsert branches into DB
  → Redirect to /dashboard
```

### Failure Simulation Handling

| Scenario | Handling |
|----------|----------|
| Expired access token | `token.ts` detects `expiry_date < now()`, calls refresh endpoint, updates `google_tokens` |
| Revoked refresh token | Catches 401 on refresh call, clears `google_tokens`, sets flag on business, alerts owner |
| Business with 10 branches | `locations.list` pagination with `pageToken`, upserts all 10, skips existing via ON CONFLICT |

### Files to Create
```
src/
├── lib/
│   └── google/
│       ├── token.ts         ← refreshAccessToken(), getValidToken()
│       ├── accounts.ts      ← listAccounts()
│       └── locations.ts     ← listLocations(), syncBranchesToDB()
└── app/
    └── api/
        └── auth/
            └── google/
                ├── route.ts
                └── callback/route.ts
```

---

## PHASE 5 — Review Sync Engine

### Goal
Reliable background worker that keeps reviews current with Google.

### Checklist
- [ ] Supabase Edge Function: `supabase/functions/sync-reviews/index.ts`
- [ ] Cron schedule: every 5 minutes in `supabase/functions/sync-reviews/cron.ts`
- [ ] Iterates all businesses with active subscriptions
- [ ] Per business: refreshes access token if expired
- [ ] Per branch: calls `reviews.list` API
- [ ] Deduplication via `google_review_id` UNIQUE constraint (ON CONFLICT DO NOTHING)
- [ ] Pagination: follows `nextPageToken`
- [ ] After insert: triggers AI analysis pipeline
- [ ] Alert creation for reviews with rating ≤ 2
- [ ] API quota handling: exponential backoff, skip on 429
- [ ] Sync log written per run (started_at, completed_at, reviews_inserted, error)
- [ ] Inactive subscription = skip sync

### Sync Flow
```
sync-reviews (cron every 5 min)
  ↓
SELECT businesses WHERE subscription_plan != 'inactive'
  ↓
For each business:
  ├── getValidToken(business_id)         ← refresh if needed
  ├── SELECT branches WHERE business_id
  └── For each branch:
       ├── GET reviews.list (paginated)
       ├── INSERT reviews ON CONFLICT DO NOTHING
       ├── For each NEW review:
       │   ├── analyzeReview(review)     ← OpenAI
       │   ├── UPDATE reviews SET sentiment, ai_suggested_reply
       │   ├── INSERT review_tags
       │   └── IF rating ≤ 2 → INSERT alerts
       └── UPDATE sync_logs
```

### Failure Simulation Handling

| Scenario | Handling |
|----------|----------|
| 5000 reviews | Paginated loop with `nextPageToken`, batched inserts, rate-limited |
| API rate limit (429) | Catch 429, log error, exponential backoff (1s→2s→4s), move to next branch |
| Branch removed from Google | API returns 404 for location, mark `branches.is_active = false`, skip silently |

### Files to Create
```
supabase/
└── functions/
    └── sync-reviews/
        ├── index.ts         ← Edge Function handler
        └── _shared/
            ├── google.ts    ← review fetch helpers
            ├── ai.ts        ← AI analysis call
            └── alerts.ts    ← alert creation helpers
```

---

## PHASE 6 — AI Layer

### Goal
OpenAI-powered sentiment, tagging, and auto-reply generation.

### Checklist
- [ ] `src/lib/ai/analyze.ts` — analyzeReview(review) → { sentiment, tags, suggestedReply }
- [ ] Uses `gpt-4o-mini` for cost efficiency
- [ ] Structured output via JSON mode
- [ ] Sentiment: positive / neutral / negative
- [ ] Topics extracted from review text (up to 5 tags from approved list)
- [ ] Suggested reply: professional, empathetic, 2-3 sentences
- [ ] Auto-reply toggle per business (checked before posting)
- [ ] Auto-post to Google if rating ≥ 4 AND toggle enabled
- [ ] Auto-post apology if rating ≤ 2 AND toggle enabled
- [ ] Manual override: user can edit and re-post
- [ ] `src/lib/ai/post-reply.ts` — postReplyToGoogle(reviewId, replyText)

### Validation — Sample Review Analysis
**Input:** `"Food good but staff rude and overpriced"`

**Expected Output:**
```json
{
  "sentiment": "negative",
  "tags": ["staff", "price", "taste"],
  "suggestedReply": "Thank you for taking the time to share your feedback. We sincerely apologize for the experience with our team — that is not the standard we hold ourselves to. We are actively addressing this and hope to welcome you back for a much better visit."
}
```

### Prompt Engineering
```
System: You are a professional restaurant reputation manager.
        Analyze the following customer review and respond in JSON.

Schema:
{
  "sentiment": "positive" | "neutral" | "negative",
  "tags": string[],  // from: [price, staff, cleanliness, service, taste, ambience, waiting_time]
  "suggestedReply": string  // professional, 2-3 sentences, empathetic
}
```

### Files to Create
```
src/lib/
└── ai/
    ├── analyze.ts       ← analyzeReview()
    └── post-reply.ts    ← postReplyToGoogle()
```

---

## PHASE 7 — Dashboard UI (8 Pages)

### Goal
Full, real-data dashboard — no mock data anywhere.

### Pages Checklist

#### `/dashboard` — Overview
- [ ] Stats cards: avg rating, total reviews, reviews this month, % negative
- [ ] Bar chart: rating distribution (1–5 stars)
- [ ] Line chart: monthly review trend (12 months)
- [ ] Branch comparison table (top 5 by review count)
- [ ] Real data from Supabase server component
- [ ] Loading skeleton
- [ ] Empty state (no branches connected yet)

#### `/dashboard/reviews` — Reviews
- [ ] Server-side paginated table (25 per page)
- [ ] Filters: branch, rating (1-5), date range, sentiment
- [ ] Columns: Reviewer, Branch, Rating (stars), Review text (truncated), Sentiment badge, Reply status, Action
- [ ] Reply modal: AI suggested reply pre-filled, editable, "Post to Google" button
- [ ] Sentiment badge: green/yellow/red
- [ ] Export reviews as CSV

#### `/dashboard/branches` — Branches
- [ ] List all connected branches
- [ ] Branch card: name, city, avg rating, total reviews, status
- [ ] "Sync Now" button per branch
- [ ] Add branch (auto-populated from Google)
- [ ] Delete branch (owner only)

#### `/dashboard/insights` — AI Insights
- [ ] Most mentioned complaints (top tags from negative reviews)
- [ ] Most praised aspects (top tags from positive reviews)
- [ ] Current month AI summary per branch
- [ ] Rating trend chart per branch (line, 6 months)
- [ ] Top complaint branch (highest % negative)

#### `/dashboard/alerts` — Alerts
- [ ] List all 1★ and 2★ reviews as alerts
- [ ] Unread count badge in sidebar
- [ ] Mark as read
- [ ] Quick reply action (opens reply modal)
- [ ] Sorted by created_at DESC

#### `/dashboard/team` — Team Management
- [ ] List all users in business with roles
- [ ] Invite user by email (sends invitation token)
- [ ] Change user role (owner/manager → owner of invite can change)
- [ ] Remove user
- [ ] Pending invitations list

#### `/dashboard/settings` — Settings
- [ ] Business name + logo upload
- [ ] Auto-reply toggle (with explanation)
- [ ] Low rating threshold selector (1–3)
- [ ] Notification email
- [ ] Notification WhatsApp number
- [ ] Connect/Disconnect Google Business
- [ ] Danger zone: delete business (owner only)

#### `/dashboard/billing` — Billing
- [ ] Current plan display
- [ ] Plan limits (branches, users, syncs/month)
- [ ] Upgrade CTA (Stripe ready)
- [ ] Billing history placeholder

### UI Standards Per Page
Every page must implement:
```typescript
// 1. Loading state
export default function Loading() {
  return <PageSkeleton />
}

// 2. Error boundary
export default function Error({ error, reset }) {
  return <ErrorCard message={error.message} onRetry={reset} />
}

// 3. Empty state (within page)
if (data.length === 0) return <EmptyState />
```

### Files to Create
```
src/app/dashboard/
├── page.tsx                          ← Overview
├── loading.tsx                       ← Skeleton
├── error.tsx                         ← Error boundary
├── layout.tsx                        ← Sidebar + header layout
├── reviews/
│   ├── page.tsx
│   ├── loading.tsx
│   └── error.tsx
├── branches/
│   ├── page.tsx
│   ├── loading.tsx
│   └── error.tsx
├── insights/
│   ├── page.tsx
│   ├── loading.tsx
│   └── error.tsx
├── alerts/
│   ├── page.tsx
│   ├── loading.tsx
│   └── error.tsx
├── team/
│   ├── page.tsx
│   ├── loading.tsx
│   └── error.tsx
├── settings/
│   ├── page.tsx
│   ├── loading.tsx
│   └── error.tsx
└── billing/
    ├── page.tsx
    ├── loading.tsx
    └── error.tsx
```

---

## PHASE 8 — Performance & Scaling Audit

### Checklist
- [ ] Reviews paginated (25/page, cursor-based via `created_at`)
- [ ] `branch_id` indexed on reviews
- [ ] `rating` indexed on reviews
- [ ] `review_time DESC` indexed on reviews
- [ ] No N+1: reviews fetched with branch JOIN in one query
- [ ] Server Components for all read-only pages (no unnecessary client hydration)
- [ ] `unstable_cache` / `revalidatePath` strategy defined
- [ ] Edge Function runs in Supabase edge (global low latency)
- [ ] `branch_stats` pre-aggregated view used for overview instead of live aggregation

### Scaling Strategy

| Scale | Approach |
|-------|----------|
| 100 businesses | RLS helper function uses index on `users.business_id`, query is O(1) |
| 500 branches | `branches` table indexed on `business_id`, JOIN stays fast |
| 100k reviews | Paginated queries only, `branch_id + review_time` composite index, `branch_stats` view handles aggregation |

### Caching Strategy
```
/dashboard          → revalidate every 60s (ISR)
/dashboard/reviews  → no cache (real-time filter)
/dashboard/insights → revalidate every 1 hour
/dashboard/alerts   → revalidate every 30s
```

---

## PHASE 9 — Security Audit

### Checklist
- [ ] Refresh tokens: stored in `google_tokens.refresh_token`, column encryption via pgcrypto OR Supabase Vault
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never imported in any `src/app/` client file
- [ ] `OPENAI_API_KEY` never in client bundle
- [ ] `GOOGLE_CLIENT_SECRET` only in server-side API routes
- [ ] All `/api/*` routes check `supabase.auth.getUser()` before processing
- [ ] RLS enforced as primary gate (not just API middleware)
- [ ] No `business_id` accepted from request body for tenant-scoped operations (derived from session)
- [ ] Rate limiting on: `/api/auth/*`, `/api/reviews/reply`, `/api/google/*`
- [ ] `X-Frame-Options: DENY` and security headers via `next.config.js`

### Privilege Escalation Test
```
Attack: User changes business_id in POST /api/reviews/reply body to competitor's ID.
Defense: Server action derives business_id ONLY from auth.uid() via get_user_business_id().
         The supplied business_id is never trusted.
Result: RLS blocks the query. 0 rows affected. 403 returned.
```

### Security Headers (next.config.js)
```js
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
```

---

## Server Actions Coverage

All mutations go through typed server actions (no direct client-side Supabase calls for writes):

```
src/app/actions/
├── business.ts      ← updateBusiness(), deleteBusiness()
├── reviews.ts       ← postReply(), markReviewed()
├── branches.ts      ← syncBranches(), deleteBranch()
├── team.ts          ← inviteUser(), updateRole(), removeUser()
├── settings.ts      ← updateSettings(), toggleAutoReply()
└── alerts.ts        ← markAlertRead(), markAllRead()
```

---

## API Routes Coverage

```
src/app/api/
├── auth/
│   ├── setup/route.ts             ← POST: create business on signup
│   └── google/
│       ├── route.ts               ← GET: OAuth redirect
│       └── callback/route.ts      ← GET: code exchange + branch sync
├── reviews/
│   └── reply/route.ts             ← POST: post reply to Google
├── reports/
│   ├── export-csv/route.ts        ← GET: export reviews CSV
│   └── export-pdf/route.ts        ← GET: generate monthly PDF
└── webhooks/
    └── stripe/route.ts            ← POST: Stripe webhook handler
```

---

## UI Component Library (shadcn/ui + custom)

```
src/components/
├── ui/                            ← shadcn primitives
│   ├── button.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── select.tsx
│   ├── dialog.tsx
│   ├── sheet.tsx
│   ├── badge.tsx
│   ├── card.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   ├── switch.tsx
│   ├── avatar.tsx
│   ├── dropdown-menu.tsx
│   ├── toast.tsx
│   ├── toaster.tsx
│   ├── use-toast.ts
│   ├── skeleton.tsx
│   ├── separator.tsx
│   ├── tooltip.tsx
│   └── scroll-area.tsx
├── dashboard/
│   ├── sidebar.tsx                ← collapsible, role-aware nav
│   ├── header.tsx                 ← top bar with user avatar
│   ├── stats-card.tsx             ← reusable metric card
│   ├── rating-badge.tsx           ← colored star rating
│   ├── sentiment-badge.tsx        ← positive/neutral/negative badge
│   ├── reply-modal.tsx            ← AI reply + edit + post
│   ├── review-table.tsx           ← paginated reviews table
│   ├── branch-table.tsx           ← branch comparison table
│   └── charts/
│       ├── rating-bar-chart.tsx   ← recharts BarChart
│       ├── monthly-line-chart.tsx ← recharts LineChart
│       └── branch-radar-chart.tsx ← recharts RadarChart
└── shared/
    ├── page-header.tsx            ← consistent page title
    ├── empty-state.tsx            ← reusable empty state
    ├── error-card.tsx             ← error display with retry
    └── loading-skeleton.tsx       ← page-level skeleton
```

---

## Report Generation

```
src/app/api/reports/
├── export-csv/route.ts    ← streams CSV using papaparse
└── export-pdf/route.ts    ← generates PDF using jspdf + autotable
```

**CSV Export columns:** Date · Reviewer · Branch · Rating · Sentiment · Review Text · Reply Status · Reply Text

**PDF Export sections:** Cover page · Overall stats · Branch comparison table · Top complaints · Monthly trend chart (as image)

---

## Billing Structure (Stripe-ready)

### Plans

| Plan | Branches | Users | AI Replies/mo | Price |
|------|----------|-------|--------------|-------|
| Free | 1 | 1 | 50 | $0 |
| Starter | 5 | 3 | 500 | $29/mo |
| Professional | 25 | 10 | 5,000 | $99/mo |
| Enterprise | Unlimited | Unlimited | Unlimited | Custom |

### Stripe Integration Points
- `POST /api/webhooks/stripe` — handle `customer.subscription.updated`, `invoice.payment_failed`
- On payment failure: set `businesses.subscription_plan = 'inactive'`, pause sync
- On upgrade: set plan, persist in DB
- Checkout session created server-side only (never client-side)

---

## Complete Folder Structure

```
review-saas/
├── .env.example
├── .eslintrc.json
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── plan.md                              ← THIS FILE
├── supabase/
│   ├── config.toml
│   └── migrations/
│       └── 001_initial_schema.sql       ← Full schema + RLS
├── supabase-functions/
│   └── sync-reviews/
│       ├── index.ts
│       └── _shared/
│           ├── google.ts
│           ├── ai.ts
│           └── alerts.ts
└── src/
    ├── middleware.ts
    ├── types/
    │   └── database.ts
    ├── lib/
    │   ├── utils.ts
    │   ├── supabase/
    │   │   ├── client.ts
    │   │   └── server.ts
    │   ├── google/
    │   │   ├── token.ts
    │   │   ├── accounts.ts
    │   │   └── locations.ts
    │   └── ai/
    │       ├── analyze.ts
    │       └── post-reply.ts
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── auth/
    │   │   ├── layout.tsx
    │   │   ├── login/page.tsx
    │   │   └── signup/page.tsx
    │   ├── dashboard/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── loading.tsx
    │   │   ├── error.tsx
    │   │   ├── reviews/
    │   │   │   ├── page.tsx
    │   │   │   ├── loading.tsx
    │   │   │   └── error.tsx
    │   │   ├── branches/
    │   │   │   ├── page.tsx
    │   │   │   ├── loading.tsx
    │   │   │   └── error.tsx
    │   │   ├── insights/
    │   │   │   ├── page.tsx
    │   │   │   ├── loading.tsx
    │   │   │   └── error.tsx
    │   │   ├── alerts/
    │   │   │   ├── page.tsx
    │   │   │   ├── loading.tsx
    │   │   │   └── error.tsx
    │   │   ├── team/
    │   │   │   ├── page.tsx
    │   │   │   ├── loading.tsx
    │   │   │   └── error.tsx
    │   │   ├── settings/
    │   │   │   ├── page.tsx
    │   │   │   ├── loading.tsx
    │   │   │   └── error.tsx
    │   │   └── billing/
    │   │       ├── page.tsx
    │   │       ├── loading.tsx
    │   │       └── error.tsx
    │   └── api/
    │       ├── auth/
    │       │   ├── setup/route.ts
    │       │   └── google/
    │       │       ├── route.ts
    │       │       └── callback/route.ts
    │       ├── reviews/
    │       │   └── reply/route.ts
    │       ├── reports/
    │       │   ├── export-csv/route.ts
    │       │   └── export-pdf/route.ts
    │       └── webhooks/
    │           └── stripe/route.ts
    ├── actions/
    │   ├── business.ts
    │   ├── reviews.ts
    │   ├── branches.ts
    │   ├── team.ts
    │   ├── settings.ts
    │   └── alerts.ts
    └── components/
        ├── ui/
        │   ├── button.tsx
        │   ├── input.tsx
        │   ├── label.tsx
        │   ├── select.tsx
        │   ├── dialog.tsx
        │   ├── sheet.tsx
        │   ├── badge.tsx
        │   ├── card.tsx
        │   ├── table.tsx
        │   ├── tabs.tsx
        │   ├── switch.tsx
        │   ├── avatar.tsx
        │   ├── dropdown-menu.tsx
        │   ├── toast.tsx
        │   ├── toaster.tsx
        │   ├── use-toast.ts
        │   ├── skeleton.tsx
        │   ├── separator.tsx
        │   ├── tooltip.tsx
        │   └── scroll-area.tsx
        ├── dashboard/
        │   ├── sidebar.tsx
        │   ├── header.tsx
        │   ├── stats-card.tsx
        │   ├── rating-badge.tsx
        │   ├── sentiment-badge.tsx
        │   ├── reply-modal.tsx
        │   ├── review-table.tsx
        │   ├── branch-table.tsx
        │   └── charts/
        │       ├── rating-bar-chart.tsx
        │       ├── monthly-line-chart.tsx
        │       └── branch-radar-chart.tsx
        └── shared/
            ├── page-header.tsx
            ├── empty-state.tsx
            ├── error-card.tsx
            └── loading-skeleton.tsx
```

---

## Build Order & Dependencies

```
Phase 1 (Architecture)       → no dependencies
Phase 2 (DB + RLS)           → requires Phase 1
Phase 3 (Auth + Roles)       → requires Phase 2
Phase 4 (Google OAuth)       → requires Phase 3
Phase 5 (Review Sync)        → requires Phase 4
Phase 6 (AI Layer)           → requires Phase 5
Phase 7 (Dashboard UI)       → requires Phase 3 (auth), Phase 2 (DB)
Phase 8 (Perf Audit)         → requires Phase 7
Phase 9 (Security Audit)     → requires all phases
```

---

## Current Build Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 – Core Architecture | 🟡 In Progress | package.json, configs, clients created |
| Phase 2 – Database & RLS | 🟡 In Progress | SQL migration created, needs deployment |
| Phase 3 – Auth & Roles | 🟡 In Progress | Login/Signup pages created, setup API route pending |
| Phase 4 – Google OAuth | ⬜ Not Started | |
| Phase 5 – Review Sync | ⬜ Not Started | |
| Phase 6 – AI Layer | ⬜ Not Started | |
| Phase 7 – Dashboard UI | 🟡 In Progress | Layout + sidebar created, pages pending |
| Phase 8 – Perf Audit | ⬜ Not Started | |
| Phase 9 – Security Audit | ⬜ Not Started | |

---

## Next Immediate Steps

1. Complete Phase 1: create postcss.config.js, all shadcn/ui components
2. Create `POST /api/auth/setup` route (business creation on signup)
3. Build all 8 dashboard pages with real data
4. Build Google OAuth routes (Phase 4)
5. Build AI analysis lib (Phase 6)
6. Build Supabase Edge Function for review sync (Phase 5)
7. Build server actions (Phase 3 + 7)
8. Build report export routes (Phase 7)
9. Run `npm install` and validate compile
10. Deploy schema to Supabase (`db.gjlmkwdsqasevvzptrhq.supabase.co`)
