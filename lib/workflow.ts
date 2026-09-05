import type { Role, WorkflowStatus, WorkflowTransition, WorkflowTrigger } from './types';

// ============================================================
// Workflow state machine — defines all valid transitions
// ============================================================

export const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  // User submits a new or returned request
  { from: 'Submitted',            action: 'approve',  to: 'HOD Approved',           next_assignee_role: 'regional_coordinator',           requires_comment: false },
  { from: 'Submitted',            action: 'reject',   to: 'HOD Rejected',            next_assignee_role: null,                   requires_comment: true  },
  { from: 'Submitted',            action: 'return',   to: 'HOD Returned',            next_assignee_role: 'user',                 requires_comment: true  },
  { from: 'Submitted',            action: 'cancel',   to: 'Cancelled',               next_assignee_role: null,                   requires_comment: true  },

  // HOD Returned → User resubmits
  { from: 'HOD Returned',         action: 'resubmit', to: 'Submitted',               next_assignee_role: 'hod',                  requires_comment: false },

  // Regional Coordinator review
  { from: 'Regional Coordinator Review', action: 'approve', to: 'Final Head Review',   next_assignee_role: 'final_head',           requires_comment: false },
  { from: 'Regional Coordinator Review', action: 'reject',  to: 'HOD Rejected',         next_assignee_role: null,                   requires_comment: true  },
  { from: 'Regional Coordinator Review', action: 'return',  to: 'Returned to HOD',      next_assignee_role: 'hod',                  requires_comment: true  },

  { from: 'HOD Approved',               action: 'approve',  to: 'Final Head Review',   next_assignee_role: 'final_head',           requires_comment: false },
  { from: 'HOD Approved',               action: 'reject',   to: 'HOD Rejected',         next_assignee_role: null,                   requires_comment: true  },
  { from: 'HOD Approved',               action: 'return',   to: 'Returned to HOD',      next_assignee_role: 'hod',                  requires_comment: true  },

  // Returned to Regional Coordinator -> Coordinator resubmits
  { from: 'Returned to Regional Coordinator', action: 'resubmit', to: 'Regional Coordinator Review', next_assignee_role: 'regional_coordinator', requires_comment: false },
  { from: 'Returned to Regional Coordinator', action: 'return',   to: 'Returned to HOD',              next_assignee_role: 'hod',                  requires_comment: true },

  // Final Head review
  { from: 'Final Head Review',    action: 'approve',  to: 'Final Head Approved',     next_assignee_role: 'procurement_manager',  requires_comment: false },
  { from: 'Final Head Review',    action: 'reject',   to: 'Final Head Rejected',     next_assignee_role: null,                   requires_comment: true  },
  { from: 'Final Head Review',    action: 'return',   to: 'Returned to Regional Coordinator', next_assignee_role: 'regional_coordinator', requires_comment: true  },

  // Final Head Returned -> User resubmits (Deprecated in favor of Returned to Requester)
  { from: 'Final Head Returned',  action: 'resubmit', to: 'Submitted',               next_assignee_role: 'hod',                  requires_comment: false },

  // Procurement Manager review
  { from: 'Final Head Approved',  action: 'approve',  to: 'Procurement Approved',    next_assignee_role: 'section_manager',      requires_comment: false },
  { from: 'Final Head Approved',  action: 'reject',   to: 'Procurement Rejected',    next_assignee_role: null,                   requires_comment: true  },
  { from: 'Final Head Approved',  action: 'return',   to: 'Returned to Regional Head', next_assignee_role: 'final_head',         requires_comment: true  },

  // New Return Flows (Reverse Step-by-Step)
  { from: 'Returned to Regional Head', action: 'resubmit', to: 'Final Head Approved', next_assignee_role: 'procurement_manager', requires_comment: false },
  { from: 'Returned to Regional Head', action: 'return',   to: 'Returned to HOD',     next_assignee_role: 'hod',                 requires_comment: true  },

  { from: 'Returned to HOD',           action: 'resubmit', to: 'HOD Approved',        next_assignee_role: 'regional_coordinator', requires_comment: false },
  { from: 'Returned to HOD',           action: 'return',   to: 'Returned to Requester', next_assignee_role: 'user',              requires_comment: true  },
  { from: 'Returned to HOD',           action: 'cancel',   to: 'Cancelled',             next_assignee_role: null,                 requires_comment: true  },

  { from: 'Returned to Requester',     action: 'resubmit', to: 'Submitted',           next_assignee_role: 'hod',                 requires_comment: false },

  // Procurement Returned -> User resubmits (Deprecated in favor of Returned to Requester)
  { from: 'Procurement Returned', action: 'resubmit', to: 'Submitted',               next_assignee_role: 'hod',                  requires_comment: false },

  // Section Manager assigns
  { from: 'Procurement Approved', action: 'assign',   to: 'Assigned',                next_assignee_role: 'employee',             requires_comment: false },

  // Employee processes
  { from: 'Assigned',             action: 'evaluate_vendor', to: 'Vendor Evaluation', next_assignee_role: 'employee',             requires_comment: false },
  { from: 'Vendor Evaluation',    action: 'create_pr',       to: 'PR Created',        next_assignee_role: 'employee',             requires_comment: false },
  { from: 'PR Created',           action: 'create_po',       to: 'PO Created',        next_assignee_role: 'employee',             requires_comment: false },
  { from: 'PO Created',           action: 'log_payment',     to: 'Payment Pending',   next_assignee_role: 'employee',             requires_comment: false },
  { from: 'Payment Pending',      action: 'log_delivery',    to: 'Delivered',         next_assignee_role: 'employee',             requires_comment: false },
  { from: 'Delivered',            action: 'close_request',   to: 'Completed',         next_assignee_role: null,                   requires_comment: false },
];

