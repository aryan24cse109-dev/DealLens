import test from 'node:test';
import assert from 'node:assert/strict';

import { getCookie } from '../src/middleware/auth.middleware.js';
import { requireSameOrigin } from '../src/middleware/csrf.middleware.js';
import {
  AuthServiceError,
  hashToken,
  validateGoogleClaims,
} from '../src/services/auth.service.js';

test('hashes session tokens deterministically without returning the raw token', () => {
  const token = 'session-token';
  const hash = hashToken(token);

  assert.notEqual(hash, token);
  assert.equal(hash, hashToken(token));
  assert.equal(hash.length, 64);
});

test('reads the configured session cookie from a request', () => {
  const request = {
    get(name) {
      return name === 'cookie'
        ? 'other=value; deallens_session=encoded-token'
        : undefined;
    },
  };

  assert.equal(getCookie(request, 'deallens_session'), 'encoded-token');
});

test('rejects requests from an unexpected browser origin', () => {
  const request = {
    get(name) {
      return name === 'origin' ? 'https://attacker.example' : undefined;
    },
  };
  let called = false;
  const response = {
    status(code) {
      assert.equal(code, 403);
      return this;
    },
    json(body) {
      assert.equal(body.success, false);
      called = true;
    },
  };

  requireSameOrigin(request, response, () => {
    throw new Error('unexpectedly accepted cross-site request');
  });

  assert.equal(called, true);
});

test('accepts a verified Google claim set with the expected nonce', () => {
  const now = Date.now();
  const claims = {
    iss: 'https://accounts.google.com',
    sub: 'google-subject',
    email: 'user@example.com',
    email_verified: true,
    nonce: 'nonce-value',
    iat: Math.floor((now - 1000) / 1000),
    exp: Math.floor((now + 60_000) / 1000),
  };

  assert.equal(validateGoogleClaims(claims, 'nonce-value', now), claims);
});

test('rejects Google claims with a mismatched nonce or unverified email', () => {
  const now = Date.now();
  const claims = {
    iss: 'https://accounts.google.com',
    sub: 'google-subject',
    email: 'user@example.com',
    email_verified: false,
    nonce: 'unexpected',
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + 60_000) / 1000),
  };

  assert.throws(
    () => validateGoogleClaims(claims, 'expected', now),
    (error) => error instanceof AuthServiceError && error.status === 401,
  );
});
