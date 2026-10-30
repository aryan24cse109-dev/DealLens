
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyContractChange,
} from '../src/services/clause-classifier.service.js';

import {
  assessContractChange,
  getHigherSeverity,
} from '../src/services/impact-assessment.service.js';

import {
  generateImpactExplanation,
} from '../src/services/impact-explanation.service.js';

import {
  impactAnalysisSchema,
} from '../src/validators/impact-analysis.schema.js';

test('classifies payment deadline changes', () => {
  const category = classifyContractChange({
    type: 'MODIFIED',
    originalText: 'Payment is due within 30 calendar days.',
    revisedText: 'Payment is due within 60 calendar days.',
  });

  assert.equal(category, 'PAYMENT_TERMS');
});

test('classifies liability changes', () => {
  const category = classifyContractChange({
    type: 'MODIFIED',
    originalText: 'Liability is capped at INR 200,000.',
    revisedText: 'Liability is capped at INR 500,000.',
  });

  assert.equal(category, 'LIABILITY');
});

test('assigns HIGH severity to liability changes', () => {
  const result = assessContractChange({
    type: 'MODIFIED',
    originalText: 'Liability is capped at INR 200,000.',
    revisedText: 'Liability is capped at INR 500,000.',
  });

  assert.equal(result.category, 'LIABILITY');
  assert.equal(result.severity, 'HIGH');
});

test('assigns CRITICAL severity to uncapped liability wording', () => {
  const result = assessContractChange({
    type: 'MODIFIED',
    originalText: 'Liability is capped at INR 200,000.',
    revisedText: 'The vendor accepts unlimited liability.',
  });

  assert.equal(result.severity, 'CRITICAL');
});

test('returns a valid assessment object', () => {
  const result = assessContractChange({
    type: 'MODIFIED',
    originalText: 'Payment is due within 30 days.',
    revisedText: 'Payment is due within 60 days.',
  });

  assert.equal(
    impactAnalysisSchema.safeParse(result).success,
    true,
  );
});

test('rejects an invalid change type', () => {
  assert.throws(
    () => assessContractChange({
      type: 'UNKNOWN',
      originalText: 'Old wording',
      revisedText: 'New wording',
    }),
    { name: 'ZodError' },
  );
});

test('generates an explanation with both wordings', () => {
  const change = {
    type: 'MODIFIED',
    originalText: 'Payment is due within 30 days.',
    revisedText: 'Payment is due within 60 days.',
  };

  const assessment = assessContractChange(change);
  const explanation = generateImpactExplanation(
    change,
    assessment,
  );

  assert.match(explanation, /PAYMENT_TERMS/);
  assert.match(explanation, /30 days/);
  assert.match(explanation, /60 days/);
  assert.match(explanation, /cash flow/i);
});

test('rejects invalid severity in an explanation assessment', () => {
  assert.throws(
    () => generateImpactExplanation(
      {
        type: 'ADDED',
        revisedText: 'New payment clause',
      },
      {
        category: 'PAYMENT_TERMS',
        severity: 'EXTREME',
        impact: 'Review payment obligations.',
      },
    ),
    { name: 'ZodError' },
  );
});

test('returns the higher severity', () => {
  assert.equal(
    getHigherSeverity('LOW', 'HIGH'),
    'HIGH',
  );

  assert.equal(
    getHigherSeverity('CRITICAL', 'MEDIUM'),
    'CRITICAL',
  );
});

test('rejects unknown severity values', () => {
  assert.throws(
    () => getHigherSeverity('UNKNOWN', 'HIGH'),
    { name: 'TypeError' },
  );
});
