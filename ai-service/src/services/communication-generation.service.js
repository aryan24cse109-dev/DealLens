import {
  communicationRequestSchema,
  communicationResponseSchema,
  generatedCommunicationSchema,
} from '../schemas/communication.schema.js';
import { COMMUNICATION_SYSTEM_PROMPT } from '../prompts/communication.prompt.js';
import { generateChatCompletion } from './nebius.service.js';
import { parseJsonObject } from '../utils/validate-output.js';

export function normalizeGeneratedCommunication(parsedOutput, request) {
  const generatedContent = generatedCommunicationSchema.parse(parsedOutput);
  const hasMismatchedMetadata = (
    (generatedContent.communicationType
      && generatedContent.communicationType !== request.communicationType)
    || (generatedContent.channel
      && generatedContent.channel !== request.channel)
  );
  if (hasMismatchedMetadata) {
    console.warn(
      'Ignoring model-supplied communication metadata; request metadata is authoritative.',
    );
  }
  return communicationResponseSchema.parse({
    subject: generatedContent.subject,
    content: generatedContent.content,
    communicationType: request.communicationType,
    channel: request.channel,
  });
}

export async function generateCommunication(input) {
  const parsedInput = communicationRequestSchema.parse(input);
  const generated = await generateChatCompletion({
    systemPrompt: COMMUNICATION_SYSTEM_PROMPT,
    userPrompt: [
      'Draft the requested communication from this verified context.',
      'Every change and assessment is included. Some long text fields may be marked [truncated].',
      JSON.stringify(parsedInput),
    ].join('\n\n'),
    maxOutputTokens: parsedInput.maxOutputTokens,
  });

  let parsedOutput;
  try {
    parsedOutput = parseJsonObject(generated.content);
  } catch {
    throw new Error('AI returned invalid communication JSON.');
  }

  const result = normalizeGeneratedCommunication(parsedOutput, parsedInput);

  return { ...result, model: generated.model, usage: generated.usage };
}
