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
  | 'admin'
  | 'regional_coordinator';

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
  | 'Returned to Requester'
  | 'Regional Coordinator Review'
  | 'Returned to Regional Coordinator';

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
  | 'closed'
  | 'cancelled';

export type WorkflowTrigger =
  | 'approve'
  | 'reject'
  | 'return'
  | 'resubmit'
  | 'assign'
  | 'accept_assignment'
  | 'evaluate_vendor'
  | 'create_pr'
  | 'create_po'
  | 'log_payment'
  | 'log_delivery'
  | 'close_request'
  | 'complete'
  | 'cancel';

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
  requester_name: string | null;
  requester_designation: string | null;
  department_id: string;
  department?: Department;
  description: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent' | string | null;
  request_date?: string | null;
  required_by_date?: string | null;
  purpose_justification?: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachments?: AttachmentItem[] | string | null;
  status: WorkflowStatus;
  current_assignee_role: Role;
  assigned_employee_id: string | null;
  assigned_employee?: Profile;
  handler_accepted_at?: string | null;
  promised_delivery_date?: string | null;
  material_dispatch_date?: string | null;
  material_received_date?: string | null;
  ordered_qty?: number | null;
  received_qty?: number | null;
  accepted_qty?: number | null;
  rejected_qty?: number | null;
  rejection_reason?: string | null;
  qc_status?: 'Passed' | 'Failed' | 'Conditionally Accepted' | string | null;
  on_time_delivery?: boolean | null;
  qc_remarks?: string | null;
  hod_remarks?: string | null;
  srf_number?: string | null;
  srf_date?: string | null;
  work_completion_date?: string | null;
  created_at: string;
  updated_at: string;
  workflow_actions?: AuditEntry[];
}

export interface AttachmentItem {
  name: string;
  path: string;
  size?: number;
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
  requester_designation?: string;
  staff_requester_id?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent' | string;
  request_date?: string;
  required_by_date?: string;
  purpose_justification?: string;
  description: string;
  attachment_path?: string;
  attachment_name?: string;
  attachments?: AttachmentItem[] | string;
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
