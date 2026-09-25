// Escape LIKE/ILIKE wildcards so user input matches literally:
// a search for "50%" means the text "50%", not "50 followed by anything".
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
