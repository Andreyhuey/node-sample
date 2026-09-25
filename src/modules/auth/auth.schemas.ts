import { z } from 'zod';
import { createPatientSchema } from '../patients/patients.schemas';

// 8+ characters, capped because argon2 input size should be bounded.
export const passwordSchema = z.string().min(8).max(128);

export const registerSchema = createPatientSchema.extend({ password: passwordSchema });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
