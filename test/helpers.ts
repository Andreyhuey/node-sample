import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app';
import { type AuthUser, signAccessToken } from '../src/modules/auth/tokens';

// supertest sends requests straight to the app, no port needed.
export const api = request(createApp());

// A request client that sends a bearer token with every request.
export function as(token: string) {
  const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);
  return {
    get: (url: string) => auth(api.get(url)),
    post: (url: string) => auth(api.post(url)),
    patch: (url: string) => auth(api.patch(url)),
    delete: (url: string) => auth(api.delete(url)),
  };
}

export function tokenFor(user: Partial<AuthUser> & Pick<AuthUser, 'role'>) {
  return signAccessToken({ id: randomUUID(), doctorId: null, patientId: null, ...user });
}

// Access tokens are checked without a database lookup, so tests can act as
// an admin without creating an admin account first.
export const admin = as(tokenFor({ role: 'admin' }));
export const asDoctor = (doctorId: string) => as(tokenFor({ role: 'doctor', doctorId }));
export const asPatient = (patientId: string) =>
  as(tokenFor({ role: 'patient', patientId }));

let n = 0;
const unique = () => `${Date.now()}-${++n}`;

export async function createPatient(overrides: Record<string, unknown> = {}) {
  const res = await admin
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
  const res = await admin
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
  const res = await admin
    .post('/appointments')
    .send({ patientId, doctorId, ...time })
    .expect(201);
  return res.body;
}
