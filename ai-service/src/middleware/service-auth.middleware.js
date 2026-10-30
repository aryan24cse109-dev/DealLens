
import { env } from '../config/env.js';

export function requireServiceAuth(req, res, next) {
  if (!env.aiServiceApiKey) {
    return res.status(503).json({
      error: 'AI service authentication is not configured.',
    });
  }

  const authorization = req.get('authorization') || '';
  const [scheme, ...tokenParts] = authorization.split(' ');
  const token = tokenParts.join(' ');

  if (
    scheme?.toLowerCase() !== 'bearer' ||
    !token ||
    token.length !== env.aiServiceApiKey.length ||
    !safeCompare(token, env.aiServiceApiKey)
  ) {
    return res.status(401).json({
      error: 'Unauthorized service request.',
    });
  }

  return next();
}

function safeCompare(a, b) {
  let difference = 0;

  for (let i = 0; i < a.length; i += 1) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return difference === 0;
}
