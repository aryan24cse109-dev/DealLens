import { analyzeVerifiedChanges } from '../services/impact-analysis.service.js';
import { generateCommunication } from '../services/communication-generation.service.js';

export async function runImpactAnalysis(req, res, next) {
  try {
    const result = await analyzeVerifiedChanges(req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Invalid impact-analysis request.',
        details: error.issues?.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return next(error);
  }
}

export async function runCommunicationGeneration(req, res, next) {
  try {
    const result = await generateCommunication(req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (
      error.name === 'ZodError' ||
      error.message === 'AI returned invalid communication JSON.'
    ) {
      return res.status(400).json({
        error: 'Invalid communication-generation request or response.',
        details: error.issues?.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return next(error);
  }
}
