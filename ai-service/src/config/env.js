
import 'dotenv/config';

function readPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: readPositiveInteger(process.env.PORT, 5001),

  groqApiKey: process.env.GROQ_API_KEY || '',
  groqBaseUrl:
    process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1/',
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',

  aiServiceApiKey: process.env.AI_SERVICE_API_KEY || '',
  requestTimeoutMs: readPositiveInteger(
    process.env.AI_REQUEST_TIMEOUT_MS,
    45000
  ),
  maxSynchronousRetryWaitMs: readPositiveInteger(
    process.env.AI_MAX_SYNCHRONOUS_RETRY_WAIT_MS,
    30000,
  ),
  maxChangesPerRequest: readPositiveInteger(
    process.env.AI_MAX_CHANGES,
    50
  ),
};
