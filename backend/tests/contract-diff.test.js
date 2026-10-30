
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compareContractText,
} from '../src/utils/contract-diff.js';

test('returns no changes for identical contracts', () => {
  const result = compareContractText(
    'Payment within 30 days.\nRenewal after one year.',
    'Payment within 30 days.\nRenewal after one year.',
  );

  assert.deepEqual(result.summary, {
    added: 0,
    removed: 0,
    modified: 0,
    total: 0,
  });
});

test('detects a modified payment term', () => {
  const result = compareContractText(
    'Payment within 30 days.',
    'Payment within 60 days.',
  );

  assert.equal(result.summary.modified, 1);
  assert.equal(result.changes[0].type, 'MODIFIED');
  assert.equal(result.changes[0].originalText, 'Payment within 30 days.');
  assert.equal(result.changes[0].revisedText, 'Payment within 60 days.');
});

test('detects an added clause', () => {
  const result = compareContractText(
    'Payment within 30 days.',
    'Payment within 30 days.\nLate fee applies after the due date.',
  );

  assert.equal(result.summary.added, 1);
  assert.equal(result.changes[0].type, 'ADDED');
  assert.equal(
    result.changes[0].revisedText,
    'Late fee applies after the due date.',
  );
});

test('detects a removed clause', () => {
  const result = compareContractText(
    'Payment within 30 days.\nLate fee applies after the due date.',
    'Payment within 30 days.',
  );

  assert.equal(result.summary.removed, 1);
  assert.equal(result.changes[0].type, 'REMOVED');
});

test('ignores whitespace-only differences', () => {
  const result = compareContractText(
    'Payment   within 30 days.',
    'Payment within 30 days.',
  );

  assert.equal(result.summary.total, 0);
});

test('preserves the order of multiple changes', () => {
  const result = compareContractText(
    'Clause A\nClause B\nClause C',
    'Clause A\nClause B revised\nClause D',
  );

  assert.equal(result.summary.total, 2);
  assert.deepEqual(
    result.changes.map((change) => change.type),
    ['MODIFIED', 'MODIFIED'],
  );
});

test('rejects contracts beyond the supported line limit', () => {
  const longContract = Array.from(
    { length: 1501 },
    (_, index) => `Clause ${index + 1}`,
  ).join('\n');

  assert.throws(
    () => compareContractText(longContract, 'A short contract'),
    /line comparison limit/,
  );
});
