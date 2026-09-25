import { and, asc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { db } from '../../db';
import { escapeLike } from '../../db/escape-like';
import { patients } from '../../db/schema';
import { NotFoundError } from '../../errors';
import { afterCursor, decodeCursor, toPage } from '../pagination';
import type {
  CreatePatientInput,
  ListPatientsQuery,
  UpdatePatientInput,
} from './patients.schemas';

export async function listPatients({ limit, cursor, q }: ListPatientsQuery) {
  const conditions: SQL[] = [];
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    conditions.push(
      or(
        ilike(patients.firstName, pattern),
        ilike(patients.lastName, pattern),
        ilike(patients.email, pattern),
      )!,
    );
  }
  if (cursor)
    conditions.push(afterCursor(patients.lastName, patients.id, decodeCursor(cursor)));

  const rows = await db
    .select()
    .from(patients)
    .where(and(...conditions))
    .orderBy(asc(patients.lastName), asc(patients.id))
    .limit(limit + 1);

  return toPage(rows, limit, (p) => p.lastName);
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
