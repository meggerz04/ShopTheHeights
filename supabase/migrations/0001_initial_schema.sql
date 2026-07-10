-- ============================================================
-- OpenShop — Full Schema Migration (Phase 1A)
-- Run this in Supabase SQL Editor or via supabase db push
-- ============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('smb_owner', 'admin', 'municipality_staff');

CREATE TYPE business_status AS ENUM ('onboarding', 'in_progress', 'approved', 'operating');

CREATE TYPE business_stage AS ENUM ('Exploring', 'Planning', 'Launching', 'Operating', 'Growing');

CREATE TYPE workflow_status AS ENUM ('active', 'completed', 'paused');

CREATE TYPE task_status AS ENUM ('not_started', 'in_progress', 'completed', 'blocked');

CREATE TYPE task_category AS ENUM ('zoning', 'permit', 'registration', 'inspection', 'license', 'ongoing');

CREATE TYPE event_type AS ENUM ('status_change', 'note_added', 'attachment_added');

CREATE TYPE document_status AS ENUM ('processing', 'ready', 'error');

CREATE TYPE document_category AS ENUM ('zoning', 'permit', 'registration', 'tax', 'license', 'general');

CREATE TYPE chat_role AS ENUM ('user', 'assistant', 'system');

CREATE TYPE subscription_plan AS ENUM ('free', 'premium');

CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due');

CREATE TYPE license_status AS ENUM ('trial', 'active', 'canceled');

-- ============================================================
-- REFERENCE TABLES
-- ============================================================

