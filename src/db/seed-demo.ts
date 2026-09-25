import { eq } from 'drizzle-orm';
import { createUserAccount } from '../modules/auth/auth.service';
import { db, pool } from '.';
import { appointments, doctors, patients, prescriptions, users } from './schema';

// Demo data for the hosted API, so anyone can log in from /docs and try it.
// Safe to run on every deploy: it does nothing once the demo admin exists.
const DEMO_PASSWORD = 'demo-password';
const DEMO = {
  admin: 'demo-admin@clinic.dev',
  doctor: 'demo-doctor@clinic.dev',
  patient: 'demo-patient@clinic.dev',
};

// A date `days` from now at `hour`:00 UTC.
function at(days: number, hour: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}
const plus30 = (d: Date) => new Date(d.getTime() + 30 * 60_000);

export async function seedDemo() {
  const [existing] = await db.select().from(users).where(eq(users.email, DEMO.admin));
  if (existing) {
    console.log('Demo data already present');
    return;
  }

  await createUserAccount({ email: DEMO.admin, password: DEMO_PASSWORD, role: 'admin' });

  const [amara, chidi] = await db
    .insert(doctors)
    .values([
      {
        firstName: 'Amara',
        lastName: 'Okafor',
        email: DEMO.doctor,
        specialty: 'General Practice',
      },
      {
        firstName: 'Chidi',
        lastName: 'Eze',
        email: 'chidi.eze@clinic.dev',
        specialty: 'Cardiology',
      },
    ])
    .returning();
  await createUserAccount({
    email: DEMO.doctor,
    password: DEMO_PASSWORD,
    role: 'doctor',
    doctorId: amara.id,
  });

  const [ada, tunde] = await db
    .insert(patients)
    .values([
      {
        firstName: 'Ada',
        lastName: 'Nwosu',
        email: DEMO.patient,
        dateOfBirth: '1991-03-14',
      },
      {
        firstName: 'Tunde',
        lastName: 'Bakare',
        email: 'tunde@example.com',
        dateOfBirth: '1985-11-02',
      },
    ])
    .returning();
  await createUserAccount({
    email: DEMO.patient,
    password: DEMO_PASSWORD,
    role: 'patient',
    patientId: ada.id,
  });

  // Inserted directly: the API refuses to book in the past, but the demo
  // needs a finished visit with a prescription.
  const past = at(-7, 10);
  const [visit] = await db
    .insert(appointments)
    .values({
      patientId: ada.id,
      doctorId: amara.id,
      startsAt: past,
      endsAt: plus30(past),
      status: 'completed',
      reason: 'Sore throat',
    })
    .returning();
  await db.insert(prescriptions).values({
    appointmentId: visit.id,
    medication: 'Amoxicillin',
    dosage: '500mg',
    frequency: 'three times daily',
    durationDays: 7,
  });

  await db.insert(appointments).values([
    {
      patientId: ada.id,
      doctorId: amara.id,
      startsAt: at(3, 9),
      endsAt: plus30(at(3, 9)),
      reason: 'Follow-up',
    },
    {
      patientId: tunde.id,
      doctorId: chidi.id,
      startsAt: at(4, 11),
      endsAt: plus30(at(4, 11)),
      reason: 'Chest pain review',
    },
    {
      patientId: tunde.id,
      doctorId: amara.id,
      startsAt: at(5, 14),
      endsAt: plus30(at(5, 14)),
    },
  ]);

  console.log(`Demo data created for ${Object.values(DEMO).join(', ')}`);
}

if (require.main === module) {
  seedDemo()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
