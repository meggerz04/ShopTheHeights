Here's my implementation plan for OpenShop. Please scaffold the full project from scratch following it exactly — start with Phase 1A (project setup, dependencies, folder structure, DB migrations) and work through each phase in order.

# OpenShop — Implementation Plan

## Overview

OpenShop assists small and medium businesses (SMBs) through the process of being approved to operate in a municipality — covering zoning, permitting, licensing, and ongoing city requirements. A RAG system backed by municipal regulatory PDFs powers both an AI chat assistant and jurisdiction-specific workflow generation. The database is designed multi-tenant from day one so a municipality-facing portal can be added in Phase 2 without schema changes.

**MVP target**: Jersey City, NJ

### Application Architecture

This repository is the **SMB-facing application** only. The municipality-facing portal will be a **separate Next.js application** that shares the same Supabase database.

**URL structure for this app (hosted at `getopenshop.com`):**

| Path | Purpose |
|------|---------|
| `/` | Marketing homepage — sells SMBs on signing up |
| `/login`, `/register`, `/callback` | Authentication (root level, linked from homepage) |
| `/app/*` | All authenticated SMB functionality |
| `/admin/*` | Internal admin tool (document uploads, workflow templates, business monitor) — service-role protected, team-only |

The `/app/` prefix cleanly separates the marketing site from the product. All post-login SMB routes live under `/app/`.

---

## Tech Stack

| Component              | Technology                                                      | Notes                                                     |
| ---------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| Frontend & Backend API | Next.js 15 App Router (TypeScript)                              | Hosted on Vercel                                          |
| AI Chat                | Vercel AI SDK 4 (`useChat`, streaming) + Claude 3.5 Sonnet      | `maxDuration: 30` on route handlers                       |
| Workflow Generation    | Vercel AI SDK `generateObject` + Zod schema + Claude 3.5 Sonnet | Non-streaming structured output                           |
| Embeddings             | Voyage AI `voyage-3.5` (1024 dims)                              | `input_type: query` for search, `document` for ingestion  |
| Database + Vectors     | Supabase PostgreSQL + pgvector                                  | Single platform for all data + vector search              |
| Background Jobs        | Inngest v3                                                      | Durable step-based PDF processing; avoids Vercel timeouts |
| Flowchart UI           | React Flow (`@xyflow/react`) + `@dagrejs/dagre`                 | Auto-layout from DAG structure; no stored positions       |
| Auth                   | Supabase Auth                                                   | Magic link + Google OAuth                                 |
| Payments               | Stripe                                                          | Free tier (5 msgs/month) → Premium (~$25/mo)              |
| PDF Parsing            | `pdf-parse`                                                     | Runs inside Inngest job                                   |
| UI Components          | Tailwind CSS + shadcn/ui                                        |                                                           |

---

## UI Styling & Design Tokens (Strict Enforcement)

To avoid a generic or academic aesthetic, all frontend code generated for both the List View and Flowchart View must strictly adhere to the following design system:

### 1. Typography & Global Accents
* Font Family: Use `Geist Sans` or `Inter` via Tailwind. For metadata, counts, dates, and node IDs, use tabular numbers (`font-mono` or `font-variant-numeric: tabular-nums`).
* Border Radii: Enforce a uniform, modern corner rounding using `rounded-xl` (12px) for main dashboard cards, custom React Flow nodes, and side panels; use `rounded-md` for buttons and badges. 
* Backgrounds: Avoid solid raw white `#FFFFFF` for page backdrops. Use a light neutral foundation (`bg-slate-50/50` or `bg-zinc-50/50`) to let white component cards pop with natural contrast.

