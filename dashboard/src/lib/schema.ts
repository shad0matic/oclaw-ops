import { pgTable, pgSchema, index, check, bigserial, text, vector, smallint, timestamp, unique, date, serial, foreignKey, jsonb, integer, numeric, bigint, boolean, real, uniqueIndex, varchar, uuid, AnyPgColumn } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const memory = pgSchema("memory");
export const ops = pgSchema("ops");


export const memoriesInMemory = memory.table("memories", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	content: text().notNull(),
	embedding: vector({ dimensions: 1536 }),
	tags: text().array().default([""]),
	importance: smallint().default(5),
	sourceFile: text("source_file"),
	agentId: text("agent_id").default('main'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_memories_agent").using("btree", table.agentId.asc().nullsLast().op("text_ops")),
	index("idx_memories_created").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_memories_tags").using("gin", table.tags.asc().nullsLast().op("array_ops")),
	index("memories_embedding_idx").using("ivfflat", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({lists: "20"}),
	check("memories_importance_check", sql`(importance >= 1) AND (importance <= 10)`),
]);

export const dailyNotesInMemory = memory.table("daily_notes", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	noteDate: date("note_date").notNull(),
	content: text().notNull(),
	embedding: vector({ dimensions: 1536 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("daily_notes_embedding_idx").using("ivfflat", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({lists: "10"}),
	unique("daily_notes_note_date_key").on(table.noteDate),
]);

export const performanceReviewsInMemory = memory.table("performance_reviews", {
	id: serial().primaryKey().notNull(),
	agentId: text("agent_id").notNull(),
	reviewer: text().default('kevin'),
	outputSummary: text("output_summary"),
	rating: smallint(),
	levelBefore: smallint("level_before"),
	levelAfter: smallint("level_after"),
	feedback: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	check("performance_reviews_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
]);

export const agentEventsInOps = ops.table("agent_events", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	agentId: text("agent_id").notNull(),
	eventType: text("event_type").notNull(),
	detail: jsonb().default({}),
	sessionKey: text("session_key"),
	tokensUsed: integer("tokens_used"),
	costUsd: numeric("cost_usd", { precision: 10, scale:  6 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contextId: bigint("context_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	taskId: bigint("task_id", { mode: "number" }),
}, (table) => [
	index("idx_agent_events_task").using("btree", table.taskId.asc().nullsLast().op("int8_ops")).where(sql`(task_id IS NOT NULL)`),
	index("idx_events_agent").using("btree", table.agentId.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("idx_events_context").using("btree", table.contextId.asc().nullsLast().op("int8_ops")).where(sql`(context_id IS NOT NULL)`),
	index("idx_events_type").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.contextId],
			foreignColumns: [runsInOps.id],
			name: "agent_events_context_id_fkey"
		}),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [taskQueueInOps.id],
			name: "agent_events_task_id_fkey"
		}),
]);

export const agentProfilesInMemory = memory.table("agent_profiles", {
	id: serial().primaryKey().notNull(),
	agentId: text("agent_id").notNull(),
	name: text().notNull(),
	level: smallint().default(1),
	trustScore: numeric("trust_score", { precision: 3, scale:  2 }).default('0.50'),
	totalTasks: integer("total_tasks").default(0),
	successfulTasks: integer("successful_tasks").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	description: text().default(''),
}, (table) => [
	unique("agent_profiles_agent_id_key").on(table.agentId),
	check("agent_profiles_level_check", sql`(level >= 1) AND (level <= 4)`),
]);

export const workflowsInOps = ops.table("workflows", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	yamlDefinition: text("yaml_definition").notNull(),
	version: integer().default(1),
	enabled: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("workflows_name_key").on(table.name),
]);

export const runsInOps = ops.table("runs", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	workflowId: integer("workflow_id"),
	workflowName: text("workflow_name").notNull(),
	task: text(),
	status: text().default('pending'),
	triggeredBy: text("triggered_by").default('manual'),
	context: jsonb().default({}),
	result: jsonb().default({}),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	agentId: text("agent_id").default('main'),
	lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true, mode: 'string' }),
	heartbeatMsg: text("heartbeat_msg"),
	timeoutSeconds: integer("timeout_seconds").default(600),
	sessionKey: text("session_key"),
	sourceFeatureRequest: text("source_feature_request"),
	reviewIteration: integer("review_iteration").default(0),
	reviewFeedback: text("review_feedback"),
	project: text(),
	model: text(),
	zombieStatus: text("zombie_status").default('none'),
}, (table) => [
	index("idx_runs_agent_status").using("btree", table.agentId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_runs_heartbeat").using("btree", table.lastHeartbeat.asc().nullsLast().op("timestamptz_ops")).where(sql`(status = 'running'::text)`),
	index("idx_runs_project").using("btree", table.project.asc().nullsLast().op("text_ops")).where(sql`(project IS NOT NULL)`),
	index("idx_runs_status").using("btree", table.status.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("idx_runs_workflow").using("btree", table.workflowId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflowsInOps.id],
			name: "runs_workflow_id_fkey"
		}),
	check("runs_status_check", sql`status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'running'::text, 'review'::text, 'human_review'::text, 'paused'::text, 'done'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'stalled'::text])`),
	check("runs_zombie_status_check", sql`zombie_status = ANY (ARRAY['suspected'::text, 'none'::text])`),
]);

