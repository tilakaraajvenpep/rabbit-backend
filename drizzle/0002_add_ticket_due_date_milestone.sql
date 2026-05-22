ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "milestone" varchar(200);
