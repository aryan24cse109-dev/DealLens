
import OpenAI from 'openai';
import { env } from '../config/env.js';

let client;

export function parseResetDuration(value) {
  if (!value) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric * 1000;
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
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

function getHeader(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(name);
  return headers[name] ?? headers[name.toLowerCase()] ?? null;
}

function sanitizeProviderMessage(value) {
  if (typeof value !== 'string') return 'Unknown provider error.';
  return value
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/(api[_-]?key|authorization|prompt|document|contract)[^,;]*/gi, '$1 [redacted]')
    .slice(0, 500);
}

function getProviderErrorDetails(error) {
  const response = error?.error || error?.response?.data?.error;
  const retryAfter = getHeader(error?.headers, 'retry-after');
  const resetTokens = getHeader(error?.headers, 'x-ratelimit-reset-tokens');
  const resetRequests = getHeader(error?.headers, 'x-ratelimit-reset-requests');
  const retryAfterMs = parseResetDuration(retryAfter);
  const resetTokensMs = parseResetDuration(resetTokens);
  const resetRequestsMs = parseResetDuration(resetRequests);
  return {
    status: Number.isInteger(error?.status) ? error.status : null,
    type: response?.type || error?.type || null,
    code: response?.code || error?.code || null,
    message: sanitizeProviderMessage(
      response?.message || error?.message,
    ),
    retryAfter,
    resetTokens,
    resetRequests,
    retryAfterMs: Math.max(
      retryAfterMs || 0,
      resetTokensMs || 0,
      resetRequestsMs || 0,
    ) || null,
  };
}

function getClient() {
  if (!env.groqApiKey) {
    throw new Error('GROQ_API_KEY is not configured.');
  }

  if (!env.groqModel) {
    throw new Error('GROQ_MODEL is not configured.');
  }

  if (!client) {
    client = new OpenAI({
      apiKey: env.groqApiKey,
      baseURL: env.groqBaseUrl,
      timeout: env.requestTimeoutMs,
      maxRetries: 0,
    });
  }

  return client;
}

export async function generateChatCompletion({
  systemPrompt,
  userPrompt,
  maxOutputTokens,
  responseFormat = { type: 'json_object' },
}) {
  const openai = getClient();

  let response;
  try {
    const request = {
      model: env.groqModel,
      temperature: 0.1,
      max_tokens: maxOutputTokens ?? 3500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    };
    if (responseFormat) request.response_format = responseFormat;
    response = await openai.chat.completions.create(request);
  } catch (error) {
    const details = getProviderErrorDetails(error);
    const providerError = new Error(
      error.status === 429
        ? 'AI provider rate limit reached.'
        : 'AI provider request failed.',
    );
    providerError.status = error.status;
    providerError.providerType = details.type;
    providerError.providerCode = details.code;
    providerError.providerMessage = details.message;
    providerError.retryAfterMs = details.retryAfterMs;
    providerError.providerModel = env.groqModel;
    providerError.providerEndpoint = env.groqBaseUrl;
    throw providerError;
  }

  const content = response.choices?.[0]?.message?.content;

  if (!content || typeof content !== 'string') {
    throw new Error('Groq returned an empty model response.');
  }

  return {
    content,
    model: response.model || env.groqModel,
    usage: response.usage
      ? {
          promptTokens: response.usage.prompt_tokens ?? 0,
          completionTokens: response.usage.completion_tokens ?? 0,
          totalTokens: response.usage.total_tokens ?? 0,
        }
      : null,
  };
}

export async function checkGroqConnection() {
  const openai = getClient();

  const response = await openai.chat.completions.create({
    model: env.groqModel,
    temperature: 0.1,
    max_tokens: 30,
    messages: [
      {
        role: 'user',
        content: 'Reply with exactly: DealLens Groq connection successful',
      },
    ],
  });

  return {
    connected: Boolean(response.choices?.[0]?.message?.content),
    model: response.model || env.groqModel,
  };
}
