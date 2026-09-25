import { describe, expect, it } from 'vitest';
import {
  AppointmentResponse,
  DoctorResponse,
  page,
  PatientResponse,
  PrescriptionResponse,
  SessionResponse,
} from '../src/openapi';
import { admin, api, asDoctor, book, createDoctor, createPatient } from './helpers';

describe('OpenAPI docs', () => {
  it('serves the spec with every route', async () => {
    const res = await api.get('/openapi.json').expect(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining([
        '/auth/login',
        '/patients',
        '/patients/{id}',
        '/doctors',
        '/appointments',
        '/appointments/{id}/status',
        '/appointments/{id}/prescriptions',
      ]),
    );
  });

  it('serves Swagger UI', async () => {
    const res = await api.get('/docs/').expect(200);
    expect(res.text).toContain('swagger-ui');
  });
});

// If a response stops matching its documented schema, these fail, so the
// docs can't silently drift from what the API returns.
describe('responses match the documented schemas', () => {
  it('patients, doctors, appointments, prescriptions', async () => {
    const patient = await createPatient({ phone: '+2348000000' });
    const doctor = await createDoctor();
    const appt = await book(patient.id, doctor.id);
    await admin.patch(`/appointments/${appt.id}/status`).send({ status: 'completed' });
    const rx = await asDoctor(doctor.id)
      .post(`/appointments/${appt.id}/prescriptions`)
      .send({
        medication: 'Amoxicillin',
        dosage: '250mg',
        frequency: 'tid',
        durationDays: 7,
      })
      .expect(201);

    PatientResponse.parse((await admin.get(`/patients/${patient.id}`)).body);
    page(PatientResponse)
      .strict()
      .parse((await admin.get('/patients')).body);
    DoctorResponse.parse((await api.get(`/doctors/${doctor.id}`)).body);
    page(AppointmentResponse).parse((await admin.get('/appointments')).body);
    PrescriptionResponse.parse(rx.body);
  });

  it('auth session', async () => {
    const res = await api.post('/auth/register').send({
      firstName: 'Ada',
      lastName: 'Obi',
      email: 'ada@example.com',
      dateOfBirth: '1990-04-01',
      password: 'long enough password',
    });
    SessionResponse.strict().parse(res.body);
  });
});
