import { desc, eq, getTableColumns } from 'drizzle-orm';
import { db } from '../../db';
import { appointments, prescriptions } from '../../db/schema';
import { UnprocessableError } from '../../errors';
import { getAppointment } from '../appointments/appointments.service';
import type { CreatePrescriptionInput } from './prescriptions.schemas';

// A prescription is written during a visit, so the appointment must have
// actually happened.
export async function createPrescription(
  appointmentId: string,
  input: CreatePrescriptionInput,
) {
  const appointment = await getAppointment(appointmentId);
  if (appointment.status !== 'completed') {
    throw new UnprocessableError(
      'Prescriptions can only be added to completed appointments',
    );
  }

  const [prescription] = await db
    .insert(prescriptions)
    .values({ ...input, appointmentId })
    .returning();
  return prescription;
}

export async function listPrescriptionsForAppointment(appointmentId: string) {
  return db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.appointmentId, appointmentId))
    .orderBy(desc(prescriptions.createdAt));
}

// A patient's prescriptions across all their appointments.
export async function listPrescriptionsForPatient(patientId: string) {
  return db
    .select({
      ...getTableColumns(prescriptions),
      doctorId: appointments.doctorId,
    })
    .from(prescriptions)
    .innerJoin(appointments, eq(prescriptions.appointmentId, appointments.id))
    .where(eq(appointments.patientId, patientId))
    .orderBy(desc(prescriptions.createdAt));
}
