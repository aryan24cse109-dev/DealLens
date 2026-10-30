import test from 'node:test';
import assert from 'node:assert/strict';

import {
  splitChangesByTokenBudget,
  splitIntoBatches,
} from '../src/utils/batch.js';

test('splits large impact-analysis requests into bounded batches', () => {
  const changes = Array.from({ length: 116 }, (_, index) => ({ id: index }));
  const batches = splitIntoBatches(changes, 50);

  assert.deepEqual(batches.map((batch) => batch.length), [50, 50, 16]);
  assert.equal(batches.flat().length, changes.length);
  assert.equal(batches.flat()[115].id, 115);
});

test('rejects invalid impact-analysis batch sizes', () => {
  assert.throws(() => splitIntoBatches([], 0), TypeError);
  assert.throws(() => splitIntoBatches([], 1.5), TypeError);
});

test('splits changes by estimated prompt tokens without exceeding item limits', () => {
  const changes = Array.from({ length: 116 }, (_, index) => ({
    id: `change-${index}`,
    type: 'MODIFIED',
    originalText: 'old value',
    revisedText: 'new value',
  }));
  const batches = splitChangesByTokenBudget(changes, {
    maxChanges: 50,
    maxPromptTokens: 1800,
  });

  assert.equal(batches.flat().length, 116);
  assert.ok(batches.every((batch) => batch.length <= 50));
  assert.ok(batches.length >= 3);
});
