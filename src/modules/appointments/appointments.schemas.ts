import { z } from 'zod';

export const createAppointmentSchema = z
  .object({
    patientId: z.string().uuid(),
    doctorId: z.string().uuid(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    reason: z.string().trim().min(1).optional(),
  })
  .refine((a) => a.endsAt > a.startsAt, {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  });

export const updateStatusSchema = z.object({
  status: z.enum(['completed', 'cancelled', 'no_show']),
});

export const listAppointmentsQuery = z.object({
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type AppointmentStatusUpdate = z.infer<typeof updateStatusSchema>['status'];
