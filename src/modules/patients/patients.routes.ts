import { Router } from 'express';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth';
import { validated } from '../../middleware/validated';
import { ForbiddenError } from '../../errors';
import type { AuthUser } from '../auth/tokens';
import { idParam } from '../params';
import { listPrescriptionsForPatient } from '../prescriptions/prescriptions.service';
import {
  createPatientSchema,
  listPatientsQuery,
  updatePatientSchema,
} from './patients.schemas';
import * as service from './patients.service';

export const patientsRouter = Router();

patientsRouter.use(requireAuth);

// Staff can see any patient; a patient can only see their own record.
function assertCanView(user: AuthUser, patientId: string) {
  if (user.role === 'patient' && user.patientId !== patientId) throw new ForbiddenError();
}

patientsRouter.get(
  '/',
  requireRole('admin', 'doctor'),
  validated({ query: listPatientsQuery }, async ({ query }, res) => {
    res.json(await service.listPatients(query));
  }),
);

// Patients usually sign up through POST /auth/register. This is for the
// front desk registering someone who has no account.
patientsRouter.post(
  '/',
  requireRole('admin'),
  validated({ body: createPatientSchema }, async ({ body }, res) => {
    res.status(201).json(await service.createPatient(body));
  }),
);

patientsRouter.get(
  '/:id',
  validated({ params: idParam }, async ({ params }, res, req) => {
    assertCanView(currentUser(req), params.id);
    res.json(await service.getPatient(params.id));
  }),
);

patientsRouter.patch(
  '/:id',
  validated(
    { params: idParam, body: updatePatientSchema },
    async ({ params, body }, res, req) => {
      const user = currentUser(req);
      if (user.role === 'doctor') throw new ForbiddenError();
      assertCanView(user, params.id);
      // The email is also the login, so only an admin may change it.
      if (user.role === 'patient' && body.email) {
        throw new ForbiddenError('Contact the clinic to change your email');
      }
      res.json(await service.updatePatient(params.id, body));
    },
  ),
);

patientsRouter.delete(
  '/:id',
  requireRole('admin'),
  validated({ params: idParam }, async ({ params }, res) => {
    await service.deletePatient(params.id);
    res.status(204).end();
  }),
);

patientsRouter.get(
  '/:id/prescriptions',
  validated({ params: idParam }, async ({ params }, res, req) => {
    assertCanView(currentUser(req), params.id);
    await service.getPatient(params.id); // 404 if the patient doesn't exist
    res.json(await listPrescriptionsForPatient(params.id));
  }),
);
