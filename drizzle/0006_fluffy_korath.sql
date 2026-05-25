ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "total_hours" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "buffer_hours" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "assigned_pm_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_assigned_pm_id_users_user_id_fk" FOREIGN KEY ("assigned_pm_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
