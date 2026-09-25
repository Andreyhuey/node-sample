import { describe, expect, it } from 'vitest';
import { api } from './helpers';

describe('health and fallbacks', () => {
  it('GET /health returns ok', async () => {
    const res = await api.get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('unknown routes return a JSON 404', async () => {
    const res = await api.get('/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
