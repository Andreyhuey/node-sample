import { afterAll, beforeEach } from 'vitest';
import { pool } from '../src/db';

// Every test starts from empty tables, so tests can't affect each other.
beforeEach(async () => {
  await pool.query('TRUNCATE prescriptions, appointments, doctors, patients CASCADE');
});

afterAll(async () => {
  await pool.end();
});
