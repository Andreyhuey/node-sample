import { sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { AppError } from '../errors';

// ?limit=20&cursor=... on every list endpoint.
export const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

// A cursor points at the last row of the previous page: its sort value and
// its id (the tie-breaker when two rows share a sort value). It is opaque to
// clients, so the format can change without breaking them.
type Cursor = { value: string; id: string };

const cursorSchema = z.object({ value: z.string(), id: z.string().uuid() });

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeCursor(raw: string): Cursor {
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(raw, 'base64url').toString()));
  } catch {
    throw new AppError(400, 'INVALID_CURSOR', 'cursor is invalid');
  }
}

/**
 * WHERE clause for "rows after the cursor" in ascending (sortCol, idCol)
 * order. Postgres compares the two columns as a pair, so this matches the
 * ORDER BY exactly and can use a composite index on (sortCol, id).
 *
 * This is keyset pagination. Unlike OFFSET, it doesn't slow down on deep
 * pages and doesn't skip or repeat rows when rows are inserted meanwhile.
 */
export function afterCursor(sortCol: AnyColumn, idCol: AnyColumn, cursor: Cursor): SQL {
  return sql`(${sortCol}, ${idCol}) > (${cursor.value}, ${cursor.id})`;
}

/**
 * Callers fetch limit + 1 rows. The extra row only tells us whether another
 * page exists, and is dropped from the response.
 */
export function toPage<T extends { id: string }>(
  rows: T[],
  limit: number,
  sortValue: (row: T) => string,
) {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const last = data.at(-1);
  return {
    data,
    nextCursor:
      hasMore && last ? encodeCursor({ value: sortValue(last), id: last.id }) : null,
  };
}
