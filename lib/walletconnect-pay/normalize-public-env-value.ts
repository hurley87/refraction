/**
 * Trims and strips a single layer of wrapping quotes from env values pasted into
 * `.env` (e.g. `KEY="abc"` or accidental `KEY='"abc"'`).
 */
export function normalizePublicEnvValue(value: string): string {
  const t = value.trim();
  if (t.length >= 2) {
    const a = t[0];
    const b = t[t.length - 1];
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}
