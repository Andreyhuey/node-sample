import { hash, verify } from '@node-rs/argon2';

// Argon2id is slow on purpose, which makes brute-forcing stolen hashes
// expensive. The library picks safe defaults and stores them in the hash.
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password);
}

// Checked when an email isn't found, so a login for an unknown email takes
// as long as a wrong password and doesn't reveal which emails exist.
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword('not-a-real-password');
  await verifyPassword(await dummyHash, password);
}
