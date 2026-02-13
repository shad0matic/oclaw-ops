-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SCHEMA "memory";
--> statement-breakpoint
CREATE SCHEMA "ops";
--> statement-breakpoint
CREATE TABLE "memory"."memories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"tags" text[] DEFAULT '{""}',
	"importance" smallint DEFAULT 5,
	"source_file" text,
	"agent_id" text DEFAULT 'main',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "memories_importance_check" CHECK ((importance >= 1) AND (importance <= 10))
);
--> statement-breakpoint
CREATE TABLE "memory"."daily_notes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"note_date" date NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "daily_notes_note_date_key" UNIQUE("note_date")
);
--> statement-breakpoint
CREATE TABLE "memory"."performance_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"reviewer" text DEFAULT 'kevin',
	"output_summary" text,
	"rating" smallint,
	"level_before" smallint,
	"level_after" smallint,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "performance_reviews_rating_check" CHECK ((rating >= 1) AND (rating <= 5))
);
--> statement-breakpoint
CREATE TABLE "ops"."agent_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"event_type" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb,
	"session_key" text,
	"tokens_used" integer,
	"cost_usd" numeric(10, 6),
	"created_at" timestamp with time zone DEFAULT now(),
	"context_id" bigint,
	"task_id" bigint
);
--> statement-breakpoint
CREATE TABLE "memory"."agent_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"name" text NOT NULL,
	"level" smallint DEFAULT 1,
	"trust_score" numeric(3, 2) DEFAULT '0.50',
	"total_tasks" integer DEFAULT 0,
	"successful_tasks" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"description" text DEFAULT '',
	CONSTRAINT "agent_profiles_agent_id_key" UNIQUE("agent_id"),
	CONSTRAINT "agent_profiles_level_check" CHECK ((level >= 1) AND (level <= 4))
);
--> statement-breakpoint
CREATE TABLE "ops"."workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"yaml_definition" text NOT NULL,
	"version" integer DEFAULT 1,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "workflows_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ops"."runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"workflow_id" integer,
	"workflow_name" text NOT NULL,
	"task" text,
	"status" text DEFAULT 'pending',
	"triggered_by" text DEFAULT 'manual',
	"context" jsonb DEFAULT '{}'::jsonb,
	"result" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"agent_id" text DEFAULT 'main',
	"last_heartbeat" timestamp with time zone,
	"heartbeat_msg" text,
	"timeout_seconds" integer DEFAULT 600,
	"session_key" text,
	"source_feature_request" text,
	"review_iteration" integer DEFAULT 0,
	"review_feedback" text,
	"project" text,
	"model" text,
	"zombie_status" text DEFAULT 'none',
	CONSTRAINT "runs_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'running'::text, 'review'::text, 'human_review'::text, 'paused'::text, 'done'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'stalled'::text])),
	CONSTRAINT "runs_zombie_status_check" CHECK (zombie_status = ANY (ARRAY['suspected'::text, 'none'::text]))
);
--> statement-breakpoint
CREATE TABLE "ops"."steps" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" bigint NOT NULL,
	"step_name" text NOT NULL,
	"step_order" integer NOT NULL,
	"agent_id" text DEFAULT 'main' NOT NULL,
	"status" text DEFAULT 'pending',
	"input" jsonb DEFAULT '{}'::jsonb,
	"output" jsonb DEFAULT '{}'::jsonb,
	"error" text,
	"retries" integer DEFAULT 0,
	"max_retries" integer DEFAULT 2,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "steps_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'running'::text, 'done'::text, 'failed'::text, 'skipped'::text, 'waiting_approval'::text]))
);
--> statement-breakpoint
CREATE TABLE "ops"."tasks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"task_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending',
	"priority" smallint DEFAULT 5,
	"claimed_by" text,
	"group_key" text,
	"visible_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone,
	"run_id" bigint,
	"step_id" bigint,
	"agent_id" text,
	CONSTRAINT "tasks_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'claimed'::text, 'running'::text, 'done'::text, 'failed'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "ops"."subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"provider" text,
	"monthly_price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'EUR',
	"used_in_openclaw" boolean DEFAULT true,
	"active" boolean DEFAULT true,
	"renewal_day" smallint DEFAULT 1,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "subscriptions_name_key" UNIQUE("name"),
	CONSTRAINT "subscriptions_currency_check" CHECK (currency = ANY (ARRAY['EUR'::text, 'USD'::text]))
);
--> statement-breakpoint
CREATE TABLE "ops"."cost_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"snapshot_hour" timestamp with time zone NOT NULL,
	"fixed_eur" numeric(10, 4) DEFAULT '0',
	"variable_eur" numeric(10, 4) DEFAULT '0',
	"total_eur" numeric(10, 4) DEFAULT '0',
	"breakdown" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ops"."fx_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"rate_date" date NOT NULL,
	"usd_to_eur" numeric(10, 6) NOT NULL,
	"source" text DEFAULT 'ecb',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "fx_rates_rate_date_key" UNIQUE("rate_date")
);
--> statement-breakpoint
CREATE TABLE "memory"."mistakes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"description" text NOT NULL,
	"context" text,
	"lesson_learned" text,
	"severity" smallint DEFAULT 3,
	"recurrence_count" integer DEFAULT 1,
	"last_occurred_at" timestamp with time zone DEFAULT now(),
	"resolved" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "mistakes_severity_check" CHECK ((severity >= 1) AND (severity <= 5))
);
--> statement-breakpoint
CREATE TABLE "ops"."system_metrics" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"cpu_pct" real NOT NULL,
	"mem_used_bytes" bigint NOT NULL,
	"mem_total_bytes" bigint NOT NULL,
	"disk_used_bytes" bigint,
	"disk_total_bytes" bigint,
	"db_size_bytes" bigint,
	"db_connections" integer
);
--> statement-breakpoint
CREATE TABLE "ops"."priorities" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"entity_type" text DEFAULT 'topic' NOT NULL,
	"priority" smallint DEFAULT 5,
	"context" text,
	"reported_by" text NOT NULL,
	"confirmed_by" text[],
	"signal_count" integer DEFAULT 1,
	"last_seen_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"resolved_at" timestamp with time zone,
	CONSTRAINT "priorities_entity_entity_type_key" UNIQUE("entity_type","entity"),
	CONSTRAINT "priorities_priority_check" CHECK ((priority >= 1) AND (priority <= 10))
);
--> statement-breakpoint
CREATE TABLE "ops"."cross_signals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"priority_id" bigint,
	"agent_id" text NOT NULL,
	"source" text,
	"snippet" text,
	"confidence" numeric(3, 2) DEFAULT '0.50',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ops"."reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger_agent" text NOT NULL,
	"trigger_event" text NOT NULL,
	"trigger_filter" jsonb DEFAULT '{}'::jsonb,
	"responder_agent" text NOT NULL,
	"action" text NOT NULL,
	"action_params" jsonb DEFAULT '{}'::jsonb,
	"probability" numeric(3, 2) DEFAULT '1.00',
	"enabled" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "memory"."entities" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"entity_type" text DEFAULT 'unknown' NOT NULL,
	"aliases" text[] DEFAULT '{""}',
	"properties" jsonb DEFAULT '{}'::jsonb,
	"embedding" vector(1536),
	"first_seen_by" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "entities_name_entity_type_key" UNIQUE("name","entity_type")
);
--> statement-breakpoint
CREATE TABLE "memory"."entity_relations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_id" bigint,
	"target_id" bigint,
	"relation_type" text NOT NULL,
	"strength" numeric(3, 2) DEFAULT '0.50',
	"context" text,
	"agent_id" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "entity_relations_source_id_target_id_relation_type_key" UNIQUE("target_id","source_id","relation_type")
);
--> statement-breakpoint
CREATE TABLE "memory"."compounds" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"summary" text NOT NULL,
	"key_learnings" text[],
	"mistakes" text[],
	"embedding" vector(1536),
	"agent_id" text DEFAULT 'main',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ops"."file_claims" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"file_path" text NOT NULL,
	"description" text,
	"claimed_at" timestamp with time zone DEFAULT now(),
	"released_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ops"."task_assignments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"repo" text NOT NULL,
	"branch" text NOT NULL,
	"worktree_path" text,
	"description" text NOT NULL,
	"file_manifest" text[] DEFAULT '{""}' NOT NULL,
	"status" text DEFAULT 'assigned' NOT NULL,
	"parent_task_id" bigint,
	"run_id" bigint,
	"created_at" timestamp with time zone DEFAULT now(),
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "task_assignments_status_check" CHECK (status = ANY (ARRAY['assigned'::text, 'in_progress'::text, 'review'::text, 'merging'::text, 'merged'::text, 'failed'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "ops"."agent_signals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"from_agent" text NOT NULL,
	"to_agent" text NOT NULL,
	"signal_type" text NOT NULL,
	"task_id" bigint,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now(),
	"read_at" timestamp with time zone,
	CONSTRAINT "agent_signals_signal_type_check" CHECK (signal_type = ANY (ARRAY['task_handoff'::text, 'review_request'::text, 'review_feedback'::text, 'blocked'::text, 'unblocked'::text, 'war_room_summon'::text, 'info'::text, 'error_report'::text])),
	CONSTRAINT "agent_signals_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'read'::text, 'acknowledged'::text]))
);
--> statement-breakpoint
CREATE TABLE "ops"."task_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"task_id" text,
	"session_key" text,
	"agent_id" text DEFAULT 'main' NOT NULL,
	"tier" integer,
	"initial_tier" integer,
	"model_used" text NOT NULL,
	"model_alias" text,
	"task_type" text,
	"task_description" text,
	"status" text DEFAULT 'running',
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer GENERATED ALWAYS AS ((COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0))) STORED,
	"cost_usd" numeric(10, 6),
	"cost_eur" numeric(10, 6),
	"estimated_tier" integer,
	"estimated_tokens" integer,
	"estimated_cost_usd" numeric(10, 6),
	"escalated_from" integer,
	"escalation_reason" text,
	"escalation_history" jsonb DEFAULT '[]'::jsonb,
	"duration_ms" integer,
	"started_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "task_runs_status_check" CHECK (status = ANY (ARRAY['running'::text, 'success'::text, 'failed'::text, 'escalated'::text, 'timeout'::text]))
);
--> statement-breakpoint
CREATE TABLE "ops"."cost_estimates" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"task_run_id" bigint,
	"predicted_input_tokens" integer,
	"predicted_output_tokens" integer,
	"predicted_cost_usd" numeric(10, 6),
	"actual_input_tokens" integer,
	"actual_output_tokens" integer,
	"actual_cost_usd" numeric(10, 6),
	"input_features" jsonb,
	"prediction_model_version" text DEFAULT 'heuristic_v1',
	"accuracy_pct" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ops"."projects" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"icon" text DEFAULT '📦' NOT NULL,
	"description" text,
	"color" text DEFAULT 'border-l-zinc-500' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ops"."research_ideas" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"sources" text[],
	"next_steps" text[],
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"goal_tags" text[]
);
--> statement-breakpoint
CREATE TABLE "ops"."live_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"session_key" text NOT NULL,
	"session_id" text,
	"kind" text,
	"model" text,
	"total_tokens" integer DEFAULT 0,
	"input_tokens" integer DEFAULT 0,
	"output_tokens" integer DEFAULT 0,
	"updated_at" timestamp with time zone,
	"label" text,
	"is_active" boolean DEFAULT false,
	"polled_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "live_sessions_session_key_key" UNIQUE("session_key")
);
--> statement-breakpoint
CREATE TABLE "ops"."zombie_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_key" text NOT NULL,
	"agent_id" text NOT NULL,
	"status" text NOT NULL,
	"detection_heuristic" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zombie_events_status_check" CHECK (status = ANY (ARRAY['suspected'::text, 'confirmed_kill'::text, 'recovered'::text]))
);
--> statement-breakpoint
CREATE TABLE "ops"."task_queue" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"project" text DEFAULT 'infra' NOT NULL,
	"agent_id" text,
	"priority" smallint DEFAULT 5,
	"status" text DEFAULT 'queued',
	"created_by" text DEFAULT 'boss',
	"result" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"review_count" smallint DEFAULT 0,
	"reviewer_id" text,
	"review_feedback" text,
	"spec_url" text,
	CONSTRAINT "task_queue_priority_check" CHECK ((priority >= 1) AND (priority <= 10)),
	CONSTRAINT "task_queue_status_check" CHECK (status = ANY (ARRAY['queued'::text, 'assigned'::text, 'planned'::text, 'running'::text, 'review'::text, 'human_todo'::text, 'done'::text, 'failed'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "ops"."telegram_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"topic_id" integer,
	"chat_id" bigint NOT NULL,
	"sender_id" bigint NOT NULL,
	"sender_name" text,
	"content" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"responded" boolean DEFAULT false,
	"response_at" timestamp with time zone,
	"is_voice" boolean DEFAULT false,
	CONSTRAINT "telegram_messages_chat_id_message_id_key" UNIQUE("message_id","chat_id")
);
--> statement-breakpoint
ALTER TABLE "ops"."agent_events" ADD CONSTRAINT "agent_events_context_id_fkey" FOREIGN KEY ("context_id") REFERENCES "ops"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."agent_events" ADD CONSTRAINT "agent_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "ops"."task_queue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."runs" ADD CONSTRAINT "runs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "ops"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."steps" ADD CONSTRAINT "steps_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ops"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."tasks" ADD CONSTRAINT "tasks_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ops"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."tasks" ADD CONSTRAINT "tasks_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "ops"."steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."cross_signals" ADD CONSTRAINT "cross_signals_priority_id_fkey" FOREIGN KEY ("priority_id") REFERENCES "ops"."priorities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory"."entity_relations" ADD CONSTRAINT "entity_relations_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "memory"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory"."entity_relations" ADD CONSTRAINT "entity_relations_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "memory"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."task_assignments" ADD CONSTRAINT "task_assignments_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "ops"."task_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."task_assignments" ADD CONSTRAINT "task_assignments_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ops"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."agent_signals" ADD CONSTRAINT "agent_signals_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "ops"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."cost_estimates" ADD CONSTRAINT "cost_estimates_task_run_id_fkey" FOREIGN KEY ("task_run_id") REFERENCES "ops"."task_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_memories_agent" ON "memory"."memories" USING btree ("agent_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_memories_created" ON "memory"."memories" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_memories_tags" ON "memory"."memories" USING gin ("tags" array_ops);--> statement-breakpoint
CREATE INDEX "memories_embedding_idx" ON "memory"."memories" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists=20);--> statement-breakpoint
CREATE INDEX "daily_notes_embedding_idx" ON "memory"."daily_notes" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists=10);--> statement-breakpoint
CREATE INDEX "idx_agent_events_task" ON "ops"."agent_events" USING btree ("task_id" int8_ops) WHERE (task_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_events_agent" ON "ops"."agent_events" USING btree ("agent_id" text_ops,"created_at" text_ops);--> statement-breakpoint
CREATE INDEX "idx_events_context" ON "ops"."agent_events" USING btree ("context_id" int8_ops) WHERE (context_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_events_type" ON "ops"."agent_events" USING btree ("event_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_runs_agent_status" ON "ops"."runs" USING btree ("agent_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_runs_heartbeat" ON "ops"."runs" USING btree ("last_heartbeat" timestamptz_ops) WHERE (status = 'running'::text);--> statement-breakpoint
CREATE INDEX "idx_runs_project" ON "ops"."runs" USING btree ("project" text_ops) WHERE (project IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_runs_status" ON "ops"."runs" USING btree ("status" text_ops,"created_at" text_ops);--> statement-breakpoint
CREATE INDEX "idx_runs_workflow" ON "ops"."runs" USING btree ("workflow_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_steps_run" ON "ops"."steps" USING btree ("run_id" int4_ops,"step_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_steps_status" ON "ops"."steps" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tasks_claimed" ON "ops"."tasks" USING btree ("claimed_by" text_ops) WHERE (status = 'claimed'::text);--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "ops"."tasks" USING btree ("status" timestamptz_ops,"priority" int2_ops,"visible_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_cost_snapshots_hour" ON "ops"."cost_snapshots" USING btree ("snapshot_hour" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_fx_rates_date" ON "ops"."fx_rates" USING btree ("rate_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_mistakes_agent" ON "memory"."mistakes" USING btree ("agent_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_mistakes_unresolved" ON "memory"."mistakes" USING btree ("agent_id" text_ops) WHERE (resolved = false);--> statement-breakpoint
CREATE INDEX "idx_system_metrics_ts" ON "ops"."system_metrics" USING btree ("ts" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_priorities_active" ON "ops"."priorities" USING btree ("priority" int4_ops,"signal_count" int2_ops) WHERE (resolved_at IS NULL);--> statement-breakpoint
CREATE INDEX "idx_priorities_entity_type" ON "ops"."priorities" USING btree ("entity_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_cross_signals_agent" ON "ops"."cross_signals" USING btree ("agent_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_cross_signals_priority" ON "ops"."cross_signals" USING btree ("priority_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_reactions_trigger" ON "ops"."reactions" USING btree ("trigger_agent" text_ops,"trigger_event" text_ops) WHERE (enabled = true);--> statement-breakpoint
CREATE INDEX "idx_entities_aliases" ON "memory"."entities" USING gin ("aliases" array_ops);--> statement-breakpoint
CREATE INDEX "idx_entities_embedding" ON "memory"."entities" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists=20);--> statement-breakpoint
CREATE INDEX "idx_entities_type" ON "memory"."entities" USING btree ("entity_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_entity_relations_source" ON "memory"."entity_relations" USING btree ("source_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_entity_relations_target" ON "memory"."entity_relations" USING btree ("target_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_compounds_period" ON "memory"."compounds" USING btree ("period_start" date_ops,"period_end" date_ops);--> statement-breakpoint
CREATE INDEX "idx_file_claims_active" ON "ops"."file_claims" USING btree ("file_path" text_ops) WHERE (released_at IS NULL);--> statement-breakpoint
CREATE INDEX "idx_file_claims_agent" ON "ops"."file_claims" USING btree ("agent_id" text_ops) WHERE (released_at IS NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_file_claims_unique_active" ON "ops"."file_claims" USING btree ("file_path" text_ops,"agent_id" text_ops) WHERE (released_at IS NULL);--> statement-breakpoint
CREATE INDEX "idx_task_assignments_active" ON "ops"."task_assignments" USING btree ("repo" text_ops) WHERE (status = ANY (ARRAY['assigned'::text, 'in_progress'::text]));--> statement-breakpoint
CREATE INDEX "idx_task_assignments_agent" ON "ops"."task_assignments" USING btree ("agent_id" text_ops) WHERE (status = ANY (ARRAY['assigned'::text, 'in_progress'::text]));--> statement-breakpoint
CREATE INDEX "idx_agent_signals_task" ON "ops"."agent_signals" USING btree ("task_id" int8_ops) WHERE (task_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_agent_signals_to" ON "ops"."agent_signals" USING btree ("to_agent" text_ops,"status" timestamptz_ops,"created_at" text_ops);--> statement-breakpoint
CREATE INDEX "idx_task_runs_agent" ON "ops"."task_runs" USING btree ("agent_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_task_runs_created" ON "ops"."task_runs" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_task_runs_model" ON "ops"."task_runs" USING btree ("model_used" text_ops);--> statement-breakpoint
CREATE INDEX "idx_task_runs_status" ON "ops"."task_runs" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_task_runs_tier" ON "ops"."task_runs" USING btree ("tier" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_cost_estimates_task_run" ON "ops"."cost_estimates" USING btree ("task_run_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_live_sessions_active" ON "ops"."live_sessions" USING btree ("is_active" bool_ops) WHERE (is_active = true);--> statement-breakpoint
CREATE INDEX "idx_live_sessions_agent" ON "ops"."live_sessions" USING btree ("agent_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_zombie_events_session_key" ON "ops"."zombie_events" USING btree ("session_key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_task_queue_agent" ON "ops"."task_queue" USING btree ("agent_id" text_ops) WHERE (agent_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_task_queue_project" ON "ops"."task_queue" USING btree ("project" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_task_queue_status" ON "ops"."task_queue" USING btree ("status" text_ops,"priority" int2_ops);--> statement-breakpoint
CREATE INDEX "idx_tg_msg_responded" ON "ops"."telegram_messages" USING btree ("responded" bool_ops) WHERE (NOT responded);--> statement-breakpoint
CREATE INDEX "idx_tg_msg_topic" ON "ops"."telegram_messages" USING btree ("chat_id" timestamptz_ops,"topic_id" timestamptz_ops,"ts" int8_ops);
*/