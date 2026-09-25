import { Router } from 'express';
import { validated } from '../../middleware/validated';
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

appointmentsRouter.get(
  '/',
  validated({ query: listAppointmentsQuery }, async ({ query }, res) => {
    res.json(await service.listAppointments(query));
  }),
);

appointmentsRouter.post(
  '/',
  validated({ body: createAppointmentSchema }, async ({ body }, res) => {
    res.status(201).json(await service.createAppointment(body));
  }),
);

appointmentsRouter.get(
  '/:id',
  validated({ params: idParam }, async ({ params }, res) => {
    res.json(await service.getAppointment(params.id));
  }),
);

appointmentsRouter.patch(
  '/:id/status',
  validated(
    { params: idParam, body: updateStatusSchema },
    async ({ params, body }, res) => {
      res.json(await service.updateAppointmentStatus(params.id, body.status));
    },
  ),
);

appointmentsRouter.get(
  '/:id/prescriptions',
  validated({ params: idParam }, async ({ params }, res) => {
    await service.getAppointment(params.id); // 404 if the appointment doesn't exist
    res.json(await prescriptions.listPrescriptionsForAppointment(params.id));
  }),
);

appointmentsRouter.post(
  '/:id/prescriptions',
  validated(
    { params: idParam, body: createPrescriptionSchema },
    async ({ params, body }, res) => {
      res.status(201).json(await prescriptions.createPrescription(params.id, body));
    },
  ),
);
