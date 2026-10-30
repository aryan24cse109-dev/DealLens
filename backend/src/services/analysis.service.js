
import { prisma } from '../config/database.js';
import { requestImpactAnalysis } from './ai.service.js';
import {
  aiImpactAssessmentListSchema,
} from '../validators/impact-analysis.schema.js';
import { env } from '../config/env.js';
import { splitChangesByTokenBudget } from '../utils/batch.js';
import { randomUUID } from 'node:crypto';

export class AnalysisServiceError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'AnalysisServiceError';
    this.status = status;
  }
}

const activeImpactRuns = new Map();

export const analysisService = {
  async getAnalysis(analysisId, ownerId) {
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, deal: { ownerId } },
      include: {
        deal: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            createdAt: true,
            documents: {
                orderBy: { createdAt: 'asc' },
                select: {
                  id: true,
                  type: true,
                  originalName: true,
                  mimeType: true,
                  sizeBytes: true,
                  createdAt: true,
                },
            },
          },
        },
        changes: { orderBy: { createdAt: 'asc' } },
        aiAssessments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!analysis) {
      throw new AnalysisServiceError('Analysis not found.', 404);
    }

    return analysis;
  },

  async runAiImpact(analysisId, ownerId) {
    const key = `${ownerId}:${analysisId}`;
    const activeRun = activeImpactRuns.get(key);
    if (activeRun) return activeRun;

    const run = this._runAiImpact(analysisId, ownerId);
    activeImpactRuns.set(key, run);
    try {
      return await run;
    } catch (error) {
      console.error('[analysis.failed]', {
        analysisId,
        status: error.status || 502,
      });
      throw error;
    } finally {
      if (activeImpactRuns.get(key) === run) activeImpactRuns.delete(key);
    }
  },

  async _runAiImpact(analysisId, ownerId) {
    const operationId = randomUUID();
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

    const configuredSafeBatchSize = Number.isInteger(env.aiSafeBatchSize)
      && env.aiSafeBatchSize > 0
      ? env.aiSafeBatchSize
      : 10;
    const batchSize = Number.isInteger(env.aiMaxChangesPerRequest)
      && env.aiMaxChangesPerRequest > 0
      ? Math.min(env.aiMaxChangesPerRequest, configuredSafeBatchSize, 50)
      : Math.min(configuredSafeBatchSize, 50);
    const results = [];
    const batches = splitChangesByTokenBudget(changes, {
      maxChanges: batchSize,
      maxPromptTokens: Number.isInteger(env.aiMaxPromptTokens)
        && env.aiMaxPromptTokens > 0
        ? env.aiMaxPromptTokens
        : 1800,
    });
    console.info('[analysis.started]', {
      operationId,
      analysisId,
      totalChanges: changes.length,
      totalBatches: batches.length,
    });
    for (const [index, batch] of batches.entries()) {
      const batchStartedAt = Date.now();
      console.info('[analysis.batch.started]', {
        operationId,
        analysisId,
        batch: `${index + 1}/${batches.length}`,
        changes: batch.length,
      });
      try {
        const result = await requestImpactAnalysis(batch, {
          maxOutputTokens: Number.isInteger(env.aiMaxOutputTokens)
            && env.aiMaxOutputTokens > 0
            ? Math.min(env.aiMaxOutputTokens, 3500)
            : 2200,
        }, {
          operationId,
          batch: `${index + 1}/${batches.length}`,
        });
        results.push(result);
        console.info('[analysis.batch.completed]', {
          operationId,
          analysisId,
          batch: `${index + 1}/${batches.length}`,
          durationMs: Date.now() - batchStartedAt,
        });
      } catch (error) {
        console.error('[analysis.batch.failed]', {
          operationId,
          analysisId,
          batch: `${index + 1}/${batches.length}`,
          durationMs: Date.now() - batchStartedAt,
          status: error.status || 502,
        });
        const contextualError = new AnalysisServiceError(
          `AI impact batch ${index + 1}/${batches.length} failed `
          + `(operation ${operationId}): ${error.message}`,
          error.status || 502,
        );
        contextualError.cause = error;
        throw contextualError;
      }
    }

    const assessments = aiImpactAssessmentListSchema.parse(
      results.flatMap((result) => result.assessments),
    );
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
          model: results[0]?.model ?? null,
        })),
      });

      return transaction.aiAssessment.findMany({
        where: { analysisId: analysis.id },
        orderBy: { createdAt: 'asc' },
      });
    });

    console.info('[analysis.completed]', {
      operationId,
      analysisId,
      totalBatches: batches.length,
      assessmentCount: persistedAssessments.length,
    });
    return {
      analysisId: analysis.id,
      dealId: analysis.dealId,
      model: results[0]?.model ?? null,
      usage: results.map((result) => result.usage).filter(Boolean),
      assessments: persistedAssessments,
    };
  },
};
