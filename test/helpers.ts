import request from 'supertest';
import { createApp } from '../src/app';

// supertest sends requests straight to the app, no port needed.
export const api = request(createApp());

let n = 0;
const unique = () => `${Date.now()}-${++n}`;

export async function createPatient(overrides: Record<string, unknown> = {}) {
  const res = await api
    .post('/patients')
    .send({
      firstName: 'Ada',
      lastName: 'Obi',
      email: `patient-${unique()}@example.com`,
      dateOfBirth: '1990-04-01',
      ...overrides,
    })
    .expect(201);
  return res.body;
}

export async function createDoctor(overrides: Record<string, unknown> = {}) {
  const res = await api
    .post('/doctors')
    .send({
      firstName: 'Tunde',
      lastName: 'Bello',
      email: `doctor-${unique()}@example.com`,
      specialty: 'General Practice',
      ...overrides,
    })
    .expect(201);
  return res.body;
}

// A time slot `daysAhead` days from now, starting at `hour`:00 UTC.
export function slot(daysAhead: number, hour: number, minutes = 30) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + daysAhead);
  start.setUTCHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + minutes * 60_000);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export async function book(patientId: string, doctorId: string, time = slot(1, 10)) {
  const res = await api
    .post('/appointments')
    .send({ patientId, doctorId, ...time })
    .expect(201);
  return res.body;
}