export const stepsInOps = ops.table("steps", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	runId: bigint("run_id", { mode: "number" }).notNull(),
	stepName: text("step_name").notNull(),
	stepOrder: integer("step_order").notNull(),
	agentId: text("agent_id").default('main').notNull(),
	status: text().default('pending'),
	input: jsonb().default({}),
	output: jsonb().default({}),
	error: text(),
	retries: integer().default(0),
	maxRetries: integer("max_retries").default(2),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_steps_run").using("btree", table.runId.asc().nullsLast().op("int4_ops"), table.stepOrder.asc().nullsLast().op("int4_ops")),
	index("idx_steps_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.runId],
			foreignColumns: [runsInOps.id],
			name: "steps_run_id_fkey"
		}),
	check("steps_status_check", sql`status = ANY (ARRAY['pending'::text, 'running'::text, 'done'::text, 'failed'::text, 'skipped'::text, 'waiting_approval'::text])`),
]);

export const tasksInOps = ops.table("tasks", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	taskType: text("task_type").notNull(),
	payload: jsonb().default({}).notNull(),
	status: text().default('pending'),
	priority: smallint().default(5),
	claimedBy: text("claimed_by"),
	groupKey: text("group_key"),
	visibleAt: timestamp("visible_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	runId: bigint("run_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	stepId: bigint("step_id", { mode: "number" }),
	agentId: text("agent_id"),
}, (table) => [
	index("idx_tasks_claimed").using("btree", table.claimedBy.asc().nullsLast().op("text_ops")).where(sql`(status = 'claimed'::text)`),
	index("idx_tasks_status").using("btree", table.status.asc().nullsLast().op("timestamptz_ops"), table.priority.desc().nullsFirst().op("int2_ops"), table.visibleAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.runId],
			foreignColumns: [runsInOps.id],
			name: "tasks_run_id_fkey"
		}),
	foreignKey({
			columns: [table.stepId],
			foreignColumns: [stepsInOps.id],
			name: "tasks_step_id_fkey"
		}),
	check("tasks_status_check", sql`status = ANY (ARRAY['pending'::text, 'claimed'::text, 'running'::text, 'done'::text, 'failed'::text, 'cancelled'::text])`),
]);

export const subscriptionsInOps = ops.table("subscriptions", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	provider: text(),
	monthlyPrice: numeric("monthly_price", { precision: 10, scale:  2 }).notNull(),
	currency: text().default('EUR'),
	usedInOpenclaw: boolean("used_in_openclaw").default(true),
	active: boolean().default(true),
	renewalDay: smallint("renewal_day").default(1),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("subscriptions_name_key").on(table.name),
	check("subscriptions_currency_check", sql`currency = ANY (ARRAY['EUR'::text, 'USD'::text])`),
]);