// ============================================================
// Get what actions a role can take on a request in a given status
// ============================================================

export function getAvailableActions(
  status: WorkflowStatus,
  userRole: Role,
  isRequester: boolean,
  isAssignedEmployee: boolean,
  isHodOfDept: boolean,
): WorkflowTrigger[] {
  const actions: WorkflowTrigger[] = [];

  // Any requester can resubmit their own returned requests
  if (
    isRequester &&
    (status === 'HOD Returned' || status === 'Final Head Returned' || status === 'Procurement Returned' || status === 'Returned to Requester')
  ) {
    actions.push('resubmit');
  }

  switch (userRole) {
    case 'hod':
      if (status === 'Submitted' && isHodOfDept) {
        actions.push('approve', 'return', 'cancel');
      }
      if (status === 'Returned to HOD' && isHodOfDept) {
        actions.push('resubmit', 'return', 'cancel');
      }
      break;

    case 'regional_coordinator':
      if (status === 'Regional Coordinator Review' || status === 'HOD Approved' || status === 'Final Head Review') {
        actions.push('approve', 'reject', 'return');
      }
      if (status === 'Returned to Regional Coordinator' || status === 'Returned to Regional Head') {
        actions.push('resubmit', 'return');
      }
      break;

    case 'final_head':
      if (status === 'Final Head Review') {
        actions.push('approve', 'reject', 'return');
      }
      if (status === 'Returned to Regional Head') {
        actions.push('resubmit', 'return');
      }
      break;

    case 'procurement_manager':
      if (status === 'Final Head Approved') {
        actions.push('approve', 'reject', 'return');
      }
      break;

    case 'section_manager':
      if (status === 'Procurement Approved') {
        actions.push('assign');
      }
      break;

    case 'employee':
      if (status === 'Assigned' && isAssignedEmployee) {
        actions.push('evaluate_vendor');
      }
      if (status === 'Vendor Evaluation' && isAssignedEmployee) {
        actions.push('create_pr');
      }
      if (status === 'PR Created' && isAssignedEmployee) {
        actions.push('create_po');
      }
      if (status === 'PO Created' && isAssignedEmployee) {
        actions.push('log_payment');
      }
      if (status === 'Payment Pending' && isAssignedEmployee) {
        actions.push('log_delivery');
      }
      if (status === 'Delivered' && isAssignedEmployee) {
        actions.push('close_request');
      }
      break;

    case 'user':
      // Handled globally for requesters above
      break;

    case 'admin':
      // Admin can view everything but takes no workflow actions
      break;
  }

  return actions;
}

// ============================================================
// Status display metadata
// ============================================================

