CREATE TABLE "ops"."kb_processing_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookmark_id" text NOT NULL,
	"status" text DEFAULT 'pending',
	"priority" integer DEFAULT 5,
	"attempts" integer DEFAULT 0,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ops"."task_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"task_id" bigint NOT NULL,
	"event_type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"agent_id" text,
	"actor" text,
	"detail" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ops"."x_bookmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"text" text,
	"author_id" text,
	"author_name" text,
	"author_handle" text,
	"created_at" timestamp with time zone,
	"media" jsonb
);
--> statement-breakpoint
ALTER TABLE "ops"."task_queue" ALTER COLUMN "result" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ops"."task_queue" ALTER COLUMN "result" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "ops"."projects" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "ops"."projects" ADD COLUMN "owner" text;--> statement-breakpoint
ALTER TABLE "ops"."projects" ADD COLUMN "status" text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "ops"."task_queue" ADD COLUMN "speced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ops"."task_queue" ADD COLUMN "epic" text;--> statement-breakpoint
ALTER TABLE "ops"."task_queue" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "ops"."task_queue" ADD COLUMN "session_key" text;--> statement-breakpoint
ALTER TABLE "ops"."task_queue" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "ops"."task_queue" ADD COLUMN "last_heartbeat" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ops"."task_queue" ADD COLUMN "heartbeat_msg" text;--> statement-breakpoint
ALTER TABLE "ops"."task_queue" ADD COLUMN "acked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ops"."task_queue" ADD COLUMN "progress" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "ops"."task_queue" ADD COLUMN "tags" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "ops"."kb_processing_queue" ADD CONSTRAINT "kb_processing_queue_bookmark_id_x_bookmarks_id_fk" FOREIGN KEY ("bookmark_id") REFERENCES "ops"."x_bookmarks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."task_events" ADD CONSTRAINT "task_events_task_id_task_queue_id_fk" FOREIGN KEY ("task_id") REFERENCES "ops"."task_queue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_task_events_task" ON "ops"."task_events" USING btree ("task_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "idx_task_events_type" ON "ops"."task_events" USING btree ("event_type");