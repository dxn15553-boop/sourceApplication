CREATE TYPE "public"."role" AS ENUM('user', 'hod', 'final_head', 'procurement_manager', 'section_manager', 'employee', 'admin');--> statement-breakpoint
CREATE TYPE "public"."workflow_action" AS ENUM('submitted', 'approved', 'rejected', 'returned', 'resubmitted', 'assigned', 'processing_started', 'completed');--> statement-breakpoint
CREATE TYPE "public"."workflow_status" AS ENUM('Submitted', 'HOD Approved', 'HOD Rejected', 'HOD Returned', 'Final Head Approved', 'Final Head Rejected', 'Final Head Returned', 'Procurement Approved', 'Procurement Rejected', 'Procurement Returned', 'Assigned', 'Completed', 'Cancelled');--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"department_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "request_counter" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"requester_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"description" text NOT NULL,
	"attachment_path" text,
	"attachment_name" text,
	"status" "workflow_status" DEFAULT 'Submitted' NOT NULL,
	"current_assignee_role" "role",
	"assigned_employee_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" "workflow_action" NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_requests" ADD CONSTRAINT "source_requests_requester_id_profiles_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_requests" ADD CONSTRAINT "source_requests_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_requests" ADD CONSTRAINT "source_requests_assigned_employee_id_profiles_id_fk" FOREIGN KEY ("assigned_employee_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_actions" ADD CONSTRAINT "workflow_actions_request_id_source_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."source_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_actions" ADD CONSTRAINT "workflow_actions_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;