export const STATUS_CONFIG: Record<WorkflowStatus, {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}> = {
  'Submitted':                 { label: 'Submitted',                 color: 'text-yellow-300',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  dot: 'bg-yellow-400'  },
  'HOD Review':                { label: 'HOD Review',                color: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    dot: 'bg-blue-400'    },
  'HOD Approved':              { label: 'HOD Approved',              color: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    dot: 'bg-blue-400'    },
  'HOD Rejected':              { label: 'HOD Rejected',              color: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     dot: 'bg-red-400'     },
  'HOD Returned':              { label: 'Returned by HOD',           color: 'text-orange-300',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  dot: 'bg-orange-400'  },
  'Under Required Review':     { label: 'Sent to RRF – Request Required From User Department', color: 'text-orange-300',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  dot: 'bg-orange-400'  },
  'Target Dept Approved':      { label: 'Target Dept Approved',      color: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    dot: 'bg-blue-400'    },
  'Pending Home HOD Confirmation': { label: 'Pending Home HOD Confirmation', color: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  'Final Head Review':         { label: 'Regional Head Review',         color: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    dot: 'bg-blue-400'    },
  'Final Head Approved':       { label: 'Regional Head Approved',       color: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    dot: 'bg-blue-400'    },
  'Final Head Rejected':       { label: 'Regional Head Rejected',       color: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     dot: 'bg-red-400'     },
  'Final Head Returned':       { label: 'Returned by Regional Head',    color: 'text-orange-300',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  dot: 'bg-orange-400'  },
  'Procurement Review':        { label: 'Procurement Review',        color: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    dot: 'bg-blue-400'    },
  'Procurement Approved':      { label: 'Procurement Approved',      color: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    dot: 'bg-blue-400'    },
  'Procurement Rejected':      { label: 'Procurement Rejected',      color: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     dot: 'bg-red-400'     },
  'Procurement Returned':      { label: 'Returned by Procurement',   color: 'text-orange-300',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  dot: 'bg-orange-400'  },
  'Section Manager Assignment':{ label: 'Awaiting Assignment',       color: 'text-purple-300',  bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  dot: 'bg-purple-400'  },
  'Assigned':                  { label: 'Assigned',                  color: 'text-purple-300',  bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  dot: 'bg-purple-400'  },
  'Vendor Evaluation':         { label: 'Vendor Evaluation',         color: 'text-indigo-300',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/30',  dot: 'bg-indigo-400'  },
  'PR Created':                { label: 'PR Created',                color: 'text-teal-300',    bg: 'bg-teal-500/10',    border: 'border-teal-500/30',    dot: 'bg-teal-400'    },
  'PO Created':                { label: 'PO Created',                color: 'text-teal-300',    bg: 'bg-teal-500/10',    border: 'border-teal-500/30',    dot: 'bg-teal-400'    },
  'Payment Pending':           { label: 'Payment Pending',           color: 'text-amber-300',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   dot: 'bg-amber-400'   },
  'Delivered':                 { label: 'Delivered',                 color: 'text-lime-300',    bg: 'bg-lime-500/10',    border: 'border-lime-500/30',    dot: 'bg-lime-400'    },
  'Processing':                { label: 'Processing',                color: 'text-cyan-300',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    dot: 'bg-cyan-400'    },
  'Completed':                 { label: 'Completed',                 color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  'Closed':                    { label: 'Closed',                    color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/30',   dot: 'bg-slate-500'   },
  'Cancelled':                 { label: 'Cancelled',                 color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/30',   dot: 'bg-slate-500'   },
  'Returned to Regional Head': { label: 'Returned to Regional Head', color: 'text-orange-300',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  dot: 'bg-orange-400'  },
  'Returned to HOD':           { label: 'Returned to HOD',           color: 'text-orange-300',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  dot: 'bg-orange-400'  },
  'Returned to Requester':     { label: 'Returned to Requester',     color: 'text-orange-300',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  dot: 'bg-orange-400'  },
  'Regional Coordinator Review': { label: 'Regional Coordinator Review', color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  'Returned to Regional Coordinator': { label: 'Returned to Regional Coordinator', color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400' },
};

// ============================================================
// Role display labels
// ============================================================

export const ROLE_LABELS: Record<Role, string> = {
  user:                'Staff / Requester',
  hod:                 'Head of Department (HOD)',
  final_head:          'Regional Head',
  procurement_manager: 'Procurement Manager',
  section_manager:     'Section Manager',
  employee:            'Employee',
  admin:               'System Admin',
  regional_coordinator: 'Regional Coordinator',
};

// ============================================================
// Workflow stage labels for the timeline
// ============================================================

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    submitted:          'Request Submitted',
    approved:           'Approved',
    rejected:           'Rejected',
    returned:           'Returned for Correction',
    resubmitted:        'Resubmitted',
    assigned:           'Assigned to Employee',
    vendor_selected:    'Vendor Evaluated',
    pr_created:         'PR Created',
    po_created:         'PO Created',
    payment_done:       'Payment Logged',
    delivered:          'Delivery Logged',
    closed:             'Request Closed',
    cancelled:          'Request Cancelled',
    processing_started: 'Processing Started',
    completed:          'Completed',
  };
  return labels[action] ?? action;
}
