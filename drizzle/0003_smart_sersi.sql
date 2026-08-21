ALTER TYPE "public"."workflow_status" ADD VALUE 'Returned to Regional Head';--> statement-breakpoint
ALTER TYPE "public"."workflow_status" ADD VALUE 'Returned to HOD';--> statement-breakpoint
ALTER TYPE "public"."workflow_status" ADD VALUE 'Returned to Requester';--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"department_id" uuid NOT NULL,
	"is_hod" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "staff_requester_id" uuid;--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "requester_name" text;--> statement-breakpoint
ALTER TABLE "workflow_actions" ADD COLUMN "staff_actor_id" uuid;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_requests" ADD CONSTRAINT "source_requests_staff_requester_id_staff_id_fk" FOREIGN KEY ("staff_requester_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_actions" ADD CONSTRAINT "workflow_actions_staff_actor_id_staff_id_fk" FOREIGN KEY ("staff_actor_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;