export const costSnapshotsInOps = ops.table("cost_snapshots", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	snapshotHour: timestamp("snapshot_hour", { withTimezone: true, mode: 'string' }).notNull(),
	fixedEur: numeric("fixed_eur", { precision: 10, scale:  4 }).default('0'),
	variableEur: numeric("variable_eur", { precision: 10, scale:  4 }).default('0'),
	totalEur: numeric("total_eur", { precision: 10, scale:  4 }).default('0'),
	breakdown: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_cost_snapshots_hour").using("btree", table.snapshotHour.desc().nullsFirst().op("timestamptz_ops")),
]);

export const fxRatesInOps = ops.table("fx_rates", {
	id: serial().primaryKey().notNull(),
	rateDate: date("rate_date").notNull(),
	usdToEur: numeric("usd_to_eur", { precision: 10, scale:  6 }).notNull(),
	source: text().default('ecb'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_fx_rates_date").using("btree", table.rateDate.desc().nullsFirst().op("date_ops")),
	unique("fx_rates_rate_date_key").on(table.rateDate),
]);

export const mistakesInMemory = memory.table("mistakes", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	agentId: text("agent_id").notNull(),
	description: text().notNull(),
	context: text(),
	lessonLearned: text("lesson_learned"),
	severity: smallint().default(3),
	recurrenceCount: integer("recurrence_count").default(1),
	lastOccurredAt: timestamp("last_occurred_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	resolved: boolean().default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_mistakes_agent").using("btree", table.agentId.asc().nullsLast().op("text_ops")),
	index("idx_mistakes_unresolved").using("btree", table.agentId.asc().nullsLast().op("text_ops")).where(sql`(resolved = false)`),
	check("mistakes_severity_check", sql`(severity >= 1) AND (severity <= 5)`),
]);

export const systemMetricsInOps = ops.table("system_metrics", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	ts: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	cpuPct: real("cpu_pct").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	memUsedBytes: bigint("mem_used_bytes", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	memTotalBytes: bigint("mem_total_bytes", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	diskUsedBytes: bigint("disk_used_bytes", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	diskTotalBytes: bigint("disk_total_bytes", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	dbSizeBytes: bigint("db_size_bytes", { mode: "number" }),
	dbConnections: integer("db_connections"),
}, (table) => [
	index("idx_system_metrics_ts").using("btree", table.ts.desc().nullsFirst().op("timestamptz_ops")),
]);

export const prioritiesInOps = ops.table("priorities", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	entity: text().notNull(),
	entityType: text("entity_type").default('topic').notNull(),
	priority: smallint().default(5),
	context: text(),
	reportedBy: text("reported_by").notNull(),
	confirmedBy: text("confirmed_by").array(),
	signalCount: integer("signal_count").default(1),
	lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_priorities_active").using("btree", table.priority.desc().nullsFirst().op("int4_ops"), table.signalCount.desc().nullsFirst().op("int2_ops")).where(sql`(resolved_at IS NULL)`),
	index("idx_priorities_entity_type").using("btree", table.entityType.asc().nullsLast().op("text_ops")),
	unique("priorities_entity_entity_type_key").on(table.entityType, table.entity),
	check("priorities_priority_check", sql`(priority >= 1) AND (priority <= 10)`),
]);

export const crossSignalsInOps = ops.table("cross_signals", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	priorityId: bigint("priority_id", { mode: "number" }),
	agentId: text("agent_id").notNull(),
	source: text(),
	snippet: text(),
	confidence: numeric({ precision: 3, scale:  2 }).default('0.50'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_cross_signals_agent").using("btree", table.agentId.asc().nullsLast().op("text_ops")),
	index("idx_cross_signals_priority").using("btree", table.priorityId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.priorityId],
			foreignColumns: [prioritiesInOps.id],
			name: "cross_signals_priority_id_fkey"
		}),
]);

