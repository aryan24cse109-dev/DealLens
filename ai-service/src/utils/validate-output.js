
import {
  aiImpactResponseSchema,
} from '../schemas/impact.schema.js';

export function parseAndValidateImpactOutput(
  rawContent,
  expectedChangeIds,
) {
  let parsed;

  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error('AI returned invalid JSON.');
  }

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
