
import { z } from 'zod';

const explanationInputSchema = z.object({
  type: z.enum(['ADDED', 'REMOVED', 'MODIFIED']),
  originalText: z.string().nullable().optional(),
  revisedText: z.string().nullable().optional(),
});

const assessmentInputSchema = z.object({
  category: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  impact: z.string().trim().min(1).max(2000),
});

export function generateImpactExplanation(change, assessment) {
  const validatedChange = explanationInputSchema.parse(change);
  const validatedAssessment = assessmentInputSchema.parse(assessment);

  const originalText = validatedChange.originalText?.trim();
  const revisedText = validatedChange.revisedText?.trim();

  let difference;

  if (validatedChange.type === 'ADDED') {
    difference = `Added provision: "${revisedText}".`;
  } else if (validatedChange.type === 'REMOVED') {
    difference = `Removed provision: "${originalText}".`;
  } else {
    difference =
      `Original wording: "${originalText}". ` +
      `Revised wording: "${revisedText}".`;
  }

  return [
    `[${validatedAssessment.category}]`,
    difference,
    validatedAssessment.impact,
    `Initial severity assessment: ${validatedAssessment.severity}.`,
    'Verify the surrounding clauses and business context before acting.',
  ].join(' ');
}
