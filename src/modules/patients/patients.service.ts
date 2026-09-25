import { desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { patients } from '../../db/schema';
import { NotFoundError } from '../../errors';
import type { CreatePatientInput, UpdatePatientInput } from './patients.schemas';

export async function listPatients() {
  return db.select().from(patients).orderBy(desc(patients.createdAt));
}

export async function getPatient(id: string) {
  const [patient] = await db.select().from(patients).where(eq(patients.id, id));
  if (!patient) throw new NotFoundError('Patient not found');
  return patient;
}

export async function createPatient(input: CreatePatientInput) {
  const [patient] = await db.insert(patients).values(input).returning();
  return patient;
}

export async function updatePatient(id: string, input: UpdatePatientInput) {
  const [patient] = await db
    .update(patients)
    .set(input)
    .where(eq(patients.id, id))
    .returning();
  if (!patient) throw new NotFoundError('Patient not found');
  return patient;
}

export async function deletePatient(id: string) {
  const [patient] = await db.delete(patients).where(eq(patients.id, id)).returning();
  if (!patient) throw new NotFoundError('Patient not found');
}
