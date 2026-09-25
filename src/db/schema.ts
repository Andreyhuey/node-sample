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

export const patients = pgTable(
  'patients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull().unique(),
    phone: text('phone'),
    dateOfBirth: date('date_of_birth').notNull(),
    ...timestamps,
  },
  // Lists are sorted and paginated by (last_name, id).
  (t) => [index('patients_last_name_id_idx').on(t.lastName, t.id)],
);

export const doctors = pgTable(
  'doctors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull().unique(),
    specialty: text('specialty').notNull(),
    ...timestamps,
  },
  (t) => [index('doctors_last_name_id_idx').on(t.lastName, t.id)],
);

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
    // Default list order, used for keyset pagination.
    index('appointments_starts_id_idx').on(t.startsAt, t.id),
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

export const userRole = pgEnum('user_role', ['admin', 'doctor', 'patient']);

// Login accounts. A doctor or patient account points at its clinic record;
// an admin account points at neither.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull(),
  doctorId: uuid('doctor_id')
    .unique()
    .references(() => doctors.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id')
    .unique()
    .references(() => patients.id, { onDelete: 'cascade' }),
  ...timestamps,
});

// Only a SHA-256 hash of each refresh token is stored, so a database leak
// doesn't hand out working tokens.
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('refresh_tokens_user_idx').on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type UserRole = (typeof userRole.enumValues)[number];