### 2. High-Fidelity Flowchart Canvas (React Flow)
* Background: Implement `<Background variant="lines" gap={24} size={1} />` with a highly muted color line (`#e2e8f0` in light mode) to mimic engineering grid paper.
* Connection Edges: BANNED: Sharp, right-angle, or harsh default edge lines. Use `BezierEdge` or a custom smooth-step edge with a subtle corner radius (`borderRadius={16}`). Set edge lines to a thin `strokeWidth: 1.5` using a clean slate color (`stroke: #94a3b8`).
* Node Layout Strategy: Every React Flow custom node must be structured as an independent shadcn/ui Card (`bg-white shadow-sm border border-slate-200/80 p-4`). Do not overlay loud solid background colors on nodes.

### 3. Visual Task States (List & Flowchart Node Synergy)
Apply these strict visual indicators based on task status across both views:
* NOT STARTED: Flat slate border (`border-slate-200`), neutral gray badge text, and a crisp minimalist category icon.
* IN PROGRESS: Accent border (`border-blue-500/80`), a subtle glowing blue status pip, and vibrant text for the active sub-step.
* COMPLETED: Soft emerald border (`border-emerald-500/80`), light green background tint, and a solid emerald checkbox icon.
* BLOCKED: Crimson alert border (`border-red-500`), red warning badge, and high-visibility alert text.
* LOCKED (Unmet Dependencies): Muted opacity (`opacity-60`), a thin dashed border (`border-dashed border-slate-300`), status toggles explicitly disabled, and a small lock icon rendered in the upper corner.

---

## Data Model

### Reference Tables

```
municipalities
  id            UUID PK
  name          TEXT
  state         TEXT
  county        TEXT
  created_at    TIMESTAMPTZ

business_types
  id            UUID PK
  name          TEXT         -- "Restaurant", "Retail Store", "Service Business", etc.
  description   TEXT
  created_at    TIMESTAMPTZ
```

### Users & Businesses

```
users (extends Supabase auth.users)
  id              UUID PK (references auth.users.id)
  role            ENUM (smb_owner | admin | municipality_staff)
  municipality_id UUID FK → municipalities
  full_name       TEXT
  phone           TEXT     -- OPTIONAL
  created_at      TIMESTAMPTZ

businesses
  id               UUID PK
  owner_id         UUID FK → users
  municipality_id  UUID FK → municipalities
  business_type_id UUID FK → business_types
  name             TEXT    -- Accommodates "I don't have one yet"
  address          TEXT
  zip_code         TEXT    -- Added from [Expected] Location
  neighborhood     TEXT    -- Added from [Expected] Location (optional)
  current_stage    ENUM ('Exploring', 'Planning', 'Launching', 'Operating', 'Growing') -- Business Intent
  primary_goal     TEXT    -- Business Intent / Primary Goal combo
  work_start_date  DATE    -- Timeline Anchors: Date first started working
  target_open_date DATE    -- Timeline Anchors: Target opening date
  status           ENUM (onboarding | in_progress | approved | operating)
  characteristics  JSONB
    -- Holds structural traits AND new wizard traits:
    -- { 
    --   serves_alcohol: true, 
    --   storefront_status: "Still looking" | "Lease signed" | etc,
    --   completed_milestones: ["Business registered", "Lease signed"],
    --   discovery_source: "Instagram / Google Search"
    -- }
  created_at      TIMESTAMPTZ
```

### Workflow System

