
import OpenAI from 'openai';
import { env } from '../config/env.js';

let client;

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
      maxRetries: 1,
    });
  }

  return client;
}

export async function generateChatCompletion({
  systemPrompt,
  userPrompt,
}) {
  const openai = getClient();

  const response = await openai.chat.completions.create({
    model: env.groqModel,
    temperature: 0.1,
    max_tokens: 3500,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

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
