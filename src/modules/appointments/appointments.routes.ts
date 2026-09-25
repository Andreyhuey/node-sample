import { Router } from 'express';
import { idParam } from '../params';
import { createPrescriptionSchema } from '../prescriptions/prescriptions.schemas';
import * as prescriptions from '../prescriptions/prescriptions.service';
import {
  createAppointmentSchema,
  listAppointmentsQuery,
  updateStatusSchema,
} from './appointments.schemas';
import * as service from './appointments.service';

export const appointmentsRouter = Router();

appointmentsRouter.get('/', async (req, res) => {
  const filters = listAppointmentsQuery.parse(req.query);
  res.json(await service.listAppointments(filters));
});

appointmentsRouter.post('/', async (req, res) => {
  const input = createAppointmentSchema.parse(req.body);
  res.status(201).json(await service.createAppointment(input));
});

appointmentsRouter.get('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await service.getAppointment(id));
});

appointmentsRouter.patch('/:id/status', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { status } = updateStatusSchema.parse(req.body);
  res.json(await service.updateAppointmentStatus(id, status));
});

appointmentsRouter.get('/:id/prescriptions', async (req, res) => {
  const { id } = idParam.parse(req.params);
  await service.getAppointment(id); // 404 if the appointment doesn't exist
  res.json(await prescriptions.listPrescriptionsForAppointment(id));
});

appointmentsRouter.post('/:id/prescriptions', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const input = createPrescriptionSchema.parse(req.body);
  res.status(201).json(await prescriptions.createPrescription(id, input));
});
