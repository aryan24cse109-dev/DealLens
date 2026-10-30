
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compareDocumentsSchema,
} from '../src/validators/comparison.schema.js';

test('accepts two different document IDs', () => {
  const result = compareDocumentsSchema.safeParse({
    originalDocumentId: 'original-123',
    revisedDocumentId: 'revised-456',
  });

  assert.equal(result.success, true);
});

test('rejects missing document IDs', () => {
  const result = compareDocumentsSchema.safeParse({
    originalDocumentId: 'original-123',
  });

  assert.equal(result.success, false);
});

test('rejects identical document IDs', () => {
  const result = compareDocumentsSchema.safeParse({
    originalDocumentId: 'same-id',
    revisedDocumentId: 'same-id',
  });

  assert.equal(result.success, false);
});

test('rejects empty document IDs', () => {
  const result = compareDocumentsSchema.safeParse({
    originalDocumentId: '',
    revisedDocumentId: 'revised-456',
  });

  assert.equal(result.success, false);
});
