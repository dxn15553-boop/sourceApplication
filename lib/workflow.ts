import type { Role, WorkflowStatus, WorkflowTransition, WorkflowTrigger } from './types';

// ============================================================
// Workflow state machine — defines all valid transitions
// ============================================================

export const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  // User submits a new or returned request
  { from: 'Submitted',            action: 'approve',  to: 'HOD Approved',           next_assignee_role: 'final_head',           requires_comment: false },
  { from: 'Submitted',            action: 'reject',   to: 'HOD Rejected',            next_assignee_role: null,                   requires_comment: true  },
  { from: 'Submitted',            action: 'return',   to: 'HOD Returned',            next_assignee_role: 'user',                 requires_comment: true  },

  // HOD Returned → User resubmits
  { from: 'HOD Returned',         action: 'resubmit', to: 'Submitted',               next_assignee_role: 'hod',                  requires_comment: false },

  // Final Head review
  { from: 'HOD Approved',         action: 'approve',  to: 'Final Head Approved',     next_assignee_role: 'procurement_manager',  requires_comment: false },
  { from: 'HOD Approved',         action: 'reject',   to: 'Final Head Rejected',     next_assignee_role: null,                   requires_comment: true  },
  { from: 'HOD Approved',         action: 'return',   to: 'Final Head Returned',     next_assignee_role: 'user',                 requires_comment: true  },

  // Final Head Returned → User resubmits
  { from: 'Final Head Returned',  action: 'resubmit', to: 'Submitted',               next_assignee_role: 'hod',                  requires_comment: false },

  // Procurement Manager review
  { from: 'Final Head Approved',  action: 'approve',  to: 'Procurement Approved',    next_assignee_role: 'section_manager',      requires_comment: false },
  { from: 'Final Head Approved',  action: 'reject',   to: 'Procurement Rejected',    next_assignee_role: null,                   requires_comment: true  },
  { from: 'Final Head Approved',  action: 'return',   to: 'Procurement Returned',    next_assignee_role: 'user',                 requires_comment: true  },

  // Procurement Returned → User resubmits
  { from: 'Procurement Returned', action: 'resubmit', to: 'Submitted',               next_assignee_role: 'hod',                  requires_comment: false },

  // Section Manager assigns
  { from: 'Procurement Approved', action: 'assign',   to: 'Assigned',                next_assignee_role: 'employee',             requires_comment: false },

  // Employee processes
  { from: 'Assigned',             action: 'complete', to: 'Completed',               next_assignee_role: null,                   requires_comment: false },
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

  switch (userRole) {
    case 'hod':
      if (status === 'Submitted' && isHodOfDept) {
        actions.push('approve', 'reject', 'return');
      }
      break;

    case 'final_head':
      if (status === 'HOD Approved') {
        actions.push('approve', 'reject', 'return');
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
        actions.push('complete');
      }
      break;

    case 'user':
      if (
        isRequester &&
        (status === 'HOD Returned' || status === 'Final Head Returned' || status === 'Procurement Returned')
      ) {
        actions.push('resubmit');
      }
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
  'Final Head Review':         { label: 'Final Head Review',         color: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    dot: 'bg-blue-400'    },
  'Final Head Approved':       { label: 'Final Head Approved',       color: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    dot: 'bg-blue-400'    },
  'Final Head Rejected':       { label: 'Final Head Rejected',       color: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     dot: 'bg-red-400'     },
  'Final Head Returned':       { label: 'Returned by Final Head',    color: 'text-orange-300',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  dot: 'bg-orange-400'  },
  'Procurement Review':        { label: 'Procurement Review',        color: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    dot: 'bg-blue-400'    },
  'Procurement Approved':      { label: 'Procurement Approved',      color: 'text-blue-300',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    dot: 'bg-blue-400'    },
  'Procurement Rejected':      { label: 'Procurement Rejected',      color: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     dot: 'bg-red-400'     },
  'Procurement Returned':      { label: 'Returned by Procurement',   color: 'text-orange-300',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  dot: 'bg-orange-400'  },
  'Section Manager Assignment':{ label: 'Awaiting Assignment',       color: 'text-purple-300',  bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  dot: 'bg-purple-400'  },
  'Assigned':                  { label: 'Assigned',                  color: 'text-purple-300',  bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  dot: 'bg-purple-400'  },
  'Processing':                { label: 'Processing',                color: 'text-cyan-300',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    dot: 'bg-cyan-400'    },
  'Completed':                 { label: 'Completed',                 color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  'Cancelled':                 { label: 'Cancelled',                 color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/30',   dot: 'bg-slate-500'   },
};

// ============================================================
// Role display labels
// ============================================================

export const ROLE_LABELS: Record<Role, string> = {
  user:                'Staff / Requester',
  hod:                 'Head of Department (HOD)',
  final_head:          'Final Head',
  procurement_manager: 'Procurement Manager',
  section_manager:     'Section Manager',
  employee:            'Employee',
  admin:               'System Admin',
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
    processing_started: 'Processing Started',
    completed:          'Completed',
  };
  return labels[action] ?? action;
}