```
workflow_templates
  id               UUID PK
  municipality_id  UUID FK → municipalities  (nullable = applies to all municipalities)
  business_type_id UUID FK → business_types  (nullable = applies to all business types)
  name             TEXT
  description      TEXT
  is_published     BOOLEAN  (false = DRAFT, only admin can see; true = used for new businesses)
  created_by       UUID FK → users
  created_at       TIMESTAMPTZ
  updated_at       TIMESTAMPTZ

workflow_steps
  id                    UUID PK
  template_id           UUID FK → workflow_templates
  step_number           INT
  title                 TEXT
  description           TEXT
  category              ENUM  (zoning | permit | registration | inspection | license | ongoing)
  estimated_duration_days INT
  required_documents    JSONB   -- list of expected document names for this step
  is_required           BOOLEAN
  depends_on_step_ids   UUID[]  -- DAG edges; same-level only in Phase 1
  parent_step_id        UUID FK → workflow_steps (nullable; self-referential for sub-steps)
  created_at            TIMESTAMPTZ

business_workflows
  id               UUID PK
  business_id      UUID FK → businesses
  template_id      UUID FK → workflow_templates  (nullable if fully LLM-generated)
  generated_by_llm BOOLEAN
  llm_reasoning    TEXT   -- why the LLM chose this structure
  status           ENUM   (active | completed | paused)
  created_at       TIMESTAMPTZ

business_tasks
  id                  UUID PK
  workflow_id         UUID FK → business_workflows
  step_id             UUID FK → workflow_steps  (nullable if LLM-generated without template)
  business_id         UUID FK → businesses      (denormalized for query convenience)
  municipality_id     UUID FK → municipalities  (denormalized for audit queries)
  title               TEXT
  description         TEXT
  category            ENUM  (zoning | permit | registration | inspection | license | ongoing)
  status              ENUM  (not_started | in_progress | completed | blocked)
  step_order          INT
  due_date            DATE
  completed_at        TIMESTAMPTZ
  notes               TEXT
  depends_on_task_ids UUID[]  -- DAG edges; Phase 1: same-level only
  parent_task_id      UUID FK → business_tasks (nullable; self-referential for sub-tasks)
  created_at          TIMESTAMPTZ
  updated_at          TIMESTAMPTZ

task_attachments
  id            UUID PK
  task_id       UUID FK → business_tasks
  storage_path  TEXT   -- "task-attachments/{business_id}/{task_id}/{filename}"
  file_name     TEXT
  file_size     INT
  uploaded_by   UUID FK → users
  created_at    TIMESTAMPTZ
```

### Audit Trail

```
task_timeline_events
  id             UUID PK
  task_id        UUID FK → business_tasks
  business_id    UUID FK → businesses    (denormalized)
  municipality_id UUID FK → municipalities (denormalized — feeds Phase 2 portal stats)
  event_type     ENUM  (status_change | note_added | attachment_added)
  old_status     TEXT
  new_status     TEXT
  notes          TEXT
  triggered_by   UUID FK → users
  created_at     TIMESTAMPTZ
```

> **Note**: `municipality_id` is denormalized onto `task_timeline_events` intentionally. The Phase 2 municipality portal will query this table heavily for dashboards and statistics. Having the foreign key here avoids expensive joins across large event tables.

### RAG System

```
documents
  id               UUID PK
  municipality_id  UUID FK → municipalities  (nullable = universal/applies to all)
  business_type_id UUID FK → business_types  (nullable = applies to all types)
  title            TEXT
  description      TEXT
  source_url       TEXT    -- original government source URL
  storage_path     TEXT    -- "documents/{municipality_id}/{document_id}/{filename}"
  category         ENUM    (zoning | permit | registration | tax | license | general)
  uploaded_by      UUID FK → users
  status           ENUM    (processing | ready | error)
  metadata         JSONB
  created_at       TIMESTAMPTZ

document_chunks
  id               BIGSERIAL PK
  document_id      UUID FK → documents
  municipality_id  UUID FK → municipalities  (denormalized for fast query-time filtering)
  business_type_id UUID FK → business_types  (denormalized; metadata only in Phase 1)
  content          TEXT
  embedding        VECTOR(1024)   -- Voyage voyage-3.5 output
  metadata         JSONB
    -- { chunk_index: 3, page_number: 7, source_title: "Jersey City Zoning Ordinance" }
  created_at       TIMESTAMPTZ
```

**RAG Filtering Strategy:**

- **Phase 1**: Hard filter on `municipality_id` only. With ~30 docs per municipality, semantic similarity within that scope naturally surfaces the right results.
- `business_type_id` on chunks is stored as metadata for Phase 2 boosting but is NOT a hard filter in Phase 1.
- Business `characteristics` are injected into the LLM system prompt as context. They are NOT used as vector filters.
- **Phase 2+**: Add `business_type_id` as a soft/boost filter when per-municipality doc libraries grow large.

