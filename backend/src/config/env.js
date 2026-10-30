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
};

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is missing. Check your environment configuration.');
}
