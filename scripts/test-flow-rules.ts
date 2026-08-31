import { getAvailableActions, WORKFLOW_TRANSITIONS } from '../lib/workflow';
import type { WorkflowStatus, Role } from '../lib/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function main() {
  console.log('--- Testing Workflow Configuration Rules ---');

  // Test 1: Verify the transition for HOD resubmission
  const hodResubmitTransition = WORKFLOW_TRANSITIONS.find(
    t => t.from === 'Returned to HOD' && t.action === 'resubmit'
  );
  assert(!!hodResubmitTransition, 'Transition for Returned to HOD -> resubmit should exist');
  assert(
    hodResubmitTransition!.to === 'HOD Approved',
    `Expected HOD resubmit target to be 'HOD Approved', got '${hodResubmitTransition!.to}'`
  );
  assert(
    hodResubmitTransition!.next_assignee_role === 'regional_coordinator',
    `Expected HOD resubmit next role to be 'regional_coordinator', got '${hodResubmitTransition!.next_assignee_role}'`
  );
  console.log('✓ Test 1 Passed: Returned to HOD resubmit transition verified.');

  // Test 2: Verify available actions for final_head in Returned to Regional Head status
  const finalHeadActions = getAvailableActions(
    'Returned to Regional Head',
    'final_head',
    false, // isRequester
    false, // isAssignedEmployee
    false  // isHodOfDept
  );
  assert(
    finalHeadActions.includes('resubmit') && finalHeadActions.includes('return'),
    `Expected final_head to have 'resubmit' and 'return' in Returned to Regional Head, got: ${finalHeadActions.join(', ')}`
  );
  console.log('✓ Test 2 Passed: Regional Head available actions in Returned to Regional Head verified.');

  console.log('All workflow config tests passed successfully!');
}

main().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
