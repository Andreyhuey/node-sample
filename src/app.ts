import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler, notFound } from './middleware/error-handler';
import { authRouter } from './modules/auth/auth.routes';
import { appointmentsRouter } from './modules/appointments/appointments.routes';
import { doctorsRouter } from './modules/doctors/doctors.routes';
import { patientsRouter } from './modules/patients/patients.routes';
import { docsRouter } from './routes/docs';
import { healthRouter } from './routes/health';

// Builds the Express app without starting it. Tests import this directly
// and send requests to it without opening a port.
export function createApp() {
  const app = express();

  // Behind a hosting proxy (Fly, Render), trust its X-Forwarded-For header
  // so rate limiting sees the real client IP.
  app.set('trust proxy', 1);

  app.use(helmet());
  // credentials: true lets the browser send the refresh cookie cross-origin.
  app.use(cors({ origin: config.CORS_ORIGINS, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use('/health', healthRouter);
  app.use(docsRouter);
  app.use('/auth', authRouter);
  app.use('/patients', patientsRouter);
  app.use('/doctors', doctorsRouter);
  app.use('/appointments', appointmentsRouter);

  // These two must come after every route.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