### Chat

```
chat_sessions
  id              UUID PK
  business_id     UUID FK → businesses
  user_id         UUID FK → users
  municipality_id UUID FK → municipalities  (denormalized)
  title           TEXT   -- auto-generated from first message
  created_at      TIMESTAMPTZ
  last_message_at TIMESTAMPTZ

chat_messages
  id         UUID PK
  session_id UUID FK → chat_sessions
  role       ENUM   (user | assistant | system)
  content    TEXT
  citations  JSONB
    -- [{ document_id, chunk_id, title, excerpt, page_number }]
  created_at TIMESTAMPTZ
```

### Billing _(schema designed now, implementation deferred to Phase 1.5)_

```
subscriptions
  id                       UUID PK
  user_id                  UUID FK → users
  stripe_customer_id       TEXT
  stripe_subscription_id   TEXT
  plan                     ENUM  (free | premium)
  status                   ENUM  (active | canceled | past_due)
  messages_used_this_month INT   (reset monthly via Stripe webhook)
  current_period_start     TIMESTAMPTZ
  current_period_end       TIMESTAMPTZ
  created_at               TIMESTAMPTZ
  updated_at               TIMESTAMPTZ

municipality_licenses  (Phase 2 — table designed now, built later)
  id                      UUID PK
  municipality_id         UUID FK → municipalities
  stripe_subscription_id  TEXT
  plan                    TEXT
  status                  ENUM  (trial | active | canceled)
  trial_ends_at           TIMESTAMPTZ
  created_at              TIMESTAMPTZ
```

> These tables are included in the Phase 1A schema migration so the structure is in place, but no Stripe API integration is wired up until Phase 1.5. All users have unrestricted access during beta.

---

## Workflow System Design

### Hierarchical DAG

The workflow is a **hierarchical directed acyclic graph**:

- **Parallel steps**: no dependency between them; drawn side-by-side in flowchart
- **Sequential steps**: directed edges (`depends_on_task_ids`) from prerequisite to dependent
- **Sub-steps**: `parent_task_id` creates a tree hierarchy; parent steps are containers for child steps
- **Multiple prerequisites**: a step can depend on more than one previous step (multiple incoming edges)

**Example — "Open a Restaurant in Jersey City":**

```
1. Business Formation          [top-level, no deps]          ← parallel with step 2
   ├── 1a. Register LLC        [sub-step]                    ← parallel with 1b
   └── 1b. Get EIN             [sub-step]

2. Zoning & Location           [top-level, no deps]          ← parallel with step 1
   └── 2a. Zoning Approval     [sub-step]

3. Permitting                  [top-level, depends on 1 AND 2]
   ├── 3a. Health Permit        [sub-step]                   ← parallel with 3b
   ├── 3b. Fire Inspection      [sub-step]
   └── 3c. Certificate of Occ  [sub-step, depends on 3a AND 3b]

4. Final Registration           [top-level, depends on 3]
```

### Status Rules

- **Users only set status on leaf nodes** (tasks with no children). Parent status is always derived.
- A **Postgres trigger** fires on every `business_tasks` UPDATE and rolls up the parent's status:

| Children state                                           | Parent becomes |
| -------------------------------------------------------- | -------------- |
| All `not_started`                                        | `not_started`  |
| Any `blocked`                                            | `blocked`      |
| Any `in_progress`, or mix of `completed` + `not_started` | `in_progress`  |
| All `completed`                                          | `completed`    |

- The trigger **cascades upward** — grandchild changes → child rollup → parent rollup.
- The same trigger inserts a row into `task_timeline_events` on every status change.

### Task Locking

Steps with unmet dependencies are **locked** — their status toggle is disabled in the UI. This is computed on read by checking whether all `depends_on_task_ids` have `status = completed`. No extra stored field needed.

### Phase 1 Dependency Scope

