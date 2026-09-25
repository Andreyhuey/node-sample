import { eq } from 'drizzle-orm';
import { createUserAccount } from '../modules/auth/auth.service';
import { db, pool } from '.';
import { users } from './schema';

// Creates the first admin account from ADMIN_EMAIL and ADMIN_PASSWORD.
// Safe to run again: it does nothing if that email already has an account.
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters)');
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    console.log(`Account ${email} already exists`);
    return;
  }
  await createUserAccount({ email, password, role: 'admin' });
  console.log(`Admin ${email} created`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
