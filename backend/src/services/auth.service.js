import {
  createHash,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const oauthClient = new OAuth2Client();

export class AuthServiceError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'AuthServiceError';
    this.status = status;
  }
}

function requireOAuthConfig() {
  if (
    !env.googleClientId
    || !env.googleClientSecret
    || env.sessionSecret.length < 32
    || (env.nodeEnv === 'production' && !env.sessionCookieSecure)
    || (env.sessionCookieSameSite === 'none' && !env.sessionCookieSecure)
  ) {
    throw new AuthServiceError('Google authentication is not configured.', 503);
  }
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function getOAuthAuthorizationUrl() {
  requireOAuthConfig();
  await prisma.oAuthTransaction.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  const state = randomBytes(32).toString('base64url');
  const transactionToken = randomBytes(32).toString('base64url');
  const codeVerifier = randomBytes(32).toString('base64url');
  const nonce = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.oAuthTransaction.create({
    data: {
      stateHash: hashToken(state),
      transactionHash: hashToken(transactionToken),
      codeVerifier,
      nonce,
      expiresAt,
    },
  });
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleCallbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });

  return {
    url: `${GOOGLE_AUTH_URL}?${params}`,
    transactionToken,
  };
}

async function postForm(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  if (!response.ok) {
    throw new AuthServiceError('Google authentication failed.', 502);
  }
  return response.json();
}

export function validateGoogleClaims(claims, expectedNonce, now = Date.now()) {
  const issuedAt = Number(claims?.iat);
  const expiresAt = Number(claims?.exp);
  const issuerValid = claims?.iss === 'https://accounts.google.com'
    || claims?.iss === 'accounts.google.com';
  const emailVerified = claims?.email_verified === true;
  if (
    !claims
    || !issuerValid
    || !Number.isFinite(issuedAt)
    || !Number.isFinite(expiresAt)
    || issuedAt * 1000 > now + 60_000
    || expiresAt * 1000 <= now
    || claims.nonce !== expectedNonce
  ) {
    throw new AuthServiceError('Google identity validation failed.', 401);
  }
  if (!claims.sub || !claims.email || !emailVerified) {
    throw new AuthServiceError('A verified Google email is required.', 403);
  }
  return claims;
}

async function verifyGoogleIdentity(idToken, expectedNonce) {
  let ticket;
  try {
    ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });
  } catch {
    throw new AuthServiceError('Google identity validation failed.', 401);
  }
  const claims = ticket.getPayload();
  return validateGoogleClaims(claims, expectedNonce);
}

export async function completeGoogleLogin({ code, state, transactionToken }) {
  requireOAuthConfig();
  if (!state || !transactionToken || !code) {
    throw new AuthServiceError('Invalid OAuth state.', 400);
  }
  let transaction;
  try {
    transaction = await prisma.oAuthTransaction.delete({
      where: { transactionHash: hashToken(transactionToken) },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new AuthServiceError('Invalid or expired OAuth state.', 400);
    }
    throw error;
  }
  if (
    transaction.stateHash !== hashToken(state)
    || transaction.expiresAt <= new Date()
  ) {
    throw new AuthServiceError('Invalid or expired OAuth state.', 400);
  }

  const tokens = await postForm(GOOGLE_TOKEN_URL, {
    code,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    redirect_uri: env.googleCallbackUrl,
    grant_type: 'authorization_code',
    code_verifier: transaction.codeVerifier,
  });
  if (!tokens.id_token) throw new AuthServiceError('Google did not return an identity token.', 502);

  const claims = await verifyGoogleIdentity(tokens.id_token, transaction.nonce);
  const user = await prisma.$transaction(async (transaction) => {
    const account = await transaction.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: claims.sub,
        },
      },
      select: { userId: true },
    });
    if (account) {
      return transaction.user.update({
        where: { id: account.userId },
        data: {
          email: claims.email,
          name: claims.name || null,
          avatarUrl: claims.picture || null,
          emailVerified: true,
        },
      });
    }

    const existingUser = await transaction.user.findUnique({
      where: { email: claims.email },
      select: { id: true },
    });
    if (existingUser) {
      throw new AuthServiceError(
        'This Google account requires explicit account linking.',
        409,
      );
    }
    const savedUser = await transaction.user.create({
      data: {
        email: claims.email,
        name: claims.name || null,
        avatarUrl: claims.picture || null,
        emailVerified: true,
      },
    });

    await transaction.oAuthAccount.create({
      data: {
        userId: savedUser.id,
        provider: 'google',
        providerAccountId: claims.sub,
      },
    });
    return savedUser;
  });

  return createSession(user.id);
}

export async function createSession(userId) {
  const rawToken = randomBytes(32).toString('base64url');
  await prisma.session.create({
    data: {
      id: randomUUID(),
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + env.sessionMaxAgeMs),
    },
  });
  return rawToken;
}

export async function findSessionUser(rawToken) {
  if (!rawToken) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  await prisma.session.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  });
  return session.user;
}

export async function deleteSession(rawToken) {
  if (!rawToken) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(rawToken) } });
}

export { hashToken };