Dependencies in Phase 1 are restricted to **same-level only** (sibling-to-sibling, or top-level-to-top-level). Cross-group sub-step dependencies (e.g., sub-step 3b depending on sub-step 2a) are supported by the DB schema but deferred to Phase 2 due to rendering and LLM prompt complexity.

---

## Workflow Generation

### Flow

```
Business completes onboarding wizard
        ↓
Does a published workflow_template exist for (municipality_id + business_type_id)?
   ├── YES → Instantiate template → create business_workflow + business_tasks
   └── NO  → LLM generates workflow:
                - Fetch top-K RAG chunks filtered by municipality_id
                - Call generateObject with Zod schema + municipality + business_type + characteristics
                - Claude returns hierarchical JSON tree with temp IDs
                - Server resolves temp IDs → real UUIDs
                - Insert business_workflow + business_tasks
                - Save as DRAFT workflow_template for admin review
                        ↓
              Admin reviews DRAFT in template editor
                        ↓
              Admin publishes → reused for all future businesses of this type + municipality
```

### LLM Structured Output Schema (Zod)

```typescript
const WorkflowStepSchema = z.object({
  temp_id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum([
    'zoning',
    'permit',
    'registration',
    'inspection',
    'license',
    'ongoing',
  ]),
  estimated_duration_days: z.number().optional(),
  depends_on: z.array(z.string()), // array of temp_ids at the same level
  children: z.array(z.lazy(() => WorkflowStepSchema)).optional(),
});

const WorkflowSchema = z.object({
  steps: z.array(WorkflowStepSchema),
  reasoning: z.string(), // stored as llm_reasoning
});
```

### LLM Prompt Requirements

- Always includes: municipality name, business type, full `characteristics` object
- RAG context is municipality-filtered (never generic national docs)
- System prompt explicitly instructs Claude to reflect the actual local permitting process — not a generic national template
- Instructs Claude to express dependencies based on the real-world ordering enforced by that jurisdiction

### Admin Template Editor

- Create/edit templates scoped per municipality + business_type
- **Fork** an existing template as a starting point (e.g., copy "Jersey City Restaurant" → "Newark Restaurant")
- Published templates are reused by all future matching businesses; LLM generation only runs for new municipality + business_type combos with no published template

---

## Views: List and Flowchart

Both views operate on the same `business_tasks` data. A toggle in the UI switches between them.

### List View

- Collapsible hierarchy: parent rows with indented child rows
- Each row: status badge, due date picker, inline notes field, file attachment section
- Parent rows show progress indicator (e.g., "2 of 4 sub-steps complete")
- Locked steps (unmet dependencies) render with disabled controls and a lock icon

### Flowchart View

- Built with **React Flow** (`@xyflow/react`)
- Layout auto-calculated with **`@dagrejs/dagre`** — no stored x/y positions
- Parent steps = **group nodes** (expandable containers)
- Sub-steps = nodes inside their parent group node
- Dependency edges = arrows between nodes
- Node color by status: gray (not_started), blue (in_progress), green (completed), red (blocked), muted (locked)
- Clicking a node opens a **side panel**: status toggle, notes, attachment uploader

---

## RAG Pipeline

### Document Ingestion (Inngest job)

```
Admin uploads PDF
    ↓
File saved to Supabase Storage: documents/{municipality_id}/{document_id}/{filename}
documents row inserted (status: processing)
Inngest event fired: "doc/pdf.upload"
    ↓
Inngest processPdf job:
  step 1 — download file from Supabase Storage
  step 2 — extract text with pdf-parse
  step 3 — chunk text: 500 tokens, 100-token overlap
  step 4 — batch embed with Voyage voyage-3.5 (input_type: document)
  step 5 — insert document_chunks rows (content + embedding + metadata)
  step 6 — update documents.status → "ready"
```

Each `step.run()` in Inngest is durable — if any step fails, the job retries from that step only, not from the beginning.

### Similarity Search

