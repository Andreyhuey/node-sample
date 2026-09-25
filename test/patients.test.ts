import { describe, expect, it } from 'vitest';
import { api, book, createDoctor, createPatient } from './helpers';

describe('patients', () => {
  it('creates a patient and normalises the email', async () => {
    const patient = await createPatient({ email: 'ADA@Example.com' });
    expect(patient).toMatchObject({ firstName: 'Ada', email: 'ada@example.com' });
    expect(patient.id).toEqual(expect.any(String));
  });

  it('rejects an invalid body with field errors', async () => {
    const res = await api
      .post('/patients')
      .send({ firstName: '', email: 'not-an-email', dateOfBirth: '1990-13-01' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.details)).toEqual(
      expect.arrayContaining(['firstName', 'lastName', 'email', 'dateOfBirth']),
    );
  });

  it('returns 409 for a duplicate email', async () => {
    await createPatient({ email: 'dup@example.com' });
    const res = await api
      .post('/patients')
      .send({
        firstName: 'B',
        lastName: 'C',
        email: 'dup@example.com',
        dateOfBirth: '1990-01-01',
      })
      .expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('gets, updates and deletes a patient', async () => {
    const { id } = await createPatient();
    await api.get(`/patients/${id}`).expect(200);

    const updated = await api.patch(`/patients/${id}`).send({ phone: '+2348000000' });
    expect(updated.status).toBe(200);
    expect(updated.body.phone).toBe('+2348000000');

    await api.delete(`/patients/${id}`).expect(204);
    await api.get(`/patients/${id}`).expect(404);
  });

  it('returns 400 for a malformed id and 404 for an unknown one', async () => {
    await api.get('/patients/123').expect(400);
    await api.get('/patients/00000000-0000-0000-0000-000000000000').expect(404);
  });

  it('refuses to delete a patient with appointments', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    await book(patient.id, doctor.id);
    await api.delete(`/patients/${patient.id}`).expect(409);
  });

  it('searches by name or email, treating % literally', async () => {
    await createPatient({ lastName: 'Smith' });
    await createPatient({ lastName: 'Jones', email: 'smithy@example.com' });
    await createPatient({ lastName: 'Brown' });

    const res = await api.get('/patients?q=smi').expect(200);
    expect(res.body.data).toHaveLength(2);

    const wildcard = await api.get('/patients?q=%25').expect(200);
    expect(wildcard.body.data).toHaveLength(0);
  });
});
