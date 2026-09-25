import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  dateOfBirth: date('date_of_birth').notNull(),
  ...timestamps,
});

export const doctors = pgTable('doctors', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  specialty: text('specialty').notNull(),
  ...timestamps,
});

export const appointmentStatus = pgEnum('appointment_status', [
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
]);

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // restrict: a patient or doctor with appointment history can't be deleted
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'restrict' }),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => doctors.id, { onDelete: 'restrict' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    status: appointmentStatus('status').notNull().default('scheduled'),
    reason: text('reason'),
    ...timestamps,
  },
  (t) => [
    // Speeds up "what does this doctor have on this day" and the overlap check.
    index('appointments_doctor_starts_idx').on(t.doctorId, t.startsAt),
    index('appointments_patient_idx').on(t.patientId),
  ],
);

export const prescriptions = pgTable(
  'prescriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'restrict' }),
    medication: text('medication').notNull(),
    dosage: text('dosage').notNull(),
    frequency: text('frequency').notNull(),
    durationDays: integer('duration_days').notNull(),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [index('prescriptions_appointment_idx').on(t.appointmentId)],
);

export type Patient = typeof patients.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Prescription = typeof prescriptions.$inferSelect;
