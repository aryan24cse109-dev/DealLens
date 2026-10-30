import { env } from '../config/env.js';
import {
  AuthServiceError,
  completeGoogleLogin,
  deleteSession,
  getOAuthAuthorizationUrl,
} from '../services/auth.service.js';
import { getCookie } from '../middleware/auth.middleware.js';

function cookieOptions(maxAge) {
  return [
    `${env.sessionCookieName}=`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${Math.floor(maxAge / 1000)}`,
    `SameSite=${env.sessionCookieSameSite}`,
    env.sessionCookieSecure ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

function clearOAuthTransactionCookie() {
  return `deallens_oauth_transaction=; Path=/api/v1/auth; HttpOnly; Max-Age=0; SameSite=Lax${env.sessionCookieSecure ? '; Secure' : ''}`;
}

export const authController = {
  async startGoogle(req, res, next) {
    try {
      const { url, transactionToken } = await getOAuthAuthorizationUrl();
      res.setHeader(
        'Set-Cookie',
        `deallens_oauth_transaction=${encodeURIComponent(transactionToken)}; Path=/api/v1/auth; HttpOnly; Max-Age=600; SameSite=Lax${env.sessionCookieSecure ? '; Secure' : ''}`,
      );
      return res.redirect(url);
    } catch (error) {
      return next(error);
    }
  },

  async googleCallback(req, res, next) {
    try {
      const transactionToken = getCookie(req, 'deallens_oauth_transaction');
      const rawToken = await completeGoogleLogin({
        code: req.query.code,
        state: req.query.state,
        transactionToken,
      });
      res.setHeader('Set-Cookie', [
        clearOAuthTransactionCookie(),
        cookieOptions(0),
        `${env.sessionCookieName}=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; Max-Age=${Math.floor(env.sessionMaxAgeMs / 1000)}; SameSite=${env.sessionCookieSameSite}${env.sessionCookieSecure ? '; Secure' : ''}`,
      ]);
      return res.redirect(env.googleSuccessRedirect);
    } catch (error) {
      res.setHeader('Set-Cookie', clearOAuthTransactionCookie());
      return next(error);
    }
  },

  async me(req, res) {
    return res.status(200).json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        avatarUrl: req.user.avatarUrl,
        emailVerified: req.user.emailVerified,
      },
    });
  },

  async logout(req, res, next) {
    try {
      await deleteSession(getCookie(req, env.sessionCookieName));
      res.setHeader('Set-Cookie', cookieOptions(0));
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  },
};

export function authErrorHandler(error, req, res, next) {
  if (error instanceof AuthServiceError) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  return next(error);
}
