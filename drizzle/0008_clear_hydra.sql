CREATE TABLE IF NOT EXISTS "timer_requests" (
	"request_id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"ticket_id" integer NOT NULL,
	"request_type" varchar(50) NOT NULL,
	"requested_hours" numeric(5, 2) DEFAULT '0.00',
	"reason" text NOT NULL,
	"status" varchar(50) DEFAULT 'PendingTL',
	"comments" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "kanban_columns" jsonb;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "timer_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "timer_accumulated_seconds" integer DEFAULT 0;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "timer_requests" ADD CONSTRAINT "timer_requests_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "timer_requests" ADD CONSTRAINT "timer_requests_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "timer_requests" ADD CONSTRAINT "timer_requests_ticket_id_tickets_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("ticket_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "timer_requests_tenant_idx" ON "timer_requests" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "timer_requests_user_idx" ON "timer_requests" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "timer_requests_ticket_idx" ON "timer_requests" ("ticket_id");