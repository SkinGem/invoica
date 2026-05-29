-- 017_swarm_events.sql
-- Public swarm-broadcast event log — step 1 of the invoica.ai swarm widget.
--
-- Purpose:
--   Capture coarse-grained, privacy-safe records of every supervisor-reviewed
--   task run. Powers the public activity feed on invoica.ai showing what the
--   Invoica swarm is currently working on (no raw task content, no PR titles,
--   no file paths, no customer identifiers).
--
-- Privacy contract (LOCKED):
--   ✓ Emit:  agent_role, task_type, task_category, verdict, score,
--            tokens, duration_s, model, provider, started_at, ended_at
--   ✗ NEVER emit: raw task title / description / context, file paths,
--                  PR titles, customer-specific identifiers
--
-- Read direction: someone reading public swarm events must learn
--   "the Invoica swarm is fixing tax-compliance bugs" — they must NOT
--   be able to learn "Invoica is fixing W-9 collection for $BANK".
--
-- Subsequent steps (NOT in this migration):
--   - Step 3: bridge to Kognai's kognai_events table
--   - Step 4: public widget surface on invoica.ai

CREATE TABLE IF NOT EXISTS swarm_events (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_week     INTEGER      NOT NULL,
  task_id         TEXT         NOT NULL,
  agent_role      TEXT         NOT NULL,
  task_type       TEXT         NOT NULL,
  task_category   TEXT,
  verdict         TEXT         NOT NULL,
  score           NUMERIC(5,2),
  tokens          INTEGER,
  duration_s      NUMERIC(8,2),
  model           TEXT,
  provider        TEXT,
  started_at      TIMESTAMPTZ  NOT NULL,
  ended_at        TIMESTAMPTZ  NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_swarm_events_created_at
  ON swarm_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_swarm_events_agent_role_created_at
  ON swarm_events (agent_role, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_swarm_events_task_category_created_at
  ON swarm_events (task_category, created_at DESC);

-- Public read enabled — feeds the public widget at invoica.ai/swarm.
-- Service role (orchestrator hook) bypasses RLS anyway, so this only affects
-- the anon client used by the website. Anon can READ; anon cannot INSERT.
ALTER TABLE swarm_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS swarm_events_public_read ON swarm_events;
CREATE POLICY swarm_events_public_read
  ON swarm_events
  FOR SELECT
  USING (true);
