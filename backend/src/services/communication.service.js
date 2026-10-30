import { prisma } from '../config/database.js';
import { requestCommunicationGeneration } from './ai.service.js';

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
  if (
    analysis.aiAssessments.some(
      (assessment) => !changeIds.has(assessment.changeId),
    )
  ) {
    throw new CommunicationServiceError(
      'Analysis AI assessments do not match its changes.',
      422,
    );
  }
  return analysis;
}

export const communicationService = {
  async createDraft(ownerId, analysisId, input) {
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

    const result = await requestCommunicationGeneration({
      communicationType: input.communicationType,
      channel: input.channel,
      instructions: input.instructions,
      analysis: {
        dealName: analysis.deal.name,
        summary,
        changes: analysis.changes.map((change) => ({
          id: change.id,
          type: change.category,
          category: change.field ?? 'GENERAL',
          oldValue: change.oldValue,
          newValue: change.newValue,
          explanation: change.explanation,
          severity: change.severity,
        })),
        assessments: analysis.changes.map((change) => {
          const assessment = assessmentsByChangeId.get(change.id);
          return {
            changeId: assessment.changeId,
            category: assessment.category,
            impact: assessment.impact,
            explanation: assessment.explanation,
            suggestedAction: assessment.suggestedAction,
            severity: assessment.severity,
            confidence: assessment.confidence,
          };
        }),
      },
    });

    return prisma.communicationDraft.create({
      data: {
        analysisId,
        communicationType: result.communicationType,
        channel: result.channel,
        subject: result.subject,
        content: result.content,
      },
    });
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
