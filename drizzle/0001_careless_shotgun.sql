CREATE TYPE "public"."review_status" AS ENUM('Pending', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."vendor_selection" AS ENUM('L1', 'L2', 'L3');--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'vendor_selected' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'pr_created' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'po_created' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'prl_completed' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'payment_done' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'delivered' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'closed';--> statement-breakpoint
ALTER TYPE "public"."workflow_status" ADD VALUE 'Under Required Review' BEFORE 'Final Head Approved';--> statement-breakpoint
ALTER TYPE "public"."workflow_status" ADD VALUE 'Vendor Evaluation' BEFORE 'Completed';--> statement-breakpoint
ALTER TYPE "public"."workflow_status" ADD VALUE 'PR Created' BEFORE 'Completed';--> statement-breakpoint
ALTER TYPE "public"."workflow_status" ADD VALUE 'PO Created' BEFORE 'Completed';--> statement-breakpoint
ALTER TYPE "public"."workflow_status" ADD VALUE 'Payment Pending' BEFORE 'Completed';--> statement-breakpoint
ALTER TYPE "public"."workflow_status" ADD VALUE 'Delivered' BEFORE 'Completed';--> statement-breakpoint
ALTER TYPE "public"."workflow_status" ADD VALUE 'Closed' BEFORE 'Cancelled';--> statement-breakpoint
CREATE TABLE "required_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" text NOT NULL,
	"department_id" uuid NOT NULL,
	"status" "review_status" DEFAULT 'Pending' NOT NULL,
	"reviewer_id" uuid,
	"reviewed_at" timestamp,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" text NOT NULL,
	"l1_vendor" text NOT NULL,
	"l1_price" integer NOT NULL,
	"l2_vendor" text,
	"l2_price" integer,
	"l3_vendor" text,
	"l3_price" integer,
	"selected_vendor" "vendor_selection" NOT NULL,
	"selection_reason" text,
	"selected_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "pr_number" text;--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "pr_date" timestamp;--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "po_number" text;--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "po_date" timestamp;--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "prl_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "payment_approval_date" timestamp;--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "payment_done_date" timestamp;--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "promised_delivery_date" timestamp;--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "material_dispatch_date" timestamp;--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "material_received_date" timestamp;--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "ordered_qty" integer;--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "accepted_qty" integer;--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "rejected_qty" integer;--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "source_requests" ADD COLUMN "work_completion_date" timestamp;--> statement-breakpoint
ALTER TABLE "required_reviews" ADD CONSTRAINT "required_reviews_request_id_source_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."source_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "required_reviews" ADD CONSTRAINT "required_reviews_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "required_reviews" ADD CONSTRAINT "required_reviews_reviewer_id_profiles_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_evaluations" ADD CONSTRAINT "vendor_evaluations_request_id_source_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."source_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_evaluations" ADD CONSTRAINT "vendor_evaluations_selected_by_profiles_id_fk" FOREIGN KEY ("selected_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;