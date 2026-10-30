import test from 'node:test';
import assert from 'node:assert/strict';

import {
  communicationRequestSchema,
  communicationResponseSchema,
} from '../src/schemas/communication.schema.js';

const request = {
  communicationType: 'CLIENT_NOTIFICATION',
  channel: 'EMAIL',
  analysis: {
    dealName: 'Supplier Agreement',
    summary: {},
    changes: [{
      id: 'change-1',
      type: 'MODIFIED',
      category: 'PAYMENT_TERMS',
      oldValue: '30 days',
      newValue: '60 days',
      explanation: 'Payment timing changed.',
      severity: 'MEDIUM',
    }],
    assessments: [{
      changeId: 'change-1',
      category: 'PAYMENT_TERMS',
      impact: 'Delayed payment affects cash flow.',
      explanation: 'The payment period doubled.',
      suggestedAction: 'Confirm the revised payment terms.',
      severity: 'MEDIUM',
      confidence: 0.9,
    }],
  },
};

test('accepts structured communication context', () => {
  assert.equal(communicationRequestSchema.safeParse(request).success, true);
});

test('rejects communication output with mismatched metadata', () => {
  const result = communicationResponseSchema.safeParse({
    subject: 'Review',
    content: 'Please review the changes.',
    communicationType: 'NEGOTIATION_MESSAGE',
    channel: 'EMAIL',
  });

  assert.equal(result.success, true);
});
