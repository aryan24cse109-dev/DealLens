import {
  communicationRequestSchema,
  communicationResponseSchema,
} from '../schemas/communication.schema.js';
import { COMMUNICATION_SYSTEM_PROMPT } from '../prompts/communication.prompt.js';
import { generateChatCompletion } from './nebius.service.js';

export async function generateCommunication(input) {
  const parsedInput = communicationRequestSchema.parse(input);
  const generated = await generateChatCompletion({
    systemPrompt: COMMUNICATION_SYSTEM_PROMPT,
    userPrompt: [
      'Draft the requested communication from this verified context.',
      JSON.stringify(parsedInput),
    ].join('\n\n'),
  });

  let parsedOutput;
  try {
    parsedOutput = JSON.parse(generated.content);
  } catch {
    throw new Error('AI returned invalid communication JSON.');
  }

  const result = communicationResponseSchema.parse(parsedOutput);
  if (
    result.communicationType !== parsedInput.communicationType ||
    result.channel !== parsedInput.channel
  ) {
    throw new Error('AI returned mismatched communication metadata.');
  }

  return { ...result, model: generated.model, usage: generated.usage };
}
