import { z } from 'zod';
import { paginationQuery } from '../pagination';

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

export const listAppointmentsQuery = paginationQuery
  .extend({
    patientId: z.string().uuid().optional(),
    doctorId: z.string().uuid().optional(),
    status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
    // Appointments starting in [from, to). e.g. ?from=2026-10-01&to=2026-10-02
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((q) => !q.from || !q.to || q.to > q.from, {
    message: 'to must be after from',
    path: ['to'],
  });

export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuery>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type AppointmentStatusUpdate = z.infer<typeof updateStatusSchema>['status'];
