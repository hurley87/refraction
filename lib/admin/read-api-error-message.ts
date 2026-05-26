/** Parse `apiError` / legacy `{ message }` shapes from JSON admin API responses. */
export function readApiErrorMessage(
  body: Record<string, unknown>,
  fallback: string
): string {
  if (typeof body.error === 'string') return body.error;
  if (typeof body.message === 'string') return body.message;
  return fallback;
}