export const reactionsInOps = ops.table("reactions", {
	id: serial().primaryKey().notNull(),
	triggerAgent: text("trigger_agent").notNull(),
	triggerEvent: text("trigger_event").notNull(),
	triggerFilter: jsonb("trigger_filter").default({}),
	responderAgent: text("responder_agent").notNull(),
	action: text().notNull(),
	actionParams: jsonb("action_params").default({}),
	probability: numeric({ precision: 3, scale:  2 }).default('1.00'),
	enabled: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_reactions_trigger").using("btree", table.triggerAgent.asc().nullsLast().op("text_ops"), table.triggerEvent.asc().nullsLast().op("text_ops")).where(sql`(enabled = true)`),
]);

export const entitiesInMemory = memory.table("entities", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	name: text().notNull(),
	entityType: text("entity_type").default('unknown').notNull(),
	aliases: text().array().default([""]),
	properties: jsonb().default({}),
	embedding: vector({ dimensions: 1536 }),
	firstSeenBy: text("first_seen_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_entities_aliases").using("gin", table.aliases.asc().nullsLast().op("array_ops")),
	index("idx_entities_embedding").using("ivfflat", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({lists: "20"}),
	index("idx_entities_type").using("btree", table.entityType.asc().nullsLast().op("text_ops")),
	unique("entities_name_entity_type_key").on(table.name, table.entityType),
]);

export const entityRelationsInMemory = memory.table("entity_relations", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sourceId: bigint("source_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	targetId: bigint("target_id", { mode: "number" }),
	relationType: text("relation_type").notNull(),
	strength: numeric({ precision: 3, scale:  2 }).default('0.50'),
	context: text(),
	agentId: text("agent_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_entity_relations_source").using("btree", table.sourceId.asc().nullsLast().op("int8_ops")),
	index("idx_entity_relations_target").using("btree", table.targetId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.sourceId],
			foreignColumns: [entitiesInMemory.id],
			name: "entity_relations_source_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.targetId],
			foreignColumns: [entitiesInMemory.id],
			name: "entity_relations_target_id_fkey"
		}).onDelete("cascade"),
	unique("entity_relations_source_id_target_id_relation_type_key").on(table.targetId, table.sourceId, table.relationType),
]);

export const compoundsInMemory = memory.table("compounds", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	periodStart: date("period_start").notNull(),
	periodEnd: date("period_end").notNull(),
	summary: text().notNull(),
	keyLearnings: text("key_learnings").array(),
	mistakes: text().array(),
	embedding: vector({ dimensions: 1536 }),
	agentId: text("agent_id").default('main'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_compounds_period").using("btree", table.periodStart.asc().nullsLast().op("date_ops"), table.periodEnd.asc().nullsLast().op("date_ops")),
]);

export const fileClaimsInOps = ops.table("file_claims", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	agentId: text("agent_id").notNull(),
	filePath: text("file_path").notNull(),
	description: text(),
	claimedAt: timestamp("claimed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	releasedAt: timestamp("released_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_file_claims_active").using("btree", table.filePath.asc().nullsLast().op("text_ops")).where(sql`(released_at IS NULL)`),
	index("idx_file_claims_agent").using("btree", table.agentId.asc().nullsLast().op("text_ops")).where(sql`(released_at IS NULL)`),
	uniqueIndex("idx_file_claims_unique_active").using("btree", table.filePath.asc().nullsLast().op("text_ops"), table.agentId.asc().nullsLast().op("text_ops")).where(sql`(released_at IS NULL)`),
]);

