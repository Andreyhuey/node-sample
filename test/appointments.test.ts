import { describe, expect, it } from 'vitest';
import { api, book, createDoctor, createPatient, slot } from './helpers';

async function setup() {
  const patient = await createPatient();
  const doctor = await createDoctor();
  return { patient, doctor };
}

describe('appointments', () => {
  it('books an appointment as scheduled', async () => {
    const { patient, doctor } = await setup();
    const appt = await book(patient.id, doctor.id);
    expect(appt.status).toBe('scheduled');
  });

  it('rejects bookings in the past', async () => {
    const { patient, doctor } = await setup();
    const res = await api
      .post('/appointments')
      .send({ patientId: patient.id, doctorId: doctor.id, ...slot(-1, 10) })
      .expect(422);
    expect(res.body.error.code).toBe('UNPROCESSABLE');
  });

  it('rejects an end time before the start time', async () => {
    const { patient, doctor } = await setup();
    const { startsAt, endsAt } = slot(1, 10);
    await api
      .post('/appointments')
      .send({
        patientId: patient.id,
        doctorId: doctor.id,
        startsAt: endsAt,
        endsAt: startsAt,
      })
      .expect(400);
  });

  it('returns 404 for an unknown patient or doctor', async () => {
    const { patient } = await setup();
    await api
      .post('/appointments')
      .send({
        patientId: patient.id,
        doctorId: '00000000-0000-0000-0000-000000000000',
        ...slot(1, 10),
      })
      .expect(404);
  });

  it('refuses to double-book a doctor', async () => {
    const { patient, doctor } = await setup();
    await book(patient.id, doctor.id, slot(1, 10, 30));

    // 10:15 to 10:45 overlaps 10:00 to 10:30.
    const overlap = slot(1, 10, 30);
    overlap.startsAt = new Date(Date.parse(overlap.startsAt) + 15 * 60_000).toISOString();
    overlap.endsAt = new Date(Date.parse(overlap.endsAt) + 15 * 60_000).toISOString();
    await api
      .post('/appointments')
      .send({ patientId: patient.id, doctorId: doctor.id, ...overlap })
      .expect(409);
  });

  it('allows back-to-back appointments', async () => {
    const { patient, doctor } = await setup();
    await book(patient.id, doctor.id, slot(1, 10, 60));
    await book(patient.id, doctor.id, slot(1, 11, 60));
  });

  it('lets exactly one of many simultaneous bookings win', async () => {
    const { patient, doctor } = await setup();
    const time = slot(2, 9);
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        api
          .post('/appointments')
          .send({ patientId: patient.id, doctorId: doctor.id, ...time }),
      ),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409, 409]);
  });

  it('frees the slot when an appointment is cancelled', async () => {
    const { patient, doctor } = await setup();
    const time = slot(1, 14);
    const appt = await book(patient.id, doctor.id, time);
    await api
      .patch(`/appointments/${appt.id}/status`)
      .send({ status: 'cancelled' })
      .expect(200);
    await book(patient.id, doctor.id, time);
  });

  it('only allows status changes from scheduled', async () => {
    const { patient, doctor } = await setup();
    const appt = await book(patient.id, doctor.id);
    await api
      .patch(`/appointments/${appt.id}/status`)
      .send({ status: 'completed' })
      .expect(200);
    const res = await api
      .patch(`/appointments/${appt.id}/status`)
      .send({ status: 'cancelled' })
      .expect(422);
    expect(res.body.error.message).toMatch(/already completed/);
  });

  it('filters by doctor, status and date range', async () => {
    const { patient, doctor } = await setup();
    const other = await createDoctor();
    await book(patient.id, doctor.id, slot(1, 9));
    await book(patient.id, doctor.id, slot(3, 9));
    const done = await book(patient.id, other.id, slot(1, 9));
    await api.patch(`/appointments/${done.id}/status`).send({ status: 'completed' });

    const byDoctor = await api.get(`/appointments?doctorId=${doctor.id}`).expect(200);
    expect(byDoctor.body.data).toHaveLength(2);

    const completed = await api.get('/appointments?status=completed').expect(200);
    expect(completed.body.data).toHaveLength(1);

    const day1 = slot(1, 0).startsAt.slice(0, 10);
    const day2 = slot(2, 0).startsAt.slice(0, 10);
    const inRange = await api.get(`/appointments?from=${day1}&to=${day2}`).expect(200);
    expect(inRange.body.data).toHaveLength(2);
  });
});
