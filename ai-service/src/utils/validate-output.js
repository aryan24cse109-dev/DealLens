
import {
  aiImpactResponseSchema,
} from '../schemas/impact.schema.js';

export function parseJsonObject(rawContent) {
  if (typeof rawContent !== 'string') {
    throw new Error('AI returned invalid JSON.');
  }

  const trimmed = rawContent.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const firstObject = withoutFence.indexOf('{');
    const lastObject = withoutFence.lastIndexOf('}');
    if (firstObject < 0 || lastObject <= firstObject) {
      throw new Error('AI returned invalid JSON.');
    }

    try {
      return JSON.parse(withoutFence.slice(firstObject, lastObject + 1));
    } catch {
      throw new Error(
        'AI returned invalid or truncated JSON.',
      );
    }
  }
}

export function parseAndValidateImpactOutput(
  rawContent,
  expectedChangeIds,
) {
  const parsed = parseJsonObject(rawContent);

  const result = aiImpactResponseSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      'AI response did not match the required schema.',
    );
  }

  const assessments = result.data.assessments;
  const expected = new Set(expectedChangeIds);
  const actual = new Set(
    assessments.map((item) => item.changeId),
  );

  if (
    assessments.length !== expected.size ||
    actual.size !== expected.size ||
    [...expected].some((id) => !actual.has(id))
  ) {
    throw new Error(
      'AI response is missing changes, contains duplicates, or includes unknown change IDs.',
    );
  }

  return result.data;
}
