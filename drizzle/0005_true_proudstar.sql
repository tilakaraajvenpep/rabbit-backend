ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "comments" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "budget_table" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "milestones" jsonb;