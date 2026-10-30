
import { z } from 'zod';

export const impactCategorySchema = z.enum([
  'PAYMENT_TERMS',
  'LIABILITY',
  'TERMINATION',
  'CONTRACT_TERM',
  'SCOPE_OF_WORK',
  'CONFIDENTIALITY',
  'SERVICE_LEVEL',
  'GENERAL',
]);

export const impactSeveritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);

export const impactAnalysisSchema = z.object({
  category: impactCategorySchema,
  severity: impactSeveritySchema,
  impact: z.string().trim().min(1).max(2000),
  explanation: z.string().trim().min(1).max(2000),
  confidence: z.number().min(0).max(1),
});

export const impactAnalysisListSchema = z.array(
  impactAnalysisSchema
);

export const aiImpactAssessmentSchema = z.object({
  changeId: z.string().trim().min(1).max(100),
  category: impactCategorySchema,
  severity: impactSeveritySchema,
  impact: z.string().trim().min(1).max(2000),
  explanation: z.string().trim().min(1).max(2000),
  suggestedAction: z.string().trim().min(1).max(1000),
  confidence: z.number().min(0).max(1),
});

export const aiImpactAssessmentListSchema = z.array(
  aiImpactAssessmentSchema
);