```
match_chunks(query_embedding vector(1024), threshold float, count int, p_municipality_id uuid)
RETURNS TABLE(id, content, similarity, metadata)
AS $$
  SELECT id, content,
         1 - (embedding <=> query_embedding) AS similarity,
         metadata
  FROM document_chunks
  WHERE municipality_id = p_municipality_id
    AND 1 - (embedding <=> query_embedding) > threshold
  ORDER BY embedding <=> query_embedding
  LIMIT count;
$$ LANGUAGE SQL;
```

- Called via `supabase.rpc('match_chunks', {...})` — PostgREST does not support `<=>` directly
- HNSW index on `document_chunks.embedding` for performance at scale

---

## App Structure

```
OpenShop/
├── app/
│   ├── page.tsx                    ← Marketing homepage (/)
│   ├── layout.tsx                  ← Root layout
│   ├── login/                      ← /login
│   ├── register/                   ← /register
│   ├── callback/                   ← /callback (Supabase OAuth)
│   ├── app/                        ← All authenticated SMB routes (/app/*)
│   │   ├── layout.tsx              ← Auth guard + app shell
│   │   ├── dashboard/              ← /app/dashboard — SMB home
│   │   └── business/
│   │       ├── setup/              ← /app/business/setup — 4-step onboarding wizard
│   │       └── [businessId]/
│   │           ├── tasks/          ← workflow list + flowchart views
│   │           ├── chat/           ← AI assistant (useChat)
│   │           └── profile/
│   ├── admin/                      ← Internal admin tool (/admin/*) — service-role only
│   │   ├── documents/              ← upload + manage regulatory PDFs
│   │   ├── workflows/              ← template CRUD + publish/draft
│   │   └── businesses/             ← monitor all businesses + progress
│   └── api/
│       ├── chat/                   ← Vercel AI SDK streaming route
│       ├── rag/search/             ← RAG retrieval endpoint
│       ├── documents/upload/       ← trigger Inngest job
│       └── webhooks/
│           ├── stripe/
│           └── inngest/
├── inngest/
│   ├── client.ts
│   └── jobs/
│       └── processPdf.ts
├── lib/
│   ├── supabase/
│   ├── voyage/
│   ├── anthropic/
│   └── stripe/
├── components/
│   ├── workflow/
│   │   ├── TaskList.tsx
│   │   ├── TaskFlowchart.tsx
│   │   └── TaskSidePanel.tsx
│   └── chat/
│       ├── ChatWindow.tsx
│       └── CitationBadge.tsx
└── supabase/
    └── migrations/
```

---

## RLS Policies

All policies use `(SELECT auth.uid())` — not `auth.uid()` — for the ~95% query plan performance gain via initPlan caching.

| Role                 | Access                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `smb_owner`          | SELECT/UPDATE own `businesses`, `business_tasks`, `chat_messages`, `task_attachments` only |
| `municipality_staff` | SELECT all rows where `municipality_id` matches their assigned municipality (Phase 2 use)  |
| `admin`              | Uses `service_role` key in server actions — bypasses RLS entirely                          |

Explicit `WHERE municipality_id = X` filters are added at the application layer even where RLS would enforce it — this helps the query planner and avoids relying solely on policy evaluation for performance.

---

## Phase 1 Implementation Steps

### Phase 1A — Foundation _(prerequisite for everything)_

1. Initialize Next.js 15 project (TypeScript, App Router, Tailwind, shadcn/ui)
2. Supabase project setup: enable pgvector extension, run full schema migrations, configure RLS policies
3. Create `match_chunks()` SQL function (see above) + HNSW index on `document_chunks.embedding`
4. Supabase Storage buckets: `documents/` and `task-attachments/` with appropriate access policies
5. Inngest account setup, dev server, webhook endpoint at `/api/webhooks/inngest`
6. Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `VOYAGE_API_KEY`
   - `INNGEST_SIGNING_KEY`
   - `INNGEST_EVENT_KEY`
   - _(Stripe keys added in Phase 1.5)_

### Phase 1B — Auth & Onboarding _(depends on 1A)_

