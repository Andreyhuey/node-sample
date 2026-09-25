import { Router } from 'express';
import { idParam } from '../params';
import { listPrescriptionsForPatient } from '../prescriptions/prescriptions.service';
import { createPatientSchema, updatePatientSchema } from './patients.schemas';
import * as service from './patients.service';

export const patientsRouter = Router();

patientsRouter.get('/', async (_req, res) => {
  res.json(await service.listPatients());
});

patientsRouter.post('/', async (req, res) => {
  const input = createPatientSchema.parse(req.body);
  res.status(201).json(await service.createPatient(input));
});

patientsRouter.get('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await service.getPatient(id));
});

patientsRouter.patch('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const input = updatePatientSchema.parse(req.body);
  res.json(await service.updatePatient(id, input));
});

patientsRouter.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  await service.deletePatient(id);
  res.status(204).end();
});

patientsRouter.get('/:id/prescriptions', async (req, res) => {
  const { id } = idParam.parse(req.params);
  await service.getPatient(id); // 404 if the patient doesn't exist
  res.json(await listPrescriptionsForPatient(id));
});
