import test from 'node:test';
import assert from 'node:assert/strict';

import { dashboardQuerySchema } from '../src/validators/dashboard.schema.js';
import {
  buildActivity,
  getDateWhere,
} from '../src/services/dashboard.service.js';

test('accepts a bounded dashboard query', () => {
  const result = dashboardQuerySchema.safeParse({
    from: '2026-01-01',
    to: '2026-01-31',
    limit: '20',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.limit, 20);
});

test('rejects a dashboard range whose start follows its end', () => {
  const result = dashboardQuerySchema.safeParse({
    from: '2026-02-01',
    to: '2026-01-31',
  });

  assert.equal(result.success, false);
});

test('builds an inclusive end-date database filter', () => {
  const where = getDateWhere({
    from: new Date('2026-01-01T00:00:00.000Z'),
    to: new Date('2026-01-31T00:00:00.000Z'),
  });

  assert.equal(where.createdAt.gte.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(where.createdAt.lt.toISOString(), '2026-02-01T00:00:00.000Z');
});

test('merges recent records into descending activity', () => {
  const activity = buildActivity({
    deals: [{
      id: 'deal-1',
      name: 'Deal',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }],
    documents: [{
      id: 'document-1',
      dealId: 'deal-1',
      originalName: 'contract.pdf',
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
      deal: { name: 'Deal' },
    }],
    analyses: [],
    reports: [],
    drafts: [],
  });

  assert.deepEqual(
    activity.map((item) => item.type),
    ['DOCUMENT_UPLOADED', 'DEAL_CREATED'],
  );
});
