import { Router } from 'express';
import { validated } from '../../middleware/validated';
import { idParam } from '../params';
import { listPrescriptionsForPatient } from '../prescriptions/prescriptions.service';
import {
  createPatientSchema,
  listPatientsQuery,
  updatePatientSchema,
} from './patients.schemas';
import * as service from './patients.service';

export const patientsRouter = Router();

patientsRouter.get(
  '/',
  validated({ query: listPatientsQuery }, async ({ query }, res) => {
    res.json(await service.listPatients(query));
  }),
);

patientsRouter.post(
  '/',
  validated({ body: createPatientSchema }, async ({ body }, res) => {
    res.status(201).json(await service.createPatient(body));
  }),
);

patientsRouter.get(
  '/:id',
  validated({ params: idParam }, async ({ params }, res) => {
    res.json(await service.getPatient(params.id));
  }),
);

patientsRouter.patch(
  '/:id',
  validated(
    { params: idParam, body: updatePatientSchema },
    async ({ params, body }, res) => {
      res.json(await service.updatePatient(params.id, body));
    },
  ),
);

patientsRouter.delete(
  '/:id',
  validated({ params: idParam }, async ({ params }, res) => {
    await service.deletePatient(params.id);
    res.status(204).end();
  }),
);

patientsRouter.get(
  '/:id/prescriptions',
  validated({ params: idParam }, async ({ params }, res) => {
    await service.getPatient(params.id); // 404 if the patient doesn't exist
    res.json(await listPrescriptionsForPatient(params.id));
  }),
);
