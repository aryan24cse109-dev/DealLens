import dotenv from 'dotenv';

dotenv.config();

export const env = {
  aiServiceApiKey: process.env.AI_SERVICE_API_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || process.env.BACKEND_PORT || 5000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:5001',
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 15),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  reportDir: process.env.REPORT_DIR || 'generated-reports',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL
    || 'http://localhost:5000/api/v1/auth/google/callback',
  googleSuccessRedirect: process.env.GOOGLE_SUCCESS_REDIRECT || process.env.FRONTEND_URL || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET || '',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'deallens_session',
  sessionMaxAgeMs: Number(process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 7),
  sessionCookieSecure: process.env.SESSION_COOKIE_SECURE === 'true',
  sessionCookieSameSite: process.env.SESSION_COOKIE_SAMESITE || 'lax',
};

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is missing. Check your environment configuration.');
}
