ALTER TABLE "users" ADD COLUMN "cost_per_hour" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "team_lead_id" integer;