export const taskAssignmentsInOps = ops.table("task_assignments", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	agentId: text("agent_id").notNull(),
	repo: text().notNull(),
	branch: text().notNull(),
	worktreePath: text("worktree_path"),
	description: text().notNull(),
	fileManifest: text("file_manifest").array().default([""]).notNull(),
	status: text().default('assigned').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parentTaskId: bigint("parent_task_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	runId: bigint("run_id", { mode: "number" }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_task_assignments_active").using("btree", table.repo.asc().nullsLast().op("text_ops")).where(sql`(status = ANY (ARRAY['assigned'::text, 'in_progress'::text]))`),
	index("idx_task_assignments_agent").using("btree", table.agentId.asc().nullsLast().op("text_ops")).where(sql`(status = ANY (ARRAY['assigned'::text, 'in_progress'::text]))`),
	foreignKey({
			columns: [table.parentTaskId],
			foreignColumns: [table.id],
			name: "task_assignments_parent_task_id_fkey"
		}),
	foreignKey({
			columns: [table.runId],
			foreignColumns: [runsInOps.id],
			name: "task_assignments_run_id_fkey"
		}),
	check("task_assignments_status_check", sql`status = ANY (ARRAY['assigned'::text, 'in_progress'::text, 'review'::text, 'merging'::text, 'merged'::text, 'failed'::text, 'cancelled'::text])`),
]);

export const agentSignalsInOps = ops.table("agent_signals", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	fromAgent: text("from_agent").notNull(),
	toAgent: text("to_agent").notNull(),
	signalType: text("signal_type").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	taskId: bigint("task_id", { mode: "number" }),
	payload: jsonb().default({}),
	status: text().default('pending'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_agent_signals_task").using("btree", table.taskId.asc().nullsLast().op("int8_ops")).where(sql`(task_id IS NOT NULL)`),
	index("idx_agent_signals_to").using("btree", table.toAgent.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [runsInOps.id],
			name: "agent_signals_task_id_fkey"
		}),
	check("agent_signals_signal_type_check", sql`signal_type = ANY (ARRAY['task_handoff'::text, 'review_request'::text, 'review_feedback'::text, 'blocked'::text, 'unblocked'::text, 'war_room_summon'::text, 'info'::text, 'error_report'::text])`),
	check("agent_signals_status_check", sql`status = ANY (ARRAY['pending'::text, 'read'::text, 'acknowledged'::text])`),
]);

export const taskRunsInOps = ops.table("task_runs", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	taskId: text("task_id"),
	sessionKey: text("session_key"),
	agentId: text("agent_id").default('main').notNull(),
	tier: integer(),
	initialTier: integer("initial_tier"),
	modelUsed: text("model_used").notNull(),
	modelAlias: text("model_alias"),
	taskType: text("task_type"),
	taskDescription: text("task_description"),
	status: text().default('running'),
	inputTokens: integer("input_tokens"),
	outputTokens: integer("output_tokens"),
	totalTokens: integer("total_tokens").generatedAlwaysAs(sql`(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0))`),
	costUsd: numeric("cost_usd", { precision: 10, scale:  6 }),
	costEur: numeric("cost_eur", { precision: 10, scale:  6 }),
	estimatedTier: integer("estimated_tier"),
	estimatedTokens: integer("estimated_tokens"),
	estimatedCostUsd: numeric("estimated_cost_usd", { precision: 10, scale:  6 }),
	escalatedFrom: integer("escalated_from"),
	escalationReason: text("escalation_reason"),
	escalationHistory: jsonb("escalation_history").default([]),
	durationMs: integer("duration_ms"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_task_runs_agent").using("btree", table.agentId.asc().nullsLast().op("text_ops")),
	index("idx_task_runs_created").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_task_runs_model").using("btree", table.modelUsed.asc().nullsLast().op("text_ops")),
	index("idx_task_runs_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_task_runs_tier").using("btree", table.tier.asc().nullsLast().op("int4_ops")),
	check("task_runs_status_check", sql`status = ANY (ARRAY['running'::text, 'success'::text, 'failed'::text, 'escalated'::text, 'timeout'::text])`),
]);

