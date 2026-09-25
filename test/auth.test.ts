import { describe, expect, it } from 'vitest';
import { createUserAccount } from '../src/modules/auth/auth.service';
import { api, as, createDoctor } from './helpers';

const registration = {
  firstName: 'Ada',
  lastName: 'Obi',
  email: 'ada@example.com',
  dateOfBirth: '1990-04-01',
  password: 'correct horse battery',
};

// Pulls "refresh_token=..." out of a response's Set-Cookie header.
function refreshCookie(res: { headers: Record<string, unknown> }): string {
  const cookies = (res.headers['set-cookie'] as string[] | undefined) ?? [];
  const cookie = cookies.find((c) => c.startsWith('refresh_token='));
  if (!cookie) throw new Error('no refresh_token cookie');
  return cookie.split(';')[0];
}

describe('auth', () => {
  it('registers a patient and returns an access token plus an httpOnly refresh cookie', async () => {
    const res = await api.post('/auth/register').send(registration).expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: 'ada@example.com', role: 'patient' });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.refreshToken).toBeUndefined();

    const setCookie = (res.headers['set-cookie'] as unknown as string[]).join(';');
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Strict/);
    expect(setCookie).toMatch(/Path=\/auth/);
  });

  it('links the new account to a patient record the patient can read', async () => {
    const reg = await api.post('/auth/register').send(registration).expect(201);
    const me = as(reg.body.accessToken);
    const patientId = reg.body.user.patientId;

    await me.get(`/patients/${patientId}`).expect(200);
    const profile = await me.get('/auth/me').expect(200);
    expect(profile.body.id).toBe(reg.body.user.id);
  });

  it('rejects a duplicate email and a short password', async () => {
    await api.post('/auth/register').send(registration).expect(201);
    await api.post('/auth/register').send(registration).expect(409);
    await api
      .post('/auth/register')
      .send({ ...registration, email: 'b@example.com', password: 'short' })
      .expect(400);
  });

  it('logs in with the right password only, with the same error for unknown emails', async () => {
    await api.post('/auth/register').send(registration).expect(201);

    await api
      .post('/auth/login')
      .send({ email: 'ADA@example.com', password: registration.password })
      .expect(200);

    const wrong = await api
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'wrong password' })
      .expect(401);
    const unknown = await api
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong password' })
      .expect(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('requires a valid bearer token on protected routes', async () => {
    await api.get('/appointments').expect(401);
    await as('not-a-jwt').get('/appointments').expect(401);
  });

  it('rotates refresh tokens and ends every session when an old one is reused', async () => {
    const reg = await api.post('/auth/register').send(registration).expect(201);
    const first = refreshCookie(reg);

    const refreshed = await api.post('/auth/refresh').set('Cookie', first).expect(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    const second = refreshCookie(refreshed);
    expect(second).not.toBe(first);

    // Replaying the first token looks like theft...
    await api.post('/auth/refresh').set('Cookie', first).expect(401);
    // ...so the newer token is revoked too.
    await api.post('/auth/refresh').set('Cookie', second).expect(401);
  });

  it('logout revokes the refresh token', async () => {
    const reg = await api.post('/auth/register').send(registration).expect(201);
    const cookie = refreshCookie(reg);
    await api.post('/auth/logout').set('Cookie', cookie).expect(204);
    await api.post('/auth/refresh').set('Cookie', cookie).expect(401);
  });

  it('lets an admin give a doctor a login', async () => {
    const adminUser = await createUserAccount({
      email: 'admin@example.com',
      password: 'admin password',
      role: 'admin',
    });
    const login = await api
      .post('/auth/login')
      .send({ email: adminUser.email, password: 'admin password' })
      .expect(200);

    const doctor = await createDoctor({ email: 'dr@example.com' });
    await as(login.body.accessToken)
      .post(`/doctors/${doctor.id}/account`)
      .send({ password: 'doctor password' })
      .expect(201);

    const doctorLogin = await api
      .post('/auth/login')
      .send({ email: 'dr@example.com', password: 'doctor password' })
      .expect(200);
    expect(doctorLogin.body.user).toMatchObject({ role: 'doctor', doctorId: doctor.id });
  });
});
