-- oclaw-ops schema init (idempotent)
-- Target DB: openclaw_db (Postgres 18 + pgvector)

CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS memory;
CREATE SCHEMA IF NOT EXISTS ops;

-- MEMORY
CREATE TABLE IF NOT EXISTS memory.memories (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(1536),
    tags TEXT[] DEFAULT '{}',
    importance SMALLINT DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
    source_file TEXT,
    agent_id TEXT DEFAULT 'main',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory.daily_notes (
    id BIGSERIAL PRIMARY KEY,
    note_date DATE NOT NULL UNIQUE,
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory.agent_profiles (
    id SERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    level SMALLINT DEFAULT 1 CHECK (level BETWEEN 1 AND 4),
    trust_score NUMERIC(3,2) DEFAULT 0.50,
    total_tasks INT DEFAULT 0,
    successful_tasks INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory.performance_reviews (
    id SERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL,
    reviewer TEXT DEFAULT 'kevin',
    output_summary TEXT,
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
    level_before SMALLINT,
    level_after SMALLINT,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- OPS
CREATE TABLE IF NOT EXISTS ops.agent_events (
    id BIGSERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    detail JSONB DEFAULT '{}',
    session_key TEXT,
    tokens_used INT,
    cost_usd NUMERIC(10,6),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.tasks (
    id BIGSERIAL PRIMARY KEY,
    task_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','claimed','running','done','failed','cancelled')),
    priority SMALLINT DEFAULT 5,
    claimed_by TEXT,
    group_key TEXT,
    visible_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    run_id BIGINT,
    step_id BIGINT
);

CREATE TABLE IF NOT EXISTS ops.workflows (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    yaml_definition TEXT NOT NULL,
    version INT DEFAULT 1,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.runs (
    id BIGSERIAL PRIMARY KEY,
    workflow_id INT REFERENCES ops.workflows(id),
    workflow_name TEXT NOT NULL,
    task TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','paused','done','failed','cancelled')),
    triggered_by TEXT DEFAULT 'manual',
    context JSONB DEFAULT '{}',
    result JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.steps (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT NOT NULL REFERENCES ops.runs(id),
    step_name TEXT NOT NULL,
    step_order INT NOT NULL,
    agent_id TEXT NOT NULL DEFAULT 'main',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed','skipped','waiting_approval')),
    input JSONB DEFAULT '{}',
    output JSONB DEFAULT '{}',
    error TEXT,
    retries INT DEFAULT 0,
    max_retries INT DEFAULT 2,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes (create-if-not-exists doesn't exist for indexes; safe to run once)
-- Add them via migration tooling or manual step.
