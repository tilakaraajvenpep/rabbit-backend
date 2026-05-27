CREATE TABLE IF NOT EXISTS "report_access_requests" (
	"request_id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"target_date" date NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"reviewed_by_user_id" integer,
	"reviewer_comments" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "allocated_hours" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "date_of_joining" varchar(100);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "project_category" varchar(255);--> statement-breakpoint
ALTER TABLE "scope_documents" ADD COLUMN IF NOT EXISTS "document_category" varchar(100) DEFAULT 'scope';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_access_requests" ADD CONSTRAINT "report_access_requests_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_access_requests" ADD CONSTRAINT "report_access_requests_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_access_requests" ADD CONSTRAINT "report_access_requests_reviewed_by_user_id_users_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rar_tenant_idx" ON "report_access_requests" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rar_user_idx" ON "report_access_requests" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rar_date_idx" ON "report_access_requests" ("target_date");