import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFound } from './middleware/error-handler';
import { healthRouter } from './routes/health';

// Builds the Express app without starting it. Tests import this directly
// and send requests to it without opening a port.
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(express.json());

  app.use('/health', healthRouter);

  // These two must come after every route.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
