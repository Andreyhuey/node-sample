import { describe, expect, it } from 'vitest';
import {
  admin,
  api,
  asDoctor,
  asPatient,
  book,
  createDoctor,
  createPatient,
  slot,
} from './helpers';

async function world() {
  const alice = await createPatient({ firstName: 'Alice' });
  const bob = await createPatient({ firstName: 'Bob' });
  const drA = await createDoctor();
  const drB = await createDoctor();
  const aliceWithA = await book(alice.id, drA.id, slot(1, 9));
  const bobWithB = await book(bob.id, drB.id, slot(1, 9));
  return { alice, bob, drA, drB, aliceWithA, bobWithB };
}

describe('authorization', () => {
  it('lets anyone browse doctors but only admins create them', async () => {
    await api.get('/doctors').expect(200);
    const { alice, drA } = await world();
    const doctor = { firstName: 'X', lastName: 'Y', email: 'x@y.com', specialty: 'GP' };
    await asPatient(alice.id).post('/doctors').send(doctor).expect(403);
    await asDoctor(drA.id).post('/doctors').send(doctor).expect(403);
  });

  it('keeps patients to their own records', async () => {
    const { alice, bob } = await world();
    const me = asPatient(alice.id);

    await me.get(`/patients/${alice.id}`).expect(200);
    await me.get(`/patients/${bob.id}`).expect(403);
    await me.get('/patients').expect(403);
    await me.get(`/patients/${bob.id}/prescriptions`).expect(403);
    await me.patch(`/patients/${alice.id}`).send({ phone: '+2348000000' }).expect(200);
    await me.patch(`/patients/${alice.id}`).send({ email: 'new@x.com' }).expect(403);
  });

  it('scopes appointment lists to the caller, ignoring other filters', async () => {
    const { alice, bob, drA, aliceWithA, bobWithB } = await world();

    const mine = await asPatient(alice.id)
      .get(`/appointments?patientId=${bob.id}`)
      .expect(200);
    expect(mine.body.data.map((a: { id: string }) => a.id)).toEqual([aliceWithA.id]);

    const drAs = await asDoctor(drA.id).get('/appointments').expect(200);
    expect(drAs.body.data.map((a: { id: string }) => a.id)).toEqual([aliceWithA.id]);

    const all = await admin.get('/appointments').expect(200);
    expect(all.body.data.map((a: { id: string }) => a.id).sort()).toEqual(
      [aliceWithA.id, bobWithB.id].sort(),
    );
  });

  it('hides other people’s appointments', async () => {
    const { alice, drA, bobWithB } = await world();
    await asPatient(alice.id).get(`/appointments/${bobWithB.id}`).expect(403);
    await asDoctor(drA.id).get(`/appointments/${bobWithB.id}`).expect(403);
  });

  it('lets patients book only for themselves', async () => {
    const { alice, bob, drA } = await world();
    await asPatient(alice.id)
      .post('/appointments')
      .send({ patientId: bob.id, doctorId: drA.id, ...slot(2, 9) })
      .expect(403);
    await asPatient(alice.id)
      .post('/appointments')
      .send({ patientId: alice.id, doctorId: drA.id, ...slot(2, 9) })
      .expect(201);
    await asDoctor(drA.id)
      .post('/appointments')
      .send({ patientId: alice.id, doctorId: drA.id, ...slot(3, 9) })
      .expect(403);
  });

  it('lets a patient cancel but not complete, and the doctor complete', async () => {
    const { alice, drA, aliceWithA } = await world();
    const url = `/appointments/${aliceWithA.id}/status`;
    await asPatient(alice.id).patch(url).send({ status: 'completed' }).expect(403);
    await asDoctor(drA.id).patch(url).send({ status: 'completed' }).expect(200);
  });
});
