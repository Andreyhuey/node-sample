import { asc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { doctors } from '../../db/schema';
import { NotFoundError } from '../../errors';
import type { CreateDoctorInput, UpdateDoctorInput } from './doctors.schemas';

export async function listDoctors() {
  return db.select().from(doctors).orderBy(asc(doctors.lastName));
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
