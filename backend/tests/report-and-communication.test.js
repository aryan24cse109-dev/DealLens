import test from 'node:test';
import assert from 'node:assert/strict';

import { serializeReport } from '../src/services/report.service.js';
import {
  createCommunicationSchema,
  updateCommunicationSchema,
} from '../src/validators/communication.schema.js';

const report = {
  id: 'report-1',
  title: 'Review',
  format: 'JSON',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  analysis: {
    id: 'analysis-1',
    status: 'COMPLETED',
    summary: '{"total":1}',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deal: {
      id: 'deal-1',
      name: 'Supplier Agreement',
      description: null,
      status: 'ANALYZED',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      documents: [],
    },
    changes: [{
      id: 'change-1',
      category: 'MODIFIED',
      field: 'PAYMENT_TERMS',
      oldValue: '30 days',
      newValue: '60 days',
      explanation: 'Payment timing changed.',
      severity: 'MEDIUM',
    }],
    aiAssessments: [{
      changeId: 'change-1',
      category: 'PAYMENT_TERMS',
      impact: 'Delayed payment affects cash flow.',
      explanation: 'The payment period doubled.',
      suggestedAction: 'Confirm the revised payment terms.',
      severity: 'MEDIUM',
      confidence: 0.9,
      model: 'openai/gpt-oss-120b',
    }],
  },
};

test('serializes saved analysis and AI assessments into report data', () => {
  const result = serializeReport(report);

  assert.equal(result.analysis.changeCount, 1);
  assert.equal(result.changes[0].aiAssessment.suggestedAction, 'Confirm the revised payment terms.');
  assert.deepEqual(result.executiveSummary.recommendations, [
    'Confirm the revised payment terms.',
  ]);
});

test('validates communication draft creation and editing', () => {
  assert.equal(createCommunicationSchema.safeParse({
    additionalInstructions: 'Please keep the tone concise.',
  }).success, true);
  assert.equal(createCommunicationSchema.safeParse({
    communicationType: 'INTERNAL_LEGAL_REVIEW',
    channel: 'INTERNAL_NOTE',
  }).success, false);
  assert.equal(updateCommunicationSchema.safeParse({
    content: 'Updated content',
  }).success, true);
  assert.equal(updateCommunicationSchema.safeParse({}).success, false);
});
