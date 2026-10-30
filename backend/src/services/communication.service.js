import { prisma } from '../config/database.js';
import { requestCommunicationGeneration } from './ai.service.js';
import { env } from '../config/env.js';
import { splitChangesByTokenBudget } from '../utils/batch.js';
import { randomUUID } from 'node:crypto';

export class CommunicationServiceError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'CommunicationServiceError';
    this.status = status;
  }
}

async function loadAnalysis(analysisId, ownerId) {
  const analysis = await prisma.analysis.findFirst({
    where: { id: analysisId, deal: { ownerId } },
    include: {
      deal: { select: { id: true, name: true } },
      changes: { orderBy: { createdAt: 'asc' } },
      aiAssessments: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!analysis) throw new CommunicationServiceError('Analysis not found.', 404);
  if (!analysis.changes.length) {
    throw new CommunicationServiceError(
      'This analysis has no changes for communication context.',
      422,
    );
  }
  if (analysis.aiAssessments.length !== analysis.changes.length) {
    throw new CommunicationServiceError(
      'Run AI impact analysis before generating communication.',
      422,
    );
  }
  const changeIds = new Set(analysis.changes.map((change) => change.id));
  const assessmentIds = analysis.aiAssessments.map(
    (assessment) => assessment.changeId,
  );
  const uniqueAssessmentIds = new Set(assessmentIds);
  if (
    uniqueAssessmentIds.size !== assessmentIds.length
    || uniqueAssessmentIds.size !== changeIds.size
    ||
    analysis.aiAssessments.some(
      (assessment) => !changeIds.has(assessment.changeId),
    )
    || analysis.changes.some((change) => !uniqueAssessmentIds.has(change.id))
  ) {
    throw new CommunicationServiceError(
      'Analysis AI assessments do not match its changes.',
      422,
    );
  }
  return analysis;
}

function compactText(value, limit = 16) {
  if (value === null || value === undefined) return null;
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 15)}...[truncated]`;
}

export const communicationService = {
  async createDraft(ownerId, analysisId, input) {
    const operationId = randomUUID();
    console.info('[communication.started]', { operationId, analysisId });
    const communicationType = 'CLIENT_NOTIFICATION';
    const channel = 'EMAIL';
    const analysis = await loadAnalysis(analysisId, ownerId);
    const assessmentsByChangeId = new Map(
      analysis.aiAssessments.map((assessment) => [
        assessment.changeId,
        assessment,
      ]),
    );
    let summary = {};
    if (analysis.summary) {
      try {
        summary = JSON.parse(analysis.summary);
      } catch {
        throw new CommunicationServiceError(
          'Analysis summary is invalid.',
          500,
        );
      }
    }

    const changes = analysis.changes.map((change) => ({
      id: change.id,
      type: change.category,
      category: change.field ?? 'GENERAL',
      oldValue: null,
      newValue: null,
      explanation: 'See report.',
      severity: change.severity,
    }));
    const batches = splitChangesByTokenBudget(changes, {
      maxChanges: Math.min(env.aiSafeBatchSize ?? 5, 5),
      maxPromptTokens: Math.min(env.aiMaxPromptTokens ?? 1200, 900),
    });
    const generatedParts = [];
    try {
      for (const [index, batch] of batches.entries()) {
      const batchIds = new Set(batch.map((change) => change.id));
        const result = await requestCommunicationGeneration({
        communicationType,
        channel,
        instructions: input.additionalInstructions,
        analysis: {
          dealName: analysis.deal.name,
          summary,
          changes: batch,
          assessments: batch.map((change) => {
            const assessment = assessmentsByChangeId.get(change.id);
            return {
              changeId: assessment.changeId,
              category: assessment.category,
              impact: compactText(assessment.impact),
              explanation: 'See report.',
              suggestedAction: compactText(assessment.suggestedAction),
              severity: assessment.severity,
              confidence: assessment.confidence,
            };
          }),
        },
        maxOutputTokens: Number.isInteger(env.aiCommunicationMaxOutputTokens)
          ? Math.min(env.aiCommunicationMaxOutputTokens, 2200)
          : 1500,
      });
        if (!result.content || !batch.every((change) => batchIds.has(change.id))) {
          throw new CommunicationServiceError(
            'AI service returned an incomplete communication section.',
            502,
          );
        }
        generatedParts.push(result);
        console.info('[communication.batch.completed]', {
          operationId,
          analysisId,
          batch: `${index + 1}/${batches.length}`,
        });
      }
    } catch (error) {
      console.error('[communication.failed]', {
        operationId,
        analysisId,
        status: error.status || 502,
      });
      throw error;
    }

    const result = {
      ...generatedParts[0],
      content: generatedParts.map((part) => part.content).join('\n\n'),
      communicationType,
      channel,
    };

    const draft = await prisma.communicationDraft.create({
      data: {
        analysisId,
        communicationType,
        channel,
        subject: result.subject,
        content: result.content,
      },
    });
    console.info('[communication.completed]', {
      operationId,
      analysisId,
      draftId: draft.id,
    });
    return draft;
  },

  async listDrafts(ownerId, analysisId) {
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, deal: { ownerId } },
      select: { id: true },
    });
    if (!analysis) throw new CommunicationServiceError('Analysis not found.', 404);
    return prisma.communicationDraft.findMany({
      where: { analysisId, analysis: { deal: { ownerId } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getDraft(ownerId, id) {
    const draft = await prisma.communicationDraft.findFirst({
      where: { id, analysis: { deal: { ownerId } } },
    });
    if (!draft) {
      throw new CommunicationServiceError('Communication draft not found.', 404);
    }
    return draft;
  },

  async updateDraft(ownerId, id, input) {
    await this.getDraft(ownerId, id);
    const result = await prisma.communicationDraft.updateMany({
      where: { id, analysis: { deal: { ownerId } } },
      data: input,
    });
    if (!result.count) {
      throw new CommunicationServiceError('Communication draft not found.', 404);
    }
    return this.getDraft(ownerId, id);
  },

  async deleteDraft(ownerId, id) {
    await this.getDraft(ownerId, id);
    const result = await prisma.communicationDraft.deleteMany({
      where: { id, analysis: { deal: { ownerId } } },
    });
    if (!result.count) {
      throw new CommunicationServiceError('Communication draft not found.', 404);
    }
    return { id, deleted: true };
  },
};
