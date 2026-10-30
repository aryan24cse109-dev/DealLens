import test from 'node:test';
import assert from 'node:assert/strict';

import { env } from '../src/config/env.js';
import { requireServiceAuth } from '../src/middleware/service-auth.middleware.js';

const originalKey = env.aiServiceApiKey;

test.afterEach(() => {
  env.aiServiceApiKey = originalKey;
});

function requestWithAuthorization(value) {
  return {
    get(name) {
      return name.toLowerCase() === 'authorization' ? value : undefined;
    },
  };
}

function responseRecorder() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };
}

test('accepts the configured bearer token', () => {
  env.aiServiceApiKey = 'service-key';
  const response = responseRecorder();
  let called = false;

  requireServiceAuth(
    requestWithAuthorization('Bearer service-key'),
    response,
    () => {
      called = true;
    },
  );

  assert.equal(called, true);
  assert.equal(response.statusCode, null);
});

test('rejects an invalid bearer token', () => {
  env.aiServiceApiKey = 'service-key';
  const response = responseRecorder();

  requireServiceAuth(
    requestWithAuthorization('Bearer wrong-key'),
    response,
    () => {
      throw new Error('next should not be called');
    },
  );

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.error, 'Unauthorized service request.');
});
