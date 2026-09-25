import { describe, expect, it } from 'vitest';
import { admin, createPatient } from './helpers';

async function collectPages(path: string) {
  const ids: string[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const url: string = cursor ? `${path}&cursor=${cursor}` : path;
    const res = await admin.get(url).expect(200);
    ids.push(...res.body.data.map((p: { id: string }) => p.id));
    cursor = res.body.nextCursor;
    pages++;
  } while (cursor);
  return { ids, pages };
}

describe('pagination', () => {
  it('walks every row exactly once, even with duplicate sort values', async () => {
    // 5 patients share a last name, so the id tie-breaker matters.
    for (let i = 0; i < 12; i++) {
      await createPatient({ lastName: i % 2 === 0 ? 'Smith' : `Name${i}` });
    }

    const { ids, pages } = await collectPages('/patients?limit=5');
    expect(pages).toBe(3);
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
  });

  it('returns nextCursor null on the last page', async () => {
    await createPatient();
    const res = await admin.get('/patients?limit=5').expect(200);
    expect(res.body.nextCursor).toBeNull();
  });

  it('rejects a bad limit or cursor', async () => {
    await admin.get('/patients?limit=0').expect(400);
    await admin.get('/patients?limit=101').expect(400);
    const res = await admin.get('/patients?cursor=garbage').expect(400);
    expect(res.body.error.code).toBe('INVALID_CURSOR');
  });
});
