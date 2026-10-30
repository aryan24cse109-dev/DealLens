import { z } from 'zod';

export const communicationTypeSchema = z.enum([
  'CLIENT_NOTIFICATION',
  'INTERNAL_LEGAL_REVIEW',
  'HIGH_SEVERITY_ESCALATION',
  'CONTRACT_CLARIFICATION_REQUEST',
  'NEGOTIATION_MESSAGE',
]);

export const communicationChannelSchema = z.enum([
  'EMAIL',
  'INTERNAL_NOTE',
  'MESSAGE',
]);

const assessmentSchema = z.object({
  changeId: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(100),
  impact: z.string().trim().min(1).max(2000),
  explanation: z.string().trim().min(1).max(2000),
  suggestedAction: z.string().trim().min(1).max(1000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  confidence: z.number().min(0).max(1),
});

const changeSchema = z.object({
  id: z.string().trim().min(1).max(100),
  type: z.enum(['ADDED', 'REMOVED', 'MODIFIED']),
  category: z.string().trim().min(1).max(100),
  oldValue: z.string().max(10000).nullable(),
  newValue: z.string().max(10000).nullable(),
  explanation: z.string().max(2000).nullable(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});

export const communicationRequestSchema = z.object({
  communicationType: communicationTypeSchema,
  channel: communicationChannelSchema,
  analysis: z.object({
    dealName: z.string().trim().min(1).max(200),
    summary: z.record(z.string(), z.unknown()),
    changes: z.array(changeSchema).min(1).max(100),
    assessments: z.array(assessmentSchema).min(1).max(100),
  }).strict(),
  instructions: z.string().trim().max(2000).optional().default(''),
}).strict();

export const communicationResponseSchema = z.object({
  subject: z.string().trim().min(1).max(300).nullable(),
  content: z.string().trim().min(1).max(10000),
  communicationType: communicationTypeSchema,
  channel: communicationChannelSchema,
}).strict();
