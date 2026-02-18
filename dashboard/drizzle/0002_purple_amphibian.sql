ALTER TABLE "ops"."x_bookmarks" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "ops"."x_bookmarks" ADD COLUMN "tags" jsonb;--> statement-breakpoint
ALTER TABLE "ops"."x_bookmarks" ADD COLUMN "relevance_score" integer;--> statement-breakpoint
ALTER TABLE "ops"."x_bookmarks" ADD COLUMN "processed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "ops"."x_bookmarks" ADD COLUMN "video_transcript" text;--> statement-breakpoint
ALTER TABLE "ops"."x_bookmarks" ADD COLUMN "video_analysis" text;