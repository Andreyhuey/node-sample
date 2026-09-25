import { Router } from 'express';
import { idParam } from '../params';
import { createDoctorSchema, updateDoctorSchema } from './doctors.schemas';
import * as service from './doctors.service';

export const doctorsRouter = Router();

doctorsRouter.get('/', async (_req, res) => {
  res.json(await service.listDoctors());
});

doctorsRouter.post('/', async (req, res) => {
  const input = createDoctorSchema.parse(req.body);
  res.status(201).json(await service.createDoctor(input));
});

doctorsRouter.get('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await service.getDoctor(id));
});

doctorsRouter.patch('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const input = updateDoctorSchema.parse(req.body);
  res.json(await service.updateDoctor(id, input));
});
