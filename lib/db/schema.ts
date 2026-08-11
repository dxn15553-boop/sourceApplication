import { pgTable, text, timestamp, uuid, integer, boolean, foreignKey, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('role', [
  'user', 'hod', 'final_head', 'procurement_manager', 'section_manager', 'employee', 'admin'
]);

export const workflowStatusEnum = pgEnum('workflow_status', [
  'Submitted', 'HOD Approved', 'HOD Rejected', 'HOD Returned',
  'Final Head Approved', 'Final Head Rejected', 'Final Head Returned',
  'Procurement Approved', 'Procurement Rejected', 'Procurement Returned',
  'Assigned', 'Completed', 'Cancelled'
]);

export const workflowActionEnum = pgEnum('workflow_action', [
  'submitted', 'approved', 'rejected', 'returned', 'resubmitted', 'assigned', 'processing_started', 'completed'
]);

// Tables
export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(), // Usually mapped to Auth.js user ID, but we use our own ID for Credentials auth
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: roleEnum('role').notNull().default('user'),
  department_id: uuid('department_id').references(() => departments.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const sourceRequests = pgTable('source_requests', {
  id: text('id').primaryKey(), // SRC-YYYY-XXXX
  requester_id: uuid('requester_id').notNull().references(() => profiles.id),
  department_id: uuid('department_id').notNull().references(() => departments.id),
  description: text('description').notNull(),
  attachment_path: text('attachment_path'),
  attachment_name: text('attachment_name'),
  status: workflowStatusEnum('status').notNull().default('Submitted'),
  current_assignee_role: roleEnum('current_assignee_role'),
  assigned_employee_id: uuid('assigned_employee_id').references(() => profiles.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const workflowActions = pgTable('workflow_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  request_id: text('request_id').notNull().references(() => sourceRequests.id, { onDelete: 'cascade' }),
  actor_id: uuid('actor_id').notNull().references(() => profiles.id),
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
  profiles: many(profiles),
  sourceRequests: many(sourceRequests),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  department: one(departments, {
    fields: [profiles.department_id],
    references: [departments.id],
  }),
  requestsSubmitted: many(sourceRequests, { relationName: 'requester' }),
  requestsAssigned: many(sourceRequests, { relationName: 'assigned_employee' }),
  actions: many(workflowActions),
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
