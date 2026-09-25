import { describe, expect, it } from 'vitest';
import { admin, asDoctor, book, createDoctor, createPatient } from './helpers';

const rx = {
  medication: 'Paracetamol',
  dosage: '500mg',
  frequency: 'twice daily',
  durationDays: 5,
};

describe('prescriptions', () => {
  it('can only be written for a completed appointment', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const appt = await book(patient.id, doctor.id);

    await asDoctor(doctor.id)
      .post(`/appointments/${appt.id}/prescriptions`)
      .send(rx)
      .expect(422);

    await admin.patch(`/appointments/${appt.id}/status`).send({ status: 'completed' });
    const res = await asDoctor(doctor.id)
      .post(`/appointments/${appt.id}/prescriptions`)
      .send(rx)
      .expect(201);
    expect(res.body).toMatchObject({ ...rx, appointmentId: appt.id });
  });

  it('lists a patient’s prescriptions with the prescribing doctor', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const appt = await book(patient.id, doctor.id);
    await admin.patch(`/appointments/${appt.id}/status`).send({ status: 'completed' });
    await asDoctor(doctor.id).post(`/appointments/${appt.id}/prescriptions`).send(rx);

    const res = await admin.get(`/patients/${patient.id}/prescriptions`).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].doctorId).toBe(doctor.id);
  });

  it('validates the prescription body', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const appt = await book(patient.id, doctor.id);
    await asDoctor(doctor.id)
      .post(`/appointments/${appt.id}/prescriptions`)
      .send({ ...rx, durationDays: 0 })
      .expect(400);
  });
});

describe('prescription access', () => {
  it('forbids other doctors, patients and admins from prescribing', async () => {
    const patient = await createPatient();
    const doctor = await createDoctor();
    const otherDoctor = await createDoctor();
    const appt = await book(patient.id, doctor.id);
    await admin.patch(`/appointments/${appt.id}/status`).send({ status: 'completed' });

    const url = `/appointments/${appt.id}/prescriptions`;
    await asDoctor(otherDoctor.id).post(url).send(rx).expect(403);
    await admin.post(url).send(rx).expect(403);
    await asDoctor(doctor.id).post(url).send(rx).expect(201);
  });
});