export const costEstimatesInOps = ops.table("cost_estimates", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	taskRunId: bigint("task_run_id", { mode: "number" }),
	predictedInputTokens: integer("predicted_input_tokens"),
	predictedOutputTokens: integer("predicted_output_tokens"),
	predictedCostUsd: numeric("predicted_cost_usd", { precision: 10, scale:  6 }),
	actualInputTokens: integer("actual_input_tokens"),
	actualOutputTokens: integer("actual_output_tokens"),
	actualCostUsd: numeric("actual_cost_usd", { precision: 10, scale:  6 }),
	inputFeatures: jsonb("input_features"),
	predictionModelVersion: text("prediction_model_version").default('heuristic_v1'),
	accuracyPct: numeric("accuracy_pct", { precision: 5, scale:  2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_cost_estimates_task_run").using("btree", table.taskRunId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.taskRunId],
			foreignColumns: [taskRunsInOps.id],
			name: "cost_estimates_task_run_id_fkey"
		}),
]);

export const projectsInOps = ops.table("projects", {
	id: text().primaryKey().notNull(),
	label: text().notNull(),
	icon: text().default('📦').notNull(),
	description: text(),
	color: text().default('border-l-zinc-500').notNull(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    owner: text(),
    status: text().default('active'),
});

export const researchIdeasInOps = ops.table("research_ideas", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	summary: text(),
	sources: text().array(),
	nextSteps: text("next_steps").array(),
	status: varchar({ length: 20 }).default('pending'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	goalTags: text("goal_tags").array(),
});

export const liveSessionsInOps = ops.table("live_sessions", {
	id: serial().primaryKey().notNull(),
	agentId: text("agent_id").notNull(),
	sessionKey: text("session_key").notNull(),
	sessionId: text("session_id"),
	kind: text(),
	model: text(),
	totalTokens: integer("total_tokens").default(0),
	inputTokens: integer("input_tokens").default(0),
	outputTokens: integer("output_tokens").default(0),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	label: text(),
	isActive: boolean("is_active").default(false),
	polledAt: timestamp("polled_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_live_sessions_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")).where(sql`(is_active = true)`),
	index("idx_live_sessions_agent").using("btree", table.agentId.asc().nullsLast().op("text_ops")),
	unique("live_sessions_session_key_key").on(table.sessionKey),
]);

export const zombieEventsInOps = ops.table("zombie_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionKey: text("session_key").notNull(),
	agentId: text("agent_id").notNull(),
	status: text().notNull(),
	detectionHeuristic: text("detection_heuristic").notNull(),
	details: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_zombie_events_session_key").using("btree", table.sessionKey.asc().nullsLast().op("text_ops")),
	check("zombie_events_status_check", sql`status = ANY (ARRAY['suspected'::text, 'confirmed_kill'::text, 'recovered'::text])`),
]);

export const taskQueueInOps = ops.table("task_queue", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	parentId: bigint("parent_id", { mode: "number" }).references((): AnyPgColumn => taskQueueInOps.id),
	title: text().notNull(),
	description: text(),
	project: text().default('infra').notNull(),
	agentId: text("agent_id"),
	priority: smallint().default(5),
	status: text().default('queued'),
	createdBy: text("created_by").default('boss'),
	result: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	reviewCount: smallint("review_count").default(0),
	reviewerId: text("reviewer_id"),
	reviewFeedback: text("review_feedback"),
	specUrl: text("spec_url"),
	speced: boolean().default(false).notNull(),
	epic: text(),
	notes: text(),
	sessionKey: text("session_key"),
	model: text(),
	lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true, mode: 'string' }),
	heartbeatMsg: text("heartbeat_msg"),
	acked: boolean('acked').default(false).notNull(),
	chatAckedAt: timestamp("chat_acked_at", { withTimezone: true, mode: 'string' }),
	progress: jsonb().default({}),
	tags: text().array().default([]),
}, (table) => [
	index("idx_task_queue_agent").using("btree", table.agentId.asc().nullsLast().op("text_ops")).where(sql`(agent_id IS NOT NULL)`),
	index("idx_task_queue_project").using("btree", table.project.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_task_queue_status").using("btree", table.status.asc().nullsLast().op("text_ops"), table.priority.desc().nullsFirst().op("int2_ops")),
	check("task_queue_priority_check", sql`(priority >= 1) AND (priority <= 10)`),
	check("task_queue_status_check", sql`status = ANY (ARRAY['queued'::text, 'backlog'::text, 'planned'::text, 'assigned'::text, 'running'::text, 'review'::text, 'human_todo'::text, 'done'::text, 'failed'::text, 'cancelled'::text])`),
]);

