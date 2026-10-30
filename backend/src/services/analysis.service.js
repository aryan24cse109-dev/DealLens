
import { prisma } from '../config/database.js';
import { requestImpactAnalysis } from './ai.service.js';
import {
  aiImpactAssessmentListSchema,
} from '../validators/impact-analysis.schema.js';

export class AnalysisServiceError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'AnalysisServiceError';
    this.status = status;
  }
}

export const analysisService = {
  async runAiImpact(analysisId, ownerId) {
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, deal: { ownerId } },
      include: {
        changes: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!analysis) {
      throw new AnalysisServiceError('Analysis not found.', 404);
    }

    if (!analysis.changes.length) {
      throw new AnalysisServiceError(
        'This analysis has no changes to assess.',
        422
      );
    }

    const changes = analysis.changes.map((change) => ({
      id: change.id,
      type: change.category,
      originalText: change.oldValue,
      revisedText: change.newValue,
      ruleBasedSeverity: change.severity,
    }));

    const result = await requestImpactAnalysis(changes);
    const assessments = aiImpactAssessmentListSchema.parse(result.assessments);
    const expectedChangeIds = new Set(changes.map((change) => change.id));
    const returnedChangeIds = new Set(
      assessments.map((assessment) => assessment.changeId),
    );

    if (
      returnedChangeIds.size !== expectedChangeIds.size ||
      assessments.length !== expectedChangeIds.size ||
      [...expectedChangeIds].some((id) => !returnedChangeIds.has(id))
    ) {
      throw new AnalysisServiceError(
        'AI service returned an incomplete or invalid assessment set.',
        502,
      );
    }

    const persistedAssessments = await prisma.$transaction(async (transaction) => {
      await transaction.aiAssessment.deleteMany({
        where: { analysisId: analysis.id },
      });

      await transaction.aiAssessment.createMany({
        data: assessments.map((assessment) => ({
          analysisId: analysis.id,
          changeId: assessment.changeId,
          category: assessment.category,
          impact: assessment.impact,
          explanation: assessment.explanation,
          suggestedAction: assessment.suggestedAction,
          severity: assessment.severity,
          confidence: assessment.confidence,
          model: result.model ?? null,
        })),
      });

      return transaction.aiAssessment.findMany({
        where: { analysisId: analysis.id },
        orderBy: { createdAt: 'asc' },
      });
    });

    return {
      analysisId: analysis.id,
      dealId: analysis.dealId,
      model: result.model ?? null,
      usage: result.usage ?? null,
      assessments: persistedAssessments,
    };
  },
};
