
import app from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.port, () => {
  console.log(`DealLens AI service listening on port ${env.port}`);
});

function shutdown(signal) {
  console.log(`${signal} received. Shutting down AI service...`);

  server.close((error) => {
    if (error) {
      console.error('Shutdown failed:', error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
