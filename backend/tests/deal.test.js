import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDealSchema,
  updateDealSchema,
} from '../src/validators/deal.schema.js';

test('accepts a valid deal', () => {
  const result = createDealSchema.safeParse({
    name: 'Vendor Agreement',
    description: 'Review the supplier contract',
  });

  assert.equal(result.success, true);
});

test('rejects a deal with a short name', () => {
  const result = createDealSchema.safeParse({
    name: 'A',
  });

  assert.equal(result.success, false);
});

test('rejects an empty update', () => {
  const result = updateDealSchema.safeParse({});

  assert.equal(result.success, false);
});

test('accepts a valid status update', () => {
  const result = updateDealSchema.safeParse({
    status: 'ANALYZED',
  });

  assert.equal(result.success, true);
});

test('rejects an unknown status', () => {
  const result = updateDealSchema.safeParse({
    status: 'DONE',
  });

  assert.equal(result.success, false);
});