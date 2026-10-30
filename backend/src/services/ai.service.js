import { env } from '../config/env.js';
import {
  communicationResponseSchema,
} from '../validators/communication.schema.js';

export class AiServiceError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'AiServiceError';
    this.status = status;
  }
}

async function requestAiService(pathname, input, validate) {
  if (!env.aiServiceApiKey) {
    throw new AiServiceError(
      'AI service authentication is not configured.',
      503,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50000);

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
      const status = response.status === 400 || response.status === 413
        ? response.status
        : 502;
      throw new AiServiceError(
        body?.error || 'AI service request failed.',
        status,
      );
    }

    if (!validate(body)) {
      throw new AiServiceError('AI service returned an invalid response.');
    }

    return body;
  } catch (error) {
    if (error instanceof AiServiceError) throw error;
    if (error.name === 'AbortError') {
      throw new AiServiceError('AI service request timed out.', 504);
    }
    throw new AiServiceError('Unable to connect to the AI service.');
  } finally {
    clearTimeout(timeout);
  }
}

export function requestImpactAnalysis(changes) {
  return requestAiService(
    '/api/v1/ai/impact-analysis',
    { changes },
    (body) => body && Array.isArray(body.assessments),
  );
}

export function requestCommunicationGeneration(input) {
  return requestAiService(
    '/api/v1/ai/communications',
    input,
    (body) => communicationResponseSchema.safeParse(body).success,
  );
}
