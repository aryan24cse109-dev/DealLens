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

export const createCommunicationSchema = z.object({
  additionalInstructions: z.string().trim().max(2000).optional().default(''),
}).strict();

export const updateCommunicationSchema = z
  .object({
    subject: z.string().trim().max(300).nullable().optional(),
    content: z.string().trim().min(1).max(10000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide a subject or content to update.',
  });

export const communicationResponseSchema = z.object({
  subject: z.string().trim().min(1).max(300).nullable(),
  content: z.string().trim().min(1).max(10000),
  communicationType: communicationTypeSchema,
  channel: communicationChannelSchema,
  model: z.string().trim().min(1).max(200).optional(),
  usage: z.object({
    promptTokens: z.number().int().nonnegative().optional(),
    completionTokens: z.number().int().nonnegative().optional(),
    totalTokens: z.number().int().nonnegative().optional(),
  }).strict().optional(),
}).strict();
