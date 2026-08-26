import { pgTable, text, timestamp, uuid, integer, boolean, foreignKey, pgEnum, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('role', [
  'user', 'hod', 'final_head', 'procurement_manager', 'section_manager', 'employee', 'admin', 'regional_coordinator'
]);

export const workflowStatusEnum = pgEnum('workflow_status', [
  'Submitted', 'HOD Approved', 'HOD Rejected', 'HOD Returned',
  'Under Required Review',
  'Target Dept Approved',
  'Pending Home HOD Confirmation',
  'Final Head Review',
  'Final Head Approved', 'Final Head Rejected', 'Final Head Returned',
  'Procurement Review',
  'Procurement Approved', 'Procurement Rejected', 'Procurement Returned',
  'Section Manager Assignment',
  'Assigned', 
  'Vendor Evaluation',
  'PR Created',
  'PO Created',
  'Payment Pending',
  'Delivered',
  'Completed', 'Closed', 'Cancelled',
  'Returned to Regional Head', 'Returned to HOD', 'Returned to Requester',
  'Regional Coordinator Review',
  'Returned to Regional Coordinator'
]);

export const workflowActionEnum = pgEnum('workflow_action', [
  'submitted', 'approved', 'rejected', 'returned', 'resubmitted', 'assigned', 'processing_started',
  'vendor_selected', 'pr_created', 'po_created', 'prl_completed', 'payment_done', 'delivered', 'completed', 'closed'
]);

export const reviewStatusEnum = pgEnum('review_status', ['Pending', 'Approved', 'Rejected']);
export const vendorSelectionEnum = pgEnum('vendor_selection', ['L1', 'L2', 'L3']);

// Tables
export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
});



export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  plaintext_password: text('plaintext_password'),
  full_name: text('full_name').notNull(),
  role: roleEnum('role').notNull().default('user'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const profileDepartments = pgTable('profile_departments', {
  profile_id: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  department_id: uuid('department_id').notNull().references(() => departments.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.profile_id, t.department_id] })
}));

