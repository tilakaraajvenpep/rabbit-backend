CREATE TABLE IF NOT EXISTS "leaves" (
	"leave_id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"leave_date" date NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "milestone" varchar(200);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leaves" ADD CONSTRAINT "leaves_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leaves" ADD CONSTRAINT "leaves_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leaves_tenant_idx" ON "leaves" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leaves_user_idx" ON "leaves" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leaves_date_idx" ON "leaves" ("leave_date");