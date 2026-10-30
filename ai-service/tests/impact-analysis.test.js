import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseAndValidateImpactOutput,
  parseJsonObject,
} from '../src/utils/validate-output.js';

const assessment = (changeId) => ({
  changeId,
  category: 'PAYMENT_TERMS',
  impact: 'Payment timing changes cash-flow expectations.',
  explanation: 'The revised payment period is longer.',
  suggestedAction: 'Confirm the revised payment terms.',
  severity: 'MEDIUM',
  confidence: 0.9,
});

test('accepts valid structured JSON for every requested change', () => {
  const result = parseAndValidateImpactOutput(
    JSON.stringify({
      assessments: [assessment('change-1'), assessment('change-2')],
    }),
    ['change-1', 'change-2'],
  );

  assert.equal(result.assessments.length, 2);
});

test('recovers JSON wrapped in markdown fences or explanatory text', () => {
  const content = 'Here is the result:\n```json\n'
    + JSON.stringify({ assessments: [assessment('change-1')] })
    + '\n```\n';
  assert.equal(parseJsonObject(content).assessments.length, 1);
  assert.equal(
    parseAndValidateImpactOutput(
      `Result:\n${JSON.stringify({ assessments: [assessment('change-1')] })}`,
      ['change-1'],
    ).assessments.length,
    1,
  );
});

test('rejects missing required assessment fields', () => {
  const invalid = { ...assessment('change-1') };
  delete invalid.suggestedAction;

  assert.throws(
    () => parseAndValidateImpactOutput(
      JSON.stringify({ assessments: [invalid] }),
      ['change-1'],
    ),
    /required schema/,
  );
});

test('rejects missing, duplicate, or unexpected change IDs', () => {
  assert.throws(
    () => parseAndValidateImpactOutput(
      JSON.stringify({ assessments: [assessment('change-1')] }),
      ['change-1', 'change-2'],
    ),
    /missing changes/,
  );
  assert.throws(
    () => parseAndValidateImpactOutput(
      JSON.stringify({
        assessments: [assessment('change-1'), assessment('change-1')],
      }),
      ['change-1', 'change-2'],
    ),
    /missing changes/,
  );
  assert.throws(
    () => parseAndValidateImpactOutput(
      JSON.stringify({ assessments: [assessment('unexpected')] }),
      ['change-1'],
    ),
    /missing changes/,
  );
});

test('rejects invalid JSON and truncated output', () => {
  assert.throws(
    () => parseAndValidateImpactOutput('{"assessments":[', ['change-1']),
    /invalid JSON/,
  );
  assert.throws(
    () => parseAndValidateImpactOutput(
      JSON.stringify({ assessments: [] }),
      ['change-1'],
    ),
    /missing changes/,
  );
});

test('rejects incompatible schema values', () => {
  assert.throws(
    () => parseAndValidateImpactOutput(
      JSON.stringify({
        assessments: [{
          ...assessment('change-1'),
          severity: 'URGENT',
        }],
      }),
      ['change-1'],
    ),
    /required schema/,
  );
});