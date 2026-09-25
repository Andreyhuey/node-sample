import { createApp } from './app';
import { config } from './config';

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`Server running at http://localhost:${config.PORT} (${config.NODE_ENV})`);
});

// Hosting platforms send SIGTERM before stopping the process. Finish
// in-flight requests, then exit.
function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
