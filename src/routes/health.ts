import { Router } from 'express';

export const healthRouter = Router();

// Used by Docker, load balancers and uptime checks to see the app is alive.
healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});
