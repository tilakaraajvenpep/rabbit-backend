CREATE TABLE IF NOT EXISTS "tenants" (
	"tenant_id" serial PRIMARY KEY NOT NULL,
	"tenant_code" varchar(50) NOT NULL,
	"tenant_name" varchar(300) NOT NULL,
	"plan" varchar(50) DEFAULT 'Free',
	"is_active" boolean DEFAULT true,
	"max_users" integer DEFAULT 5,
	"max_projects" integer DEFAULT 3,
	"storage_quota_gb" numeric DEFAULT '1',
	"custom_domain" varchar(300),
	"subscription_expiry" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false,
	CONSTRAINT "tenants_tenant_code_unique" UNIQUE("tenant_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"user_id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"full_name" varchar(200) NOT NULL,
	"email" varchar(256) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false,
	CONSTRAINT "users_tenant_id_email_unique" UNIQUE("tenant_id","email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"project_id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"project_code" varchar(50) NOT NULL,
	"project_name" varchar(300) NOT NULL,
	"client" varchar(300),
	"description" text,
	"status" varchar(50) DEFAULT 'Draft',
	"created_by_user_id" integer,
	"assigned_team_lead_id" integer,
	"approved_budget" numeric(15, 2) DEFAULT '0.00',
	"approved_hours" numeric(10, 2) DEFAULT '0.00',
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scope_documents" (
	"document_id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_key" varchar(500) NOT NULL,
	"file_type" varchar(100),
	"file_size" integer,
	"version" integer DEFAULT 1,
	"status" varchar(50) DEFAULT 'Pending',
	"comments" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cost_analysis" (
	"cost_analysis_id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"total_budget" numeric(15, 2) NOT NULL,
	"total_estimated_hours" numeric(10, 2) NOT NULL,
	"estimated_completion_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cost_phases" (
	"phase_id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"cost_analysis_id" integer NOT NULL,
	"phase_name" varchar(200) NOT NULL,
	"budget_allocation" numeric(15, 2) NOT NULL,
	"estimated_hours" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tickets" (
	"ticket_id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"ticket_code" varchar(50) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'ToDo',
	"priority" varchar(50) DEFAULT 'Medium',
	"assigned_to_user_id" integer,
	"estimated_hours" numeric(10, 2) DEFAULT '0.00',
	"progress_state" varchar(50) DEFAULT 'InProgress',
	"status_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_report_items" (
	"item_id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"report_id" integer NOT NULL,
	"ticket_id" integer NOT NULL,
	"hours_spent" numeric(5, 2) NOT NULL,
	"work_done" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_reports" (
	"report_id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"report_date" date NOT NULL,
	"total_hours" numeric(5, 2) DEFAULT '8.50',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alerts" (
	"alert_id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"type" varchar(100) NOT NULL,
	"severity" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"is_acknowledged" boolean DEFAULT false,
	"acknowledged_at" timestamp,
	"pm_comment" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"log_id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" integer,
	"old_data" jsonb,
	"new_data" jsonb,
	"ip_address" varchar(50),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_user_id_users_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_assigned_team_lead_id_users_user_id_fk" FOREIGN KEY ("assigned_team_lead_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scope_documents" ADD CONSTRAINT "scope_documents_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scope_documents" ADD CONSTRAINT "scope_documents_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cost_analysis" ADD CONSTRAINT "cost_analysis_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cost_analysis" ADD CONSTRAINT "cost_analysis_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cost_phases" ADD CONSTRAINT "cost_phases_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cost_phases" ADD CONSTRAINT "cost_phases_cost_analysis_id_cost_analysis_cost_analysis_id_fk" FOREIGN KEY ("cost_analysis_id") REFERENCES "public"."cost_analysis"("cost_analysis_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_user_id_users_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_report_items" ADD CONSTRAINT "daily_report_items_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_report_items" ADD CONSTRAINT "daily_report_items_report_id_daily_reports_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("report_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_report_items" ADD CONSTRAINT "daily_report_items_ticket_id_tickets_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("ticket_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_tenant_idx" ON "users" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_tenant_idx" ON "projects" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_tenant_idx" ON "scope_documents" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_project_idx" ON "scope_documents" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cost_analysis_tenant_idx" ON "cost_analysis" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cost_analysis_project_idx" ON "cost_analysis" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cost_phases_tenant_idx" ON "cost_phases" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_tenant_idx" ON "tickets" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_project_idx" ON "tickets" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_report_items_tenant_idx" ON "daily_report_items" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_report_items_report_idx" ON "daily_report_items" ("report_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_reports_tenant_idx" ON "daily_reports" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_reports_user_idx" ON "daily_reports" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_reports_date_idx" ON "daily_reports" ("report_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_tenant_idx" ON "alerts" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_project_idx" ON "alerts" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_idx" ON "audit_logs" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" ("entity_type","entity_id");