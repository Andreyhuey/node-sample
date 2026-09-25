import { and, asc, eq, gt, gte, lt, type SQL } from 'drizzle-orm';
import { db } from '../../db';
import { appointments } from '../../db/schema';
import { ConflictError, NotFoundError, UnprocessableError } from '../../errors';
import { getDoctor } from '../doctors/doctors.service';
import { getPatient } from '../patients/patients.service';
import { afterCursor, decodeCursor, toPage } from '../pagination';
import type {
  AppointmentStatusUpdate,
  CreateAppointmentInput,
  ListAppointmentsQuery,
} from './appointments.schemas';

export async function listAppointments(query: ListAppointmentsQuery) {
  const { limit, cursor, patientId, doctorId, status, from, to } = query;

  const conditions: SQL[] = [];
  if (patientId) conditions.push(eq(appointments.patientId, patientId));
  if (doctorId) conditions.push(eq(appointments.doctorId, doctorId));
  if (status) conditions.push(eq(appointments.status, status));
  if (from) conditions.push(gte(appointments.startsAt, from));
  if (to) conditions.push(lt(appointments.startsAt, to));
  if (cursor) {
    conditions.push(
      afterCursor(appointments.startsAt, appointments.id, decodeCursor(cursor)),
    );
  }

  const rows = await db
    .select()
    .from(appointments)
    .where(and(...conditions))
    .orderBy(asc(appointments.startsAt), asc(appointments.id))
    .limit(limit + 1);

  return toPage(rows, limit, (a) => a.startsAt.toISOString());
}

export async function getAppointment(id: string) {
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id));
  if (!appointment) throw new NotFoundError('Appointment not found');
  return appointment;
}

export async function createAppointment(input: CreateAppointmentInput) {
  if (input.startsAt <= new Date()) {
    throw new UnprocessableError('Appointments must be booked in the future');
  }

  // 404s with a clear message instead of a foreign key error.
  await getPatient(input.patientId);
  await getDoctor(input.doctorId);

  // Friendly check for a double booking. Two requests at the same moment
  // could both pass it, so the database also enforces this with an
  // exclusion constraint (see the migration), which the error handler turns
  // into a 409 as well.
  const [clash] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, input.doctorId),
        eq(appointments.status, 'scheduled'),
        lt(appointments.startsAt, input.endsAt),
        gt(appointments.endsAt, input.startsAt),
      ),
    )
    .limit(1);
  if (clash) throw new ConflictError('Doctor already has an appointment at that time');

  const [appointment] = await db.insert(appointments).values(input).returning();
  return appointment;
}

// Only a scheduled appointment can change status. Completed, cancelled and
// no-show are final.
export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatusUpdate,
) {
  const current = await getAppointment(id);
  if (current.status !== 'scheduled') {
    throw new UnprocessableError(
      `Cannot change an appointment that is already ${current.status}`,
    );
  }

  const [appointment] = await db
    .update(appointments)
    .set({ status })
    .where(and(eq(appointments.id, id), eq(appointments.status, 'scheduled')))
    .returning();
  if (!appointment) throw new ConflictError('Appointment was changed by another request');
  return appointment;
}
