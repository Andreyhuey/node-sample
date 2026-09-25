import { z } from 'zod';
import { paginationQuery } from '../pagination';

export const createDoctorSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  specialty: z.string().trim().min(1),
});

export const updateDoctorSchema = createDoctorSchema.partial();

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;

export const listDoctorsQuery = paginationQuery.extend({
  specialty: z.string().trim().min(1).optional(),
});

export type ListDoctorsQuery = z.infer<typeof listDoctorsQuery>;