export const sourceRequests = pgTable('source_requests', {
  id: text('id').primaryKey(), // SRC-YYYY-XXXX
  requester_id: uuid('requester_id').references(() => profiles.id).notNull(),
  requester_department_id: uuid('requester_department_id').references(() => departments.id),
  department_id: uuid('department_id').references(() => departments.id).notNull(),
  requester_name: text('requester_name'),
  requester_designation: text('requester_designation'),
  description: text('description').notNull(),
  attachment_path: text('attachment_path'),
  attachment_name: text('attachment_name'),
  status: workflowStatusEnum('status').notNull().default('Submitted'),
  current_assignee_role: roleEnum('current_assignee_role'),
  assigned_employee_id: uuid('assigned_employee_id').references(() => profiles.id),
  
  // Financial & Logistics Fields
  pr_number: text('pr_number'),
  pr_date: timestamp('pr_date'),
  po_number: text('po_number'),
  po_date: timestamp('po_date'),
  prl_completed: boolean('prl_completed').default(false),
  payment_approval_date: timestamp('payment_approval_date'),
  payment_done_date: timestamp('payment_done_date'),
  promised_delivery_date: timestamp('promised_delivery_date'),
  material_dispatch_date: timestamp('material_dispatch_date'),
  material_received_date: timestamp('material_received_date'),
  ordered_qty: integer('ordered_qty'),
  accepted_qty: integer('accepted_qty'),
  rejected_qty: integer('rejected_qty'),
  rejection_reason: text('rejection_reason'),
  work_completion_date: timestamp('work_completion_date'),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const requiredReviews = pgTable('required_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  request_id: text('request_id').notNull().references(() => sourceRequests.id, { onDelete: 'cascade' }),
  department_id: uuid('department_id').notNull().references(() => departments.id),
  status: reviewStatusEnum('status').notNull().default('Pending'),
  reviewer_id: uuid('reviewer_id').references(() => profiles.id),
  reviewed_at: timestamp('reviewed_at'),
  remarks: text('remarks'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const vendorEvaluations = pgTable('vendor_evaluations', {
  id: uuid('id').defaultRandom().primaryKey(),
  request_id: text('request_id').notNull().references(() => sourceRequests.id, { onDelete: 'cascade' }),
  l1_vendor: text('l1_vendor').notNull(),
  l1_price: integer('l1_price').notNull(),
  l2_vendor: text('l2_vendor'),
  l2_price: integer('l2_price'),
  l3_vendor: text('l3_vendor'),
  l3_price: integer('l3_price'),
  selected_vendor: vendorSelectionEnum('selected_vendor').notNull(),
  selection_reason: text('selection_reason'),
  selected_by: uuid('selected_by').notNull().references(() => profiles.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const workflowActions = pgTable('workflow_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  request_id: text('request_id').notNull().references(() => sourceRequests.id, { onDelete: 'cascade' }),
  actor_id: uuid('actor_id').references(() => profiles.id),
  action: workflowActionEnum('action').notNull(),
  comment: text('comment'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const requestCounter = pgTable('request_counter', {
  year: integer('year').primaryKey(),
  last_seq: integer('last_seq').notNull().default(0),
});

// Relations
export const departmentsRelations = relations(departments, ({ many }) => ({
  profileDepartments: many(profileDepartments),
  sourceRequests: many(sourceRequests),
  requiredReviews: many(requiredReviews),
}));



export const profilesRelations = relations(profiles, ({ many }) => ({
  profileDepartments: many(profileDepartments),
  requestsSubmitted: many(sourceRequests, { relationName: 'requester' }),
  requestsAssigned: many(sourceRequests, { relationName: 'assigned_employee' }),
  actions: many(workflowActions),
  reviewsDone: many(requiredReviews, { relationName: 'reviewer' }),
  evaluationsDone: many(vendorEvaluations, { relationName: 'evaluator' }),
}));

export const sourceRequestsRelations = relations(sourceRequests, ({ one, many }) => ({
  requester: one(profiles, {
    fields: [sourceRequests.requester_id],
    references: [profiles.id],
    relationName: 'requester',
  }),
  department: one(departments, {
    fields: [sourceRequests.department_id],
    references: [departments.id],
  }),
  assigned_employee: one(profiles, {
    fields: [sourceRequests.assigned_employee_id],
    references: [profiles.id],
    relationName: 'assigned_employee',
  }),
  workflow_actions: many(workflowActions),
  required_reviews: many(requiredReviews),
  vendor_evaluation: one(vendorEvaluations, {
    fields: [sourceRequests.id],
    references: [vendorEvaluations.request_id]
  }),
}));

export const requiredReviewsRelations = relations(requiredReviews, ({ one }) => ({
  request: one(sourceRequests, {
    fields: [requiredReviews.request_id],
    references: [sourceRequests.id],
  }),
  department: one(departments, {
    fields: [requiredReviews.department_id],
    references: [departments.id],
  }),
  reviewer: one(profiles, {
    fields: [requiredReviews.reviewer_id],
    references: [profiles.id],
    relationName: 'reviewer',
  }),
}));

export const vendorEvaluationsRelations = relations(vendorEvaluations, ({ one }) => ({
  request: one(sourceRequests, {
    fields: [vendorEvaluations.request_id],
    references: [sourceRequests.id],
  }),
  selected_by: one(profiles, {
    fields: [vendorEvaluations.selected_by],
    references: [profiles.id],
    relationName: 'evaluator',
  }),
}));

export const workflowActionsRelations = relations(workflowActions, ({ one }) => ({
  request: one(sourceRequests, {
    fields: [workflowActions.request_id],
    references: [sourceRequests.id],
  }),
  actor: one(profiles, {
    fields: [workflowActions.actor_id],
    references: [profiles.id],
  }),
}));

export const profileDepartmentsRelations = relations(profileDepartments, ({ one }) => ({
  profile: one(profiles, {
    fields: [profileDepartments.profile_id],
    references: [profiles.id],
  }),
  department: one(departments, {
    fields: [profileDepartments.department_id],
    references: [departments.id],
  }),
}));

// Trigger hot reload
