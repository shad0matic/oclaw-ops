-- Add AI categorization columns to x_bookmarks
ALTER TABLE "ops"."x_bookmarks" ADD COLUMN "ai_suggested_category_id" integer;--> statement-breakpoint
ALTER TABLE "ops"."x_bookmarks" ADD COLUMN "ai_confidence" real;--> statement-breakpoint
ALTER TABLE "ops"."x_bookmarks" ADD COLUMN "ai_reasoning" text;
