import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validated } from '../../middleware/validated';
import { createUserAccount } from '../auth/auth.service';
import { passwordSchema } from '../auth/auth.schemas';
import { idParam } from '../params';
import { z } from 'zod';
import {
  createDoctorSchema,
  listDoctorsQuery,
  updateDoctorSchema,
} from './doctors.schemas';
import * as service from './doctors.service';

export const doctorsRouter = Router();

// Anyone can browse doctors, so patients can pick one before booking.
doctorsRouter.get(
  '/',
  validated({ query: listDoctorsQuery }, async ({ query }, res) => {
    res.json(await service.listDoctors(query));
  }),
);

doctorsRouter.get(
  '/:id',
  validated({ params: idParam }, async ({ params }, res) => {
    res.json(await service.getDoctor(params.id));
  }),
);

doctorsRouter.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validated({ body: createDoctorSchema }, async ({ body }, res) => {
    res.status(201).json(await service.createDoctor(body));
  }),
);

doctorsRouter.patch(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validated(
    { params: idParam, body: updateDoctorSchema },
    async ({ params, body }, res) => {
      res.json(await service.updateDoctor(params.id, body));
    },
  ),
);

// Gives a doctor a login, using the email on their doctor record.
doctorsRouter.post(
  '/:id/account',
  requireAuth,
  requireRole('admin'),
  validated(
    { params: idParam, body: z.object({ password: passwordSchema }) },
    async ({ params, body }, res) => {
      const doctor = await service.getDoctor(params.id);
      const user = await createUserAccount({
        email: doctor.email,
        password: body.password,
        role: 'doctor',
        doctorId: doctor.id,
      });
      res.status(201).json(user);
    },
  ),
);