7. **Marketing homepage** (`/`): Compelling landing page that sells SMBs on signing up — headline, value props, how-it-works section, CTA buttons linking to `/register`. No login gate. Billing copy is placeholder until Phase 1.5.
8. Supabase Auth: magic link + Google OAuth, middleware for protected routes (`/app/*`), `users` row creation on sign-up
8. Expanded Onboarding Wizard Architecture:
   * **Step 1: Account & Profile**: Full name, optional phone number (creates `users` row).
   * **Step 2: Business Core**: Business Name (default to "I don't have one yet" placeholder), select business category, current operational stage, primary target goal.
   * **Step 3: Location & Timeline**: Select municipality, zip code, optional neighborhood. Inputs for `work_start_date` and `target_open_date`. Dropdown for Storefront Status (e.g., "Still looking", "Lease signed").
   * **Step 4: Milestones & Characteristics**: Checklist of already completed tasks (Business concept finalized, Business registered, etc.) to allow the workflow engine to auto-mark initial tasks as complete. Dynamic characteristic questions (e.g., serving alcohol). Optional "How did you hear about us?" discovery input.

### Phase 1C — RAG Pipeline _(depends on 1A; parallel with 1B)_

9. Admin PDF upload UI → file saved to Supabase Storage → `documents` row inserted (status: processing) → Inngest event fired
10. Inngest `processPdf` job: download → pdf-parse → chunk (500 tokens, 100-token overlap) → batch Voyage embed (`input_type: document`) → insert `document_chunks` rows → update `documents.status` to "ready"
11. RAG search server action: Voyage embed query (`input_type: query`) → `.rpc('match_chunks', { municipality_id })` → return top-5 chunks with metadata

### Phase 1D — AI Chat _(depends on 1C)_

12. `/api/chat` route: receive messages + businessId → fetch business + characteristics → RAG search (municipality-filtered) → inject chunks + business context into system prompt → stream Claude 3.5 Sonnet via Vercel AI SDK → parse and attach citations to response
13. `useChat` frontend with citation/source badge rendering per message
14. Persist `chat_messages` (including citations JSONB) to DB after each exchange

> **Billing note**: No message cap enforced during beta. All authenticated users have unrestricted chat access. Cap logic added in Phase 1.5.

### Phase 1E — Workflow Generation & Task Management _(depends on 1B + 1C)_

16. Workflow generation server action (fires after onboarding wizard):
    - Check for published template matching (municipality_id + business_type_id)
    - If `completed_milestones` contains matching real-world items (e.g., "Business registered"), the system must automatically instantiate those generated `business_tasks` with a status of `completed` and generate a corresponding `task_timeline_events` log entry upon creation.
    - If exists: instantiate into `business_workflow` + `business_tasks`
    - If not: call `generateObject` with Zod schema + municipality-filtered RAG + business type + characteristics → resolve temp IDs to UUIDs → insert `business_workflow` + `business_tasks` → save as DRAFT template
17. **List view**: collapsible hierarchy (parent + indented children), status toggles (leaf nodes only), due date picker, inline notes, attachment uploader; locked steps visually disabled with lock icon
18. **Flowchart view**: React Flow + dagre auto-layout; group nodes for parents; dependency arrows; node color = status; click node → side panel (status, notes, attachments); shared toggle state with list view
19. Postgres trigger: on `business_tasks` UPDATE → cascade status rollup to parent → insert `task_timeline_events`
20. Admin template editor: full CRUD for `workflow_templates` + `workflow_steps`, fork-from-existing capability, draft/publish toggle

### Phase 1F — Admin Dashboard _(depends on 1C + 1E)_

21. Document library: list all documents with processing status, upload form, delete
22. Business monitor: all businesses across municipalities, workflow completion percentage, last activity
23. Template management: list all templates (draft + published), edit, publish, fork

### Phase 1G — Soft Launch _(depends on all above)_

