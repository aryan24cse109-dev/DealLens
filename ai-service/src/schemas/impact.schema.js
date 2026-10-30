
import { z } from 'zod';

export const verifiedChangeSchema = z.object({
  id: z.string().trim().min(1).max(100),

  type: z.enum([
    'ADDED',
    'REMOVED',
    'MODIFIED',
  ]),

  category: z.string().trim().min(1).max(100).optional(),

  originalText: z.string().max(10000).nullable().optional(),
  revisedText: z.string().max(10000).nullable().optional(),

  ruleBasedSeverity: z.enum([
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL',
  ]).optional(),
});

export const impactAnalysisRequestSchema = z.object({
  changes: z.array(verifiedChangeSchema).min(1).max(50),
  maxOutputTokens: z.number().int().min(256).max(3500).optional(),
}).strict();

export const aiImpactItemSchema = z.object({
  changeId: z.string().min(1),

  category: z.enum([
    'PAYMENT_TERMS',
    'LIABILITY',
    'TERMINATION',
    'CONTRACT_TERM',
    'SCOPE_OF_WORK',
    'CONFIDENTIALITY',
    'SERVICE_LEVEL',
    'GENERAL',
  ]),

  impact: z.string().trim().min(1).max(1500),
  explanation: z.string().trim().min(1).max(1500),
  suggestedAction: z.string().trim().min(1).max(1000),

  severity: z.enum([
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL',
  ]),

  confidence: z.number().min(0).max(1),
});

export const aiImpactResponseSchema = z.object({
  assessments: z.array(aiImpactItemSchema),
}).strict();
