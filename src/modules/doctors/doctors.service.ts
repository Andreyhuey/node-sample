import { and, asc, eq, ilike, type SQL } from 'drizzle-orm';
import { db } from '../../db';
import { escapeLike } from '../../db/escape-like';
import { doctors } from '../../db/schema';
import { NotFoundError } from '../../errors';
import { afterCursor, decodeCursor, toPage } from '../pagination';
import type {
  CreateDoctorInput,
  ListDoctorsQuery,
  UpdateDoctorInput,
} from './doctors.schemas';

export async function listDoctors({ limit, cursor, specialty }: ListDoctorsQuery) {
  const conditions: SQL[] = [];
  // Case-insensitive exact match, so "cardiology" finds "Cardiology".
  if (specialty) conditions.push(ilike(doctors.specialty, escapeLike(specialty)));
  if (cursor)
    conditions.push(afterCursor(doctors.lastName, doctors.id, decodeCursor(cursor)));

  const rows = await db
    .select()
    .from(doctors)
    .where(and(...conditions))
    .orderBy(asc(doctors.lastName), asc(doctors.id))
    .limit(limit + 1);

  return toPage(rows, limit, (d) => d.lastName);
}

export async function getDoctor(id: string) {
  const [doctor] = await db.select().from(doctors).where(eq(doctors.id, id));
  if (!doctor) throw new NotFoundError('Doctor not found');
  return doctor;
}

export async function createDoctor(input: CreateDoctorInput) {
  const [doctor] = await db.insert(doctors).values(input).returning();
  return doctor;
}

export async function updateDoctor(id: string, input: UpdateDoctorInput) {
  const [doctor] = await db
    .update(doctors)
    .set(input)
    .where(eq(doctors.id, id))
    .returning();
  if (!doctor) throw new NotFoundError('Doctor not found');
  return doctor;
}
