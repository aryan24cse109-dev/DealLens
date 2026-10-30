import { env } from '../config/env.js';
import {
  communicationResponseSchema,
} from '../validators/communication.schema.js';

export class AiServiceError extends Error {
  constructor(message, status = 502, retryAfterMs = null) {
    super(message);
    this.name = 'AiServiceError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function parseRetryAfter(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : Math.max(0, timestamp - Date.now());
}

function parseResetDuration(value) {
  if (!value) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric * 1000;
  const match = String(value).match(
    /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/,
  );
  if (!match || !match[1] && !match[2] && !match[3]) return null;
  return (
    Number(match[1] || 0) * 3600000
    + Number(match[2] || 0) * 60000
    + Number(match[3] || 0) * 1000
  );
}

function getRetryDelay(response) {
  const header = (name) => response.headers?.get?.(name);
  return Math.max(
    parseRetryAfter(header('retry-after')) || 0,
    parseResetDuration(header('x-ratelimit-reset-tokens')) || 0,
    parseResetDuration(header('x-ratelimit-reset-requests')) || 0,
  ) || null;
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function requestAiService(
  pathname,
  input,
  validate,
  options = {},
  metadata = {},
) {
  if (!env.aiServiceApiKey) {
    throw new AiServiceError(
      'AI service authentication is not configured.',
      503,
    );
  }

  const maxRetries = Number.isInteger(env.aiMaxRetries) && env.aiMaxRetries >= 0
    ? env.aiMaxRetries
    : 3;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs || env.aiRequestTimeoutMs,
    );
    try {
      const response = await fetch(
        `${env.aiServiceUrl.replace(/\/+$/, '')}${pathname}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: ['Bearer', env.aiServiceApiKey].join(' '),
          },
          body: JSON.stringify(input),
          signal: controller.signal,
        },
      );
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const retryAfterMs = getRetryDelay(response);
        const status = response.status === 400 || response.status === 413
          ? response.status
          : response.status === 429
            ? 429
            : 502;
        const message = body?.details?.length
          ? `${body?.error || 'AI service request failed.'} ${body.details
            .map((detail) => `${detail.path}: ${detail.message}`)
            .join('; ')}`
          : body?.error || 'AI service request failed.';
        const maxWaitMs = Number.isInteger(env.aiMaxSynchronousRetryWaitMs)
          ? env.aiMaxSynchronousRetryWaitMs
          : 30000;
        const providerWaitTooLong = retryAfterMs && retryAfterMs > maxWaitMs;
        if (
          (status === 429 || status === 502)
          && !providerWaitTooLong
          && attempt < maxRetries
        ) {
          const backoff = Math.min(
            30000,
            retryAfterMs ?? (Number(env.aiRetryBaseDelayMs) * (2 ** attempt)),
          );
          console.warn('[ai.retry.scheduled]', {
            operationId: metadata.operationId || null,
            batch: metadata.batch || null,
            attempt: attempt + 1,
            status,
            delayMs: backoff,
          });
          await wait(backoff + Math.floor(Math.random() * 250));
          continue;
        }
        const finalMessage = providerWaitTooLong
          ? `${message} Retry after the provider reset window.`
          : message;
        throw new AiServiceError(finalMessage, status, retryAfterMs);
      }

      if (!validate(body)) {
        throw new AiServiceError('AI service returned an invalid response.');
      }
      return body;
    } catch (error) {
      if (error instanceof AiServiceError) throw error;
      if (error.name === 'AbortError') {
        if (attempt < maxRetries) {
          await wait(Math.min(30000, Number(env.aiRetryBaseDelayMs) * (2 ** attempt)));
          continue;
        }
        throw new AiServiceError('AI service request timed out.', 504);
      }
      if (attempt < maxRetries) {
        await wait(Math.min(30000, Number(env.aiRetryBaseDelayMs) * (2 ** attempt)));
        continue;
      }
      throw new AiServiceError('Unable to connect to the AI service.');
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function requestImpactAnalysis(changes, options = {}, metadata = {}) {
  return requestAiService(
    '/api/v1/ai/impact-analysis',
    { changes, ...options },
    (body) => body && Array.isArray(body.assessments),
    {},
    metadata,
  );
}

export function requestCommunicationGeneration(input) {
  return requestAiService(
    '/api/v1/ai/communications',
    input,
    (body) => communicationResponseSchema.safeParse(body).success,
  );
}
