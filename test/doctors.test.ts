import { describe, expect, it } from 'vitest';
import { api, createDoctor } from './helpers';

describe('doctors', () => {
  it('creates, gets and updates a doctor', async () => {
    const doctor = await createDoctor({ specialty: 'Cardiology' });
    await api.get(`/doctors/${doctor.id}`).expect(200);

    const res = await api
      .patch(`/doctors/${doctor.id}`)
      .send({ specialty: 'Paediatrics' })
      .expect(200);
    expect(res.body.specialty).toBe('Paediatrics');
  });

  it('filters by specialty, case-insensitively', async () => {
    await createDoctor({ specialty: 'Cardiology' });
    await createDoctor({ specialty: 'Cardiology' });
    await createDoctor({ specialty: 'Dermatology' });

    const res = await api.get('/doctors?specialty=cardiology').expect(200);
    expect(res.body.data).toHaveLength(2);
  });
});
