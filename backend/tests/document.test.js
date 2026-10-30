import test from 'node:test';
import assert from 'node:assert/strict';
import { documentUploadSchema } from '../src/validators/document.schema.js';

test('defaults document type to ORIGINAL', () => {
  const result = documentUploadSchema.safeParse({});

  assert.equal(result.success, true);
  assert.equal(result.data.type, 'ORIGINAL');
});

test('accepts REVISED document type', () => {
  const result = documentUploadSchema.safeParse({
    type: 'REVISED',
  });

  assert.equal(result.success, true);
});

test('accepts SUPPORTING document type', () => {
  const result = documentUploadSchema.safeParse({
    type: 'SUPPORTING',
  });

  assert.equal(result.success, true);
});

test('rejects an invalid document type', () => {
  const result = documentUploadSchema.safeParse({
    type: 'INVOICE',
  });

  assert.equal(result.success, false);
});