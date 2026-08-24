// ============================================================
// All TypeScript types for the Source Request Management App
// ============================================================

export type Role =
  | 'user'
  | 'hod'
  | 'final_head'
  | 'procurement_manager'
  | 'section_manager'
  | 'employee'
  | 'admin';

export type WorkflowStatus =
  | 'Submitted'
  | 'HOD Review'
  | 'HOD Approved'
  | 'HOD Rejected'
  | 'HOD Returned'
  | 'Under Required Review'
  | 'Target Dept Approved'
  | 'Pending Home HOD Confirmation'
  | 'Final Head Review'
  | 'Final Head Approved'
  | 'Final Head Rejected'
  | 'Final Head Returned'
  | 'Procurement Review'
  | 'Procurement Approved'
  | 'Procurement Rejected'
  | 'Procurement Returned'
  | 'Section Manager Assignment'
  | 'Assigned'
  | 'Vendor Evaluation'
  | 'PR Created'
  | 'PO Created'
  | 'Payment Pending'
  | 'Delivered'
  | 'Processing'
  | 'Completed'
  | 'Closed'
  | 'Cancelled'
  | 'Returned to Regional Head'
  | 'Returned to HOD'
  | 'Returned to Requester';

// What is stored in the audit trail (past tense)
export type WorkflowAction =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'resubmitted'
  | 'assigned'
  | 'processing_started'
  | 'vendor_selected'
  | 'pr_created'
  | 'po_created'
  | 'prl_completed'
  | 'payment_done'
  | 'delivered'
  | 'completed'
  | 'closed';

export type WorkflowTrigger =
  | 'approve'
  | 'reject'
  | 'return'
  | 'resubmit'
  | 'assign'
  | 'evaluate_vendor'
  | 'create_pr'
  | 'create_po'
  | 'log_payment'
  | 'log_delivery'
  | 'close_request'
  | 'complete';

export interface Department {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  departmentIds?: string[];
  department?: Department; // Keeping for backwards compatibility where needed
  created_at: string;
}

export interface AuditEntry {
  id: string;
  request_id: string;
  actor_id: string;
  actor?: Profile;
  action: WorkflowAction | string;
  comment: string | null;
  created_at: string;
}

export interface SourceRequest {
  id: string; // SRC-YYYY-XXXX
  requester_id: string;
  requester?: Profile;
  department_id: string;
  department?: Department;
  description: string;
  attachment_path: string | null;
  attachment_name: string | null;
  status: WorkflowStatus;
  current_assignee_role: Role;
  assigned_employee_id: string | null;
  assigned_employee?: Profile;
  created_at: string;
  updated_at: string;
  workflow_actions?: AuditEntry[];
}

export interface WorkflowTransition {
  from: WorkflowStatus;
  action: WorkflowTrigger;
  to: WorkflowStatus;
  next_assignee_role: Role | null;
  requires_comment: boolean;
}

// ---- API payloads ----

export type CreateRequestPayload = {
  department_id?: string;
  department_ids?: string[];
  requester_name?: string;
  staff_requester_id?: string;
  description: string;
  attachment_path?: string;
  attachment_name?: string;
};

export interface WorkflowActionPayload {
  action: WorkflowTrigger;
  comment?: string;
  assigned_employee_id?: string;
}

// ---- UI helpers ----

export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}