export const taskEventsInOps = ops.table("task_events", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	taskId: bigint("task_id", { mode: "bigint" }).notNull().references(() => taskQueueInOps.id, { onDelete: "cascade" }),
	eventType: text("event_type").notNull(),
	fromStatus: text("from_status"),
	toStatus: text("to_status"),
	agentId: text("agent_id"),
	actor: text(),
	detail: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_task_events_task").using("btree", table.taskId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_task_events_type").using("btree", table.eventType.asc().nullsLast()),
]);

export const telegramMessagesInOps = ops.table("telegram_messages", {
	id: serial().primaryKey().notNull(),
	messageId: integer("message_id").notNull(),
	topicId: integer("topic_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	chatId: bigint("chat_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	senderId: bigint("sender_id", { mode: "number" }).notNull(),
	senderName: text("sender_name"),
	content: text().notNull(),
	ts: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	responded: boolean().default(false),
	responseAt: timestamp("response_at", { withTimezone: true, mode: 'string' }),
	isVoice: boolean("is_voice").default(false),
}, (table) => [
	index("idx_tg_msg_responded").using("btree", table.responded.asc().nullsLast().op("bool_ops")).where(sql`(NOT responded)`),
	index("idx_tg_msg_topic").using("btree", table.chatId.asc().nullsLast().op("timestamptz_ops"), table.topicId.asc().nullsLast().op("timestamptz_ops"), table.ts.desc().nullsFirst().op("int8_ops")),
	unique("telegram_messages_chat_id_message_id_key").on(table.messageId, table.chatId),
]);

export const modelCatalogueInOps = ops.table("model_catalogue", {
	id: serial().primaryKey().notNull(),
	provider: varchar("provider", { length: 50 }).notNull(),
	modelId: varchar("model_id", { length: 100 }).notNull(),
	displayName: varchar("display_name", { length: 100 }),
	contextWindow: integer("context_window"),
	inputCostPer1k: numeric("input_cost_per_1k", { precision: 10, scale: 6 }),
	outputCostPer1k: numeric("output_cost_per_1k", { precision: 10, scale: 6 }),
	capabilities: text("capabilities").array(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("model_catalogue_model_id_key").on(table.modelId),
]);

// Note: bookmarkFolders and bookmarkFolderItems removed due to Drizzle self-reference issues
// Use raw SQL via pool for these tables if needed

export const xBookmarks = ops.table("x_bookmarks", {
    id: text('id').primaryKey().notNull(),
    url: text('url').notNull(),
    text: text('text'),
    author_id: text('author_id'),
    author_name: text('author_name'),
    author_handle: text('author_handle'),
    created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }),
    media: jsonb('media'),
    summary: text('summary'),
    tags: jsonb('tags'),
    relevance_score: integer('relevance_score'),
    processed: boolean('processed').default(false),
    video_transcript: text('video_transcript'),
    video_analysis: text('video_analysis'),
});

export const kbProcessingQueue = ops.table("kb_processing_queue", {
    id: serial('id').primaryKey(),
    bookmarkId: text('bookmark_id').notNull().references(() => xBookmarks.id),
    status: text('status').default('pending'),
    priority: integer('priority').default(5),
    attempts: integer('attempts').default(0),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
});

// Agent settings table — key/value store for runtime configuration
// e.g. key='concurrency' → {"maxAgents": 6, "perModel": {"gemini": 4, "sonnet": 3, "grok": 2, "opus": 1}}
export const agentSettingsInOps = ops.table("agent_settings", {
	key: text().primaryKey().notNull(),
	value: jsonb().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});
