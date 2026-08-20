ALTER TYPE "public"."workflow_status" ADD VALUE 'Final Head Review' BEFORE 'Final Head Approved';--> statement-breakpoint
ALTER TYPE "public"."workflow_status" ADD VALUE 'Procurement Review' BEFORE 'Procurement Approved';--> statement-breakpoint
ALTER TYPE "public"."workflow_status" ADD VALUE 'Section Manager Assignment' BEFORE 'Assigned';--> statement-breakpoint
CREATE TABLE "profile_departments" (
	"profile_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	CONSTRAINT "profile_departments_profile_id_department_id_pk" PRIMARY KEY("profile_id","department_id")
);
--> statement-breakpoint
INSERT INTO "profile_departments" ("profile_id", "department_id") SELECT "id", "department_id" FROM "profiles" WHERE "department_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_department_id_departments_id_fk";
--> statement-breakpoint
ALTER TABLE "profile_departments" ADD CONSTRAINT "profile_departments_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_departments" ADD CONSTRAINT "profile_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "department_id";