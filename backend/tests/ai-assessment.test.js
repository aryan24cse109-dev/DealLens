import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aiImpactAssessmentListSchema,
} from '../src/validators/impact-analysis.schema.js';

const assessment = {
  changeId: 'change-123',
  category: 'LIABILITY',
  severity: 'HIGH',
  impact: 'The revised clause increases financial exposure.',
  explanation: 'The liability cap was increased in the revised wording.',
  suggestedAction: 'Escalate the revised cap for legal review.',
  confidence: 0.9,
};

test('accepts the complete persisted AI assessment shape', () => {
  const result = aiImpactAssessmentListSchema.safeParse([assessment]);

  assert.equal(result.success, true);
});

test('requires a suggested action for persisted AI assessments', () => {
  const { suggestedAction: _suggestedAction, ...withoutAction } = assessment;
  const result = aiImpactAssessmentListSchema.safeParse([withoutAction]);

  assert.equal(result.success, false);
});
