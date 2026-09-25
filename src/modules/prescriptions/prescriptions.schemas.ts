import { z } from 'zod';

export const createPrescriptionSchema = z.object({
  medication: z.string().trim().min(1),
  dosage: z.string().trim().min(1), // e.g. "500mg"
  frequency: z.string().trim().min(1), // e.g. "twice daily"
  durationDays: z.number().int().positive().max(365),
  notes: z.string().trim().min(1).optional(),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
