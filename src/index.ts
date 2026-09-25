import { createApp } from './app';
import { config } from './config';
import { pool } from './db';

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`Server running at http://localhost:${config.PORT} (${config.NODE_ENV})`);
});

// Docker and hosting platforms send SIGTERM before stopping the process.
// Stop accepting connections, let in-flight requests finish, close the
// database pool, then exit. Force-exit if that takes too long.
function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
