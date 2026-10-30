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
const originalMaxRetries = env.aiMaxRetries;
const originalMaxWait = env.aiMaxSynchronousRetryWaitMs;
const originalTimeout = env.aiRequestTimeoutMs;
const originalFetch = globalThis.fetch;

test.afterEach(() => {
  env.aiServiceApiKey = originalKey;
  env.aiServiceUrl = originalUrl;
  env.aiMaxRetries = originalMaxRetries;
  env.aiMaxSynchronousRetryWaitMs = originalMaxWait;
  env.aiRequestTimeoutMs = originalTimeout;
  globalThis.fetch = originalFetch;
});

function response(body, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
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
      model: 'openai/gpt-oss-120b',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
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

test('retries rate-limited AI requests with a bounded delay', async () => {
  env.aiServiceApiKey = 'test-service-key';
  env.aiMaxRetries = 1;
  env.aiRetryBaseDelayMs = 1;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return attempts === 1
      ? response({ error: 'rate limited' }, 429)
      : response({ assessments: [] });
  };

  const result = await requestImpactAnalysis([{
    id: 'change-1',
    type: 'MODIFIED',
  }]);

  assert.deepEqual(result.assessments, []);
  assert.equal(attempts, 2);
});

test('respects provider Retry-After and reset headers', async () => {
  env.aiServiceApiKey = 'test-service-key';
  env.aiMaxRetries = 1;
  env.aiRetryBaseDelayMs = 1;
  env.aiMaxSynchronousRetryWaitMs = 30000;
  let attempts = 0;
  const started = Date.now();
  globalThis.fetch = async () => {
    attempts += 1;
    return attempts === 1
      ? response(
        { error: 'rate limited' },
        429,
        { 'x-ratelimit-reset-tokens': '0.01s' },
      )
      : response({ assessments: [] });
  };

  await requestImpactAnalysis([{ id: 'change-1', type: 'MODIFIED' }]);

  assert.equal(attempts, 2);
  assert.ok(Date.now() - started >= 5);
});

test('does not retry when provider reset exceeds synchronous wait', async () => {
  env.aiServiceApiKey = 'test-service-key';
  env.aiMaxRetries = 3;
  env.aiMaxSynchronousRetryWaitMs = 5;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return response(
      { error: 'rate limited' },
      429,
      { 'x-ratelimit-reset-requests': '1m' },
    );
  };

  await assert.rejects(
    () => requestImpactAnalysis([{ id: 'change-1', type: 'MODIFIED' }]),
    (error) => error instanceof AiServiceError && error.status === 429,
  );
  assert.equal(attempts, 1);
});

test('does not retry permanent validation errors', async () => {
  env.aiServiceApiKey = 'test-service-key';
  env.aiMaxRetries = 3;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return response({ error: 'invalid request' }, 400);
  };

  await assert.rejects(
    () => requestImpactAnalysis([{ id: 'change-1', type: 'MODIFIED' }]),
    (error) => error instanceof AiServiceError && error.status === 400,
  );
  assert.equal(attempts, 1);
});

test('bounds timeout failures without repeating indefinitely', async () => {
  env.aiServiceApiKey = 'test-service-key';
  env.aiMaxRetries = 0;
  env.aiRequestTimeoutMs = 5;
  globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    });
  });

  await assert.rejects(
    () => requestImpactAnalysis(
      [{ id: 'change-1', type: 'MODIFIED' }],
      {},
    ),
    (error) => error instanceof AiServiceError && error.status === 504,
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
