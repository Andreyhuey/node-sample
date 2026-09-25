import { config } from './config';
import { pool } from './db';
import { runMigrations } from './db/migrate';
import { seedDemo } from './db/seed-demo';

// Runs once per deploy, before the new version starts serving traffic:
// apply migrations, then load demo data if SEED_DEMO=true.
async function release() {
  await runMigrations(config.DATABASE_URL);
  console.log('Migrations applied');
  if (process.env.SEED_DEMO === 'true') await seedDemo();
}

release()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
