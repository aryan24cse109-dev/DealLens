
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeText,
  splitIntoLines,
} from '../src/utils/text-normalizer.js';

test('normalizes extra spaces and tabs', () => {
  assert.equal(
    normalizeText('Payment   within\t30 days'),
    'Payment within 30 days',
  );
});

test('normalizes Windows and Mac line endings', () => {
  assert.equal(
    normalizeText('Clause 1\r\nClause 2\rClause 3'),
    'Clause 1\nClause 2\nClause 3',
  );
});

test('collapses excessive blank lines', () => {
  assert.equal(
    normalizeText('Clause 1\n\n\n\nClause 2'),
    'Clause 1\n\nClause 2',
  );
});

test('preserves meaningful numbers and wording', () => {
  assert.equal(
    normalizeText('Payment within 30 days.'),
    'Payment within 30 days.',
  );

  assert.notEqual(
    normalizeText('Payment within 30 days.'),
    normalizeText('Payment within 60 days.'),
  );
});

test('trims surrounding whitespace', () => {
  assert.equal(
    normalizeText('  Contract terms  \n  Payment terms  '),
    'Contract terms\nPayment terms',
  );
});

test('splits text into non-empty lines', () => {
  assert.deepEqual(
    splitIntoLines('Clause 1\n\nClause 2\n   \nClause 3'),
    ['Clause 1', 'Clause 2', 'Clause 3'],
  );
});

test('rejects non-string input', () => {
  assert.throws(
    () => normalizeText(null),
    TypeError,
  );
});
