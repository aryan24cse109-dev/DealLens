import test from 'node:test';
import assert from 'node:assert/strict';

import {
  communicationRequestSchema,
  communicationResponseSchema,
  generatedCommunicationSchema,
} from '../src/schemas/communication.schema.js';
import { normalizeGeneratedCommunication } from '../src/services/communication-generation.service.js';

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

test('accepts communication context with more than one hundred changes', () => {
  const changes = Array.from({ length: 116 }, (_, index) => ({
    ...request.analysis.changes[0],
    id: `change-${index}`,
  }));
  const assessments = changes.map((change) => ({
    ...request.analysis.assessments[0],
    changeId: change.id,
  }));

  assert.equal(communicationRequestSchema.safeParse({
    ...request,
    analysis: { ...request.analysis, changes, assessments },
  }).success, true);
});

test('validates generated content independently from trusted metadata', () => {
  const result = generatedCommunicationSchema.safeParse({
    subject: 'Review',
    content: 'Please review the changes.',
  });

  assert.equal(result.success, true);
});

test('attaches requested metadata when the model returns mismatched metadata', () => {
  const result = normalizeGeneratedCommunication({
    subject: 'Review',
    content: 'Please review the changes.',
    communicationType: 'NEGOTIATION_MESSAGE',
    channel: 'EMAIL',
  }, {
    communicationType: 'CLIENT_NOTIFICATION',
    channel: 'MESSAGE',
  });

  assert.deepEqual(result, {
    subject: 'Review',
    content: 'Please review the changes.',
    communicationType: 'CLIENT_NOTIFICATION',
    channel: 'MESSAGE',
  });
});

test('attaches requested metadata when the model omits metadata', () => {
  const types = [
    'CLIENT_NOTIFICATION',
    'INTERNAL_LEGAL_REVIEW',
    'HIGH_SEVERITY_ESCALATION',
    'CONTRACT_CLARIFICATION_REQUEST',
    'NEGOTIATION_MESSAGE',
  ];
  for (const communicationType of types) {
    const result = normalizeGeneratedCommunication({
      subject: 'Review',
      content: 'Please review the changes.',
    }, {
      communicationType,
      channel: 'EMAIL',
    });
    assert.equal(result.communicationType, communicationType);
    assert.equal(result.channel, 'EMAIL');
  }
});
