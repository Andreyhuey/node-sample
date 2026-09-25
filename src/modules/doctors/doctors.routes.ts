import { Router } from 'express';
import { validated } from '../../middleware/validated';
import { idParam } from '../params';
import {
  createDoctorSchema,
  listDoctorsQuery,
  updateDoctorSchema,
} from './doctors.schemas';
import * as service from './doctors.service';

export const doctorsRouter = Router();

doctorsRouter.get(
  '/',
  validated({ query: listDoctorsQuery }, async ({ query }, res) => {
    res.json(await service.listDoctors(query));
  }),
);

doctorsRouter.post(
  '/',
  validated({ body: createDoctorSchema }, async ({ body }, res) => {
    res.status(201).json(await service.createDoctor(body));
  }),
);

doctorsRouter.get(
  '/:id',
  validated({ params: idParam }, async ({ params }, res) => {
    res.json(await service.getDoctor(params.id));
  }),
);

doctorsRouter.patch(
  '/:id',
  validated(
    { params: idParam, body: updateDoctorSchema },
    async ({ params, body }, res) => {
      res.json(await service.updateDoctor(params.id, body));
    },
  ),
);
