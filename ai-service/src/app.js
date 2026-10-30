
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import aiRoutes from './routes/ai.routes.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'deallens-ai-service' });
});

app.use('/api/v1/ai', aiRoutes);

app.use((err, _req, res, _next) => {
  console.error('[AI service error]', {
    status: err.status || 502,
    message: err.message,
    providerType: err.providerType || null,
    providerCode: err.providerCode || null,
    providerMessage: err.providerMessage || null,
    retryAfterMs: err.retryAfterMs || null,
    model: err.providerModel || null,
    endpoint: err.providerEndpoint || null,
  });

  const status =
    Number.isInteger(err.status) && err.status >= 400 && err.status < 600
      ? err.status
      : 502;
  if (err.retryAfterMs) {
    res.setHeader('Retry-After', Math.ceil(err.retryAfterMs / 1000));
  }

  res.status(status).json({
    error: status === 502
      ? 'AI service could not complete the request.'
      : err.message,
  });
});

export default app;