24. Ingest Jersey City NJ regulatory documents: zoning ordinance, business license application, certificate of occupancy requirements, health department permit guide, fire inspection checklist, LLC/business registration (NJ state), tax registration
25. Seed `municipalities` table with Jersey City, NJ and `business_types` with common types (Restaurant, Retail Store, Service Business, Contractor, etc.)
26. Deploy to Vercel, configure all environment variables, register Inngest production endpoint

---

## Phase 1.5 — Billing _(after beta validation)_

> Add billing once the product is validated with real users. The schema is already in place — this phase is purely integration work.

1. Stripe account setup: products + pricing (free tier: 5 msgs/month; premium: ~$25/mo)
2. Add Stripe env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Stripe customer creation on user sign-up → populate `subscriptions.stripe_customer_id`
4. Enforce free-tier message cap in `/api/chat` route: check `messages_used_this_month < 5` before processing; return upgrade prompt if exceeded
5. Upgrade flow UI: Stripe Elements payment form, plan selection
6. Stripe webhooks at `/api/webhooks/stripe`:
   - `customer.subscription.updated` → update `subscriptions` plan + status
   - `customer.subscription.deleted` → downgrade to free
   - `invoice.payment_failed` → set status to `past_due`
7. Monthly message count reset (Stripe `invoice.paid` webhook or scheduled Inngest job)

---

## Verification Checklist

- [ ] Upload a PDF in admin → Inngest dashboard shows job succeeded → `document_chunks` rows exist with 1024-dim embeddings
- [ ] Ask a Jersey City permitting question in chat → response includes source badge citing document title + excerpt
- [ ] Create a Restaurant business with `serves_alcohol: true` → workflow includes liquor license steps that a non-alcohol restaurant would not have
- [ ] Create the same business type again → published template is reused (LLM not called)
- [ ] Complete a leaf task → parent status auto-updates; `task_timeline_events` row written with correct timestamps
- [ ] A task with unmet dependencies → status toggle is disabled in both list and flowchart views
- [ ] Document tagged to a different municipality → not returned in Jersey City business RAG search
- [ ] SMB owner cannot query another user's business tasks (RLS enforced)

---

## Phase Scope Boundaries

### Phase 1 (this plan)

- SMB onboarding, AI chat, workflow task tracking (list + flowchart), admin doc/template management
- All users have unrestricted access during beta — no billing enforced
- Geography: Jersey City, NJ

### Phase 1.5 — Billing (after beta)

- Stripe integration: free tier cap (5 msgs/month), premium subscription (~$25/mo), upgrade flow, webhooks
- Municipality SaaS billing groundwork (`municipality_licenses` table already exists)

### Phase 2 (planned, not yet designed)

- Municipality staff portal UI (read-only dashboards, business progress tracking, bottleneck analysis — DB already supports this via `task_timeline_events.municipality_id`)
- Municipality self-service document uploads
- Municipality SaaS billing (builds on Phase 1.5 Stripe setup; `municipality_licenses` table already exists)
- Cross-group sub-step dependency support in flowchart
- Business type `characteristics`-based RAG boosting (soft filter by `business_type_id`)
- Multi-municipality expansion beyond Jersey City

### Phase 3 (future)

- Anthropic prompt caching (up to 90% input token cost reduction on static system prompts)
- Semantic routing: Claude Haiku for small talk, Claude Sonnet for deep document analysis
- Dedicated vector DB (Pinecone) if document library grows to thousands of documents across many cities

---

## Open Items

_None — all decisions resolved._

---

## Design Notes

### Single vs. Multiple Businesses Per User

No schema decision required. The data model already supports multiple businesses per user (`businesses.owner_id` has no unique constraint, `business/[businessId]` URL structure handles any count, and `subscriptions` is per `user_id` covering all businesses under that account).

The dashboard routing handles both cases with a single query:

```
Load businesses WHERE owner_id = current_user
  count = 1  →  redirect straight to that business's dashboard
  count > 1  →  show business picker/list
```

Adding "Register another business" later requires zero schema changes — just a UI button and ensuring the dashboard picker renders when count > 1.
