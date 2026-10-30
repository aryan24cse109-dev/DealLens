import { env } from '../config/env.js';
import { findSessionUser } from '../services/auth.service.js';

function getCookie(req, name) {
  const header = req.get('cookie') || '';
  const value = header
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  if (!value) return null;
  try {
    return decodeURIComponent(value.slice(name.length + 1));
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  try {
    const user = await findSessionUser(getCookie(req, env.sessionCookieName));
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export { getCookie };