CREATE TABLE municipalities (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  state      TEXT NOT NULL,
  county     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE business_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS (extends auth.users)
-- ============================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'smb_owner',
  municipality_id UUID REFERENCES municipalities(id),
  full_name       TEXT NOT NULL,
  phone           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BUSINESSES
-- ============================================================

CREATE TABLE businesses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  municipality_id  UUID NOT NULL REFERENCES municipalities(id),
  business_type_id UUID REFERENCES business_types(id),
  name             TEXT NOT NULL DEFAULT 'I don''t have one yet',
  address          TEXT,
  zip_code         TEXT,
  neighborhood     TEXT,
  current_stage    business_stage,
  primary_goal     TEXT,
  work_start_date  DATE,
  target_open_date DATE,
  status           business_status NOT NULL DEFAULT 'onboarding',
  characteristics  JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WORKFLOW SYSTEM
-- ============================================================

CREATE TABLE workflow_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id  UUID REFERENCES municipalities(id),
  business_type_id UUID REFERENCES business_types(id),
  name             TEXT NOT NULL,
  description      TEXT,
  is_published     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by       UUID NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_steps (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id             UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  step_number             INT NOT NULL,
  title                   TEXT NOT NULL,
  description             TEXT,
  category                task_category NOT NULL,
  estimated_duration_days INT,
  required_documents      JSONB NOT NULL DEFAULT '[]',
  is_required             BOOLEAN NOT NULL DEFAULT TRUE,
  depends_on_step_ids     UUID[] NOT NULL DEFAULT '{}',
  parent_step_id          UUID REFERENCES workflow_steps(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE business_workflows (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  template_id      UUID REFERENCES workflow_templates(id),
  generated_by_llm BOOLEAN NOT NULL DEFAULT FALSE,
  llm_reasoning    TEXT,
  status           workflow_status NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE business_tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id         UUID NOT NULL REFERENCES business_workflows(id) ON DELETE CASCADE,
  step_id             UUID REFERENCES workflow_steps(id),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  municipality_id     UUID NOT NULL REFERENCES municipalities(id),
  title               TEXT NOT NULL,
  description         TEXT,
  category            task_category NOT NULL,
  status              task_status NOT NULL DEFAULT 'not_started',
  step_order          INT NOT NULL DEFAULT 0,
  due_date            DATE,
  completed_at        TIMESTAMPTZ,
  notes               TEXT,
  depends_on_task_ids UUID[] NOT NULL DEFAULT '{}',
  parent_task_id      UUID REFERENCES business_tasks(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES business_tasks(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_size    INT,
  uploaded_by  UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT TRAIL
-- ============================================================

CREATE TABLE task_timeline_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES business_tasks(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  municipality_id UUID NOT NULL REFERENCES municipalities(id),
  event_type      event_type NOT NULL,
  old_status      TEXT,
  new_status      TEXT,
  notes           TEXT,
  triggered_by    UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RAG SYSTEM
-- ============================================================

CREATE TABLE documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id  UUID REFERENCES municipalities(id),
  business_type_id UUID REFERENCES business_types(id),
  title            TEXT NOT NULL,
  description      TEXT,
  source_url       TEXT,
  storage_path     TEXT NOT NULL,
  category         document_category NOT NULL DEFAULT 'general',
  uploaded_by      UUID NOT NULL REFERENCES users(id),
  status           document_status NOT NULL DEFAULT 'processing',
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE document_chunks (
  id               BIGSERIAL PRIMARY KEY,
  document_id      UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  municipality_id  UUID REFERENCES municipalities(id),
  business_type_id UUID REFERENCES business_types(id),
  content          TEXT NOT NULL,
  embedding        VECTOR(1024),
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast approximate nearest-neighbor search
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================
-- CHAT
-- ============================================================

CREATE TABLE chat_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  municipality_id UUID NOT NULL REFERENCES municipalities(id),
  title           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role       chat_role NOT NULL,
  content    TEXT NOT NULL,
  citations  JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BILLING (schema in place; integration deferred to Phase 1.5)
-- ============================================================

CREATE TABLE subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id       TEXT,
  stripe_subscription_id   TEXT,
  plan                     subscription_plan NOT NULL DEFAULT 'free',
  status                   subscription_status NOT NULL DEFAULT 'active',
  messages_used_this_month INT NOT NULL DEFAULT 0,
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE municipality_licenses (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id        UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  plan                   TEXT,
  status                 license_status NOT NULL DEFAULT 'trial',
  trial_ends_at          TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SIMILARITY SEARCH FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding   VECTOR(1024),
  threshold         FLOAT,
  count             INT,
  p_municipality_id UUID
)
RETURNS TABLE (
  id         BIGINT,
  content    TEXT,
  similarity FLOAT,
  metadata   JSONB
)
LANGUAGE SQL
AS $$
  SELECT
    id,
    content,
    1 - (embedding <=> query_embedding) AS similarity,
    metadata
  FROM document_chunks
  WHERE municipality_id = p_municipality_id
    AND 1 - (embedding <=> query_embedding) > threshold
  ORDER BY embedding <=> query_embedding
  LIMIT count;
$$;

-- ============================================================
-- STATUS ROLLUP TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION rollup_parent_task_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent_id     UUID;
  v_new_status    task_status;
  v_blocked_count INT;
  v_ip_count      INT;
  v_done_count    INT;
  v_ns_count      INT;
  v_total         INT;
BEGIN
  -- Only act when status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Insert timeline event for every status change
  INSERT INTO task_timeline_events (
    task_id, business_id, municipality_id, event_type,
    old_status, new_status, triggered_by
  )
  VALUES (
    NEW.id, NEW.business_id, NEW.municipality_id, 'status_change',
    OLD.status::TEXT, NEW.status::TEXT, NEW.business_id -- placeholder; real user set at app layer
  );

  -- Walk up the parent chain
  v_parent_id := NEW.parent_task_id;
  WHILE v_parent_id IS NOT NULL LOOP
    SELECT
      COUNT(*) FILTER (WHERE status = 'blocked'),
      COUNT(*) FILTER (WHERE status = 'in_progress'),
      COUNT(*) FILTER (WHERE status = 'completed'),
      COUNT(*) FILTER (WHERE status = 'not_started'),
      COUNT(*)
    INTO v_blocked_count, v_ip_count, v_done_count, v_ns_count, v_total
    FROM business_tasks
    WHERE parent_task_id = v_parent_id;

    IF v_blocked_count > 0 THEN
      v_new_status := 'blocked';
    ELSIF v_done_count = v_total THEN
      v_new_status := 'completed';
    ELSIF v_ip_count > 0 OR (v_done_count > 0 AND v_ns_count > 0) THEN
      v_new_status := 'in_progress';
    ELSE
      v_new_status := 'not_started';
    END IF;

    UPDATE business_tasks
    SET status = v_new_status, updated_at = NOW()
    WHERE id = v_parent_id AND status IS DISTINCT FROM v_new_status;

    SELECT parent_task_id INTO v_parent_id
    FROM business_tasks
    WHERE id = v_parent_id;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rollup_parent_status
AFTER UPDATE OF status ON business_tasks
FOR EACH ROW
EXECUTE FUNCTION rollup_parent_task_status();

-- updated_at auto-update
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_business_tasks_updated_at
BEFORE UPDATE ON business_tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_workflow_templates_updated_at
BEFORE UPDATE ON workflow_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_workflows   ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps       ENABLE ROW LEVEL SECURITY;

-- users: read/update own row
CREATE POLICY "users_own" ON users
  FOR ALL USING ((SELECT auth.uid()) = id);

-- businesses: smb_owner sees only their own
CREATE POLICY "businesses_owner" ON businesses
  FOR ALL USING ((SELECT auth.uid()) = owner_id);

-- business_workflows: owner of the business
CREATE POLICY "biz_workflows_owner" ON business_workflows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_workflows.business_id
        AND businesses.owner_id = (SELECT auth.uid())
    )
  );

-- business_tasks: owner of the business
CREATE POLICY "biz_tasks_owner" ON business_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_tasks.business_id
        AND businesses.owner_id = (SELECT auth.uid())
    )
  );

-- task_attachments: owner of the related task's business
CREATE POLICY "task_attachments_owner" ON task_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_tasks bt
      JOIN businesses b ON b.id = bt.business_id
      WHERE bt.id = task_attachments.task_id
        AND b.owner_id = (SELECT auth.uid())
    )
  );

-- task_timeline_events: read-only for business owner
CREATE POLICY "timeline_events_owner" ON task_timeline_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = task_timeline_events.business_id
        AND businesses.owner_id = (SELECT auth.uid())
    )
  );

-- chat_sessions: owner
CREATE POLICY "chat_sessions_owner" ON chat_sessions
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- chat_messages: via session ownership
CREATE POLICY "chat_messages_owner" ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = (SELECT auth.uid())
    )
  );

-- documents: all authenticated users can read (admin writes via service_role)
CREATE POLICY "documents_read_authenticated" ON documents
  FOR SELECT USING (auth.role() = 'authenticated');

-- document_chunks: same
CREATE POLICY "document_chunks_read_authenticated" ON document_chunks
  FOR SELECT USING (auth.role() = 'authenticated');

-- workflow_templates: published ones visible to all authenticated; drafts via service_role only
CREATE POLICY "templates_read_published" ON workflow_templates
  FOR SELECT USING (is_published = TRUE AND auth.role() = 'authenticated');

CREATE POLICY "workflow_steps_read_published" ON workflow_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflow_templates wt
      WHERE wt.id = workflow_steps.template_id AND wt.is_published = TRUE
    )
    AND auth.role() = 'authenticated'
  );

-- subscriptions: own row only
CREATE POLICY "subscriptions_own" ON subscriptions
  FOR ALL USING ((SELECT auth.uid()) = user_id);
