import { runMigrations } from '../src/db/migrate';

// Runs once before all test files: bring the test database schema up to date.
export default async function setup() {
  await runMigrations(
    process.env.TEST_DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/clinic_test',
  );
}
