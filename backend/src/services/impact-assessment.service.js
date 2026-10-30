
import {
  z,
} from 'zod';

import {
  impactAnalysisSchema,
} from '../validators/impact-analysis.schema.js';

import {
  classifyContractChange,
} from './clause-classifier.service.js';

const changeInputSchema = z.object({
  type: z.enum(['ADDED', 'REMOVED', 'MODIFIED']),
  originalText: z.string().nullable().optional(),
  revisedText: z.string().nullable().optional(),
});

const SEVERITY_RANK = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

function getCombinedText(change) {
  return [
    change.originalText ?? '',
    change.revisedText ?? '',
  ].join(' ').toLowerCase();
}

function assessSeverity(category, change) {
  const text = getCombinedText(change);

  if (
    category === 'LIABILITY' &&
    /\b(unlimited liability|uncapped liability|no liability cap)\b/.test(text)
  ) {
    return 'CRITICAL';
  }

  if (
    category === 'LIABILITY' ||
    category === 'TERMINATION'
  ) {
    return 'HIGH';
  }

  if (
    category === 'PAYMENT_TERMS' ||
    category === 'CONTRACT_TERM' ||
    category === 'SCOPE_OF_WORK'
  ) {
    return 'MEDIUM';
  }

  return change.type === 'MODIFIED' ? 'MEDIUM' : 'LOW';
}

function describeImpact(category, change) {
  const descriptions = {
    PAYMENT_TERMS:
      'Review cash flow, invoice timing, and payment obligations.',
    LIABILITY:
      'Review financial exposure, liability limits, and risk allocation.',
    TERMINATION:
      'Review termination rights, notice requirements, and cure periods.',
    CONTRACT_TERM:
      'Review contract duration, expiry dates, and renewal obligations.',
    SCOPE_OF_WORK:
      'Review service responsibilities, deliverables, and possible cost implications.',
    CONFIDENTIALITY:
      'Review information-protection obligations and permitted disclosures.',
    SERVICE_LEVEL:
      'Review service commitments, operational expectations, and potential remedies.',
    GENERAL:
      'Review this change to determine whether it affects business obligations.',
  };

  const action = {
    ADDED: 'A new provision was added.',
    REMOVED: 'An existing provision was removed.',
    MODIFIED: 'An existing provision was modified.',
  }[change.type];

  return `${action} ${descriptions[category]}`;
}

export function assessContractChange(input) {
  const change = changeInputSchema.parse(input);
  const category = classifyContractChange(change);
  const severity = assessSeverity(category, change);

  return impactAnalysisSchema.parse({
    category,
    severity,
    impact: describeImpact(category, change),
    explanation: 'Review the original and revised wording in context.',
    confidence: category === 'GENERAL' ? 0.5 : 0.75,
  });
}

export function getHigherSeverity(first, second) {
  if (!(first in SEVERITY_RANK) || !(second in SEVERITY_RANK)) {
    throw new TypeError('Unknown severity value.');
  }

  return SEVERITY_RANK[first] >= SEVERITY_RANK[second]
    ? first
    : second;
}
