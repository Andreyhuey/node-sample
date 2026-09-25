import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from '../openapi';

export const docsRouter = Router();

// Built once at startup, since the routes don't change at runtime.
const document = buildOpenApiDocument();

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(document);
});

docsRouter.use('/docs', swaggerUi.serve, swaggerUi.setup(document));
