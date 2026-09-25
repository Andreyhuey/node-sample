import { Router } from 'express';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth';
import { validated } from '../../middleware/validated';
import type { Appointment } from '../../db/schema';
import { ForbiddenError } from '../../errors';
import type { AuthUser } from '../auth/tokens';
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

appointmentsRouter.use(requireAuth);

const isPatientOf = (user: AuthUser, a: Appointment) =>
  user.role === 'patient' && user.patientId === a.patientId;
const isDoctorOf = (user: AuthUser, a: Appointment) =>
  user.role === 'doctor' && user.doctorId === a.doctorId;

// Admins see everything; doctors and patients only their own appointments.
async function getVisibleAppointment(user: AuthUser, id: string) {
  const appointment = await service.getAppointment(id);
  if (
    user.role !== 'admin' &&
    !isPatientOf(user, appointment) &&
    !isDoctorOf(user, appointment)
  ) {
    throw new ForbiddenError();
  }
  return appointment;
}

appointmentsRouter.get(
  '/',
  validated({ query: listAppointmentsQuery }, async ({ query }, res, req) => {
    const user = currentUser(req);
    // Whatever filters are passed, doctors and patients are scoped to themselves.
    if (user.role === 'doctor') query.doctorId = user.doctorId!;
    if (user.role === 'patient') query.patientId = user.patientId!;
    res.json(await service.listAppointments(query));
  }),
);

appointmentsRouter.post(
  '/',
  requireRole('admin', 'patient'),
  validated({ body: createAppointmentSchema }, async ({ body }, res, req) => {
    const user = currentUser(req);
    if (user.role === 'patient' && body.patientId !== user.patientId) {
      throw new ForbiddenError('Patients can only book appointments for themselves');
    }
    res.status(201).json(await service.createAppointment(body));
  }),
);

appointmentsRouter.get(
  '/:id',
  validated({ params: idParam }, async ({ params }, res, req) => {
    res.json(await getVisibleAppointment(currentUser(req), params.id));
  }),
);

// Doctors and admins can set any outcome; a patient can only cancel.
appointmentsRouter.patch(
  '/:id/status',
  validated(
    { params: idParam, body: updateStatusSchema },
    async ({ params, body }, res, req) => {
      const user = currentUser(req);
      await getVisibleAppointment(user, params.id);
      if (user.role === 'patient' && body.status !== 'cancelled') {
        throw new ForbiddenError('Patients can only cancel appointments');
      }
      res.json(await service.updateAppointmentStatus(params.id, body.status));
    },
  ),
);

appointmentsRouter.get(
  '/:id/prescriptions',
  validated({ params: idParam }, async ({ params }, res, req) => {
    await getVisibleAppointment(currentUser(req), params.id);
    res.json(await prescriptions.listPrescriptionsForAppointment(params.id));
  }),
);

// Only the doctor who saw the patient can prescribe.
appointmentsRouter.post(
  '/:id/prescriptions',
  requireRole('doctor'),
  validated(
    { params: idParam, body: createPrescriptionSchema },
    async ({ params, body }, res, req) => {
      const appointment = await service.getAppointment(params.id);
      if (!isDoctorOf(currentUser(req), appointment)) {
        throw new ForbiddenError('Only the appointment’s doctor can prescribe');
      }
      res.status(201).json(await prescriptions.createPrescription(params.id, body));
    },
  ),
);
