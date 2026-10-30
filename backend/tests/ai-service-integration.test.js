import test from 'node:test';
import assert from 'node:assert/strict';

import { env } from '../src/config/env.js';
import {
  AiServiceError,
  requestCommunicationGeneration,
  requestImpactAnalysis,
} from '../src/services/ai.service.js';

const originalKey = env.aiServiceApiKey;
const originalUrl = env.aiServiceUrl;
const originalFetch = globalThis.fetch;

test.afterEach(() => {
  env.aiServiceApiKey = originalKey;
  env.aiServiceUrl = originalUrl;
  globalThis.fetch = originalFetch;
});

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

test('sends authenticated communication requests and validates responses', async () => {
  env.aiServiceApiKey = 'test-service-key';
  env.aiServiceUrl = 'http://ai.test/';
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return response({
      subject: 'Review requested',
      content: 'Please review the contract changes.',
      communicationType: 'CLIENT_NOTIFICATION',
      channel: 'EMAIL',
    });
  };

  const result = await requestCommunicationGeneration({
    communicationType: 'CLIENT_NOTIFICATION',
    channel: 'EMAIL',
    analysis: {},
  });

  assert.equal(result.content, 'Please review the contract changes.');
  assert.equal(request.url, 'http://ai.test/api/v1/ai/communications');
  assert.equal(
    request.options.headers.Authorization,
    'Bearer test-service-key',
  );
});

test('maps unavailable AI service responses to AiServiceError', async () => {
  env.aiServiceApiKey = 'test-service-key';
  globalThis.fetch = async () => response({ error: 'bad request' }, 400);

  await assert.rejects(
    () => requestImpactAnalysis([]),
    (error) => error instanceof AiServiceError && error.status === 400,
  );
});

test('rejects malformed communication responses', async () => {
  env.aiServiceApiKey = 'test-service-key';
  globalThis.fetch = async () => response({
    content: 'Missing required metadata',
  });

  await assert.rejects(
    () => requestCommunicationGeneration({}),
    (error) => (
      error instanceof AiServiceError &&
      error.message === 'AI service returned an invalid response.'
    ),
  );
});
