import { env } from '../config/env.js';

export function requireSameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin && origin !== env.frontendUrl) {
    return res.status(403).json({
      success: false,
      message: 'Cross-site request rejected.',
    });
  }
  return next();
}
