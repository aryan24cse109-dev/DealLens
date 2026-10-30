
import { prisma } from '../config/database.js';
import { documentRepository } from '../repositories/document.repository.js';
import { compareContractText } from '../utils/contract-diff.js';

import {
  assessContractChange,
} from './impact-assessment.service.js';

import {
  generateImpactExplanation,
} from './impact-explanation.service.js';

import {
  impactAnalysisSchema,
} from '../validators/impact-analysis.schema.js';

import { normalizeText } from '../utils/text-normalizer.js';

export class ComparisonServiceError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'ComparisonServiceError';
    this.status = status;
  }
}

function getCategoryFromExplanation(explanation) {
  const match = explanation?.match(/^\[([A-Z_]+)\]/);
  return match?.[1] ?? 'GENERAL';
}

export const comparisonService = {
  async compareDocuments({
    originalDocumentId,
    revisedDocumentId,
  }, ownerId) {
    const originalDocument =
      await documentRepository.findById(originalDocumentId, ownerId);

    if (!originalDocument) {
      throw new ComparisonServiceError(
        'Original document not found.',
        404,
      );
    }

    const revisedDocument =
      await documentRepository.findById(revisedDocumentId, ownerId);

    if (!revisedDocument) {
      throw new ComparisonServiceError(
        'Revised document not found.',
        404,
      );
    }

    if (originalDocument.id === revisedDocument.id) {
      throw new ComparisonServiceError(
        'Original and revised documents must be different.',
        400,
      );
    }

    if (originalDocument.dealId !== revisedDocument.dealId) {
      throw new ComparisonServiceError(
        'Both documents must belong to the same deal.',
        400,
      );
    }

    if (originalDocument.type !== 'ORIGINAL') {
      throw new ComparisonServiceError(
        'The original document must have type ORIGINAL.',
        400,
      );
    }

    if (revisedDocument.type !== 'REVISED') {
      throw new ComparisonServiceError(
        'The revised document must have type REVISED.',
        400,
      );
    }

    if (
      typeof originalDocument.extractedText !== 'string' ||
      !originalDocument.extractedText.trim()
    ) {
      throw new ComparisonServiceError(
        'The original document has no extracted text.',
        422,
      );
    }

    if (
      typeof revisedDocument.extractedText !== 'string' ||
      !revisedDocument.extractedText.trim()
    ) {
      throw new ComparisonServiceError(
        'The revised document has no extracted text.',
        422,
      );
    }

    let diff;

    try {
      diff = compareContractText(
        originalDocument.extractedText,
        revisedDocument.extractedText,
      );
    } catch (error) {
      if (
        error.message.includes('comparison limit') ||
        error.message.includes('too large')
      ) {
        throw new ComparisonServiceError(error.message, 413);
      }

      throw error;
    }

    const originalNormalized = normalizeText(originalDocument.extractedText);
const revisedNormalized = normalizeText(revisedDocument.extractedText);

console.log('========== TEXT COMPARISON DEBUG ==========');

console.log(
  'Raw text identical:',
  originalDocument.extractedText === revisedDocument.extractedText
);

console.log(
  'Normalized text identical:',
  originalNormalized === revisedNormalized
);

console.log(
  'Original normalized lines:',
  originalNormalized.split('\n').length
);

console.log(
  'Revised normalized lines:',
  revisedNormalized.split('\n').length
);

console.log('===========================================');

        // Temporary debugging logs
    console.log('========== COMPARISON DEBUG ==========');

    console.log(
      'Original document:',
      originalDocument.id,
      originalDocument.type,
    );

    console.log(
      'Revised document:',
      revisedDocument.id,
      revisedDocument.type,
    );

    console.log(
      'Original text length:',
      originalDocument.extractedText.length,
    );

    console.log(
      'Revised text length:',
      revisedDocument.extractedText.length,
    );

    console.log('Diff summary:', diff.summary);
    console.log('Detected changes:', diff.changes.length);

    console.log('======================================');

    // Analyze only changes detected by the deterministic diff engine.
    const analyzedChanges = diff.changes.map((change) => {
      const assessment = assessContractChange(change);

      // Validate every generated assessment before saving it.
      const validatedAssessment = impactAnalysisSchema.parse({
        ...assessment,
        explanation: generateImpactExplanation(
          change,
          assessment,
        ),
      });

      return {
        // Keep the existing API's change type compatible:
        // ADDED, REMOVED, or MODIFIED.
        category: change.type,

        field: validatedAssessment.category,

        oldValue: change.originalText ?? null,
        newValue: change.revisedText ?? null,

        explanation: validatedAssessment.explanation,
        severity: validatedAssessment.severity,
      };
    });

    const analysis = await prisma.analysis.create({
      data: {
        dealId: originalDocument.dealId,
        status: 'COMPLETED',
        summary: JSON.stringify({
          ...diff.summary,
          impactAssessments: analyzedChanges.length,
        }),
        changes: {
          create: analyzedChanges,
        },
      },
      include: {
        changes: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return {
      analysisId: analysis.id,
      dealId: analysis.dealId,
      status: analysis.status,

      originalDocument: {
        id: originalDocument.id,
        name: originalDocument.originalName,
        type: originalDocument.type,
      },

      revisedDocument: {
        id: revisedDocument.id,
        name: revisedDocument.originalName,
        type: revisedDocument.type,
      },

      summary: {
        ...diff.summary,
        impactAssessments: analyzedChanges.length,
      },

      changes: analysis.changes.map((change) => ({
        id: change.id,

        // Preserve the existing change type.
        type: change.category,

        // Store the impact category in the existing `field` column.
        category: change.field ?? 'GENERAL',

        originalText: change.oldValue,
        revisedText: change.newValue,
        explanation: change.explanation,
        severity: change.severity,
      })),

      createdAt: analysis.createdAt,
    };
  },
};
