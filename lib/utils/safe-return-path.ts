/**
 * Allow only same-app relative paths for `returnTo`-style query params (open-redirect safe).
 */
export function sanitizeInternalReturnPath(
  value: string | null
): string | null {
  if (value == null) return null;
  let path: string;
  try {
    path = decodeURIComponent(value.trim());
  } catch {
    return null;
  }
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) return null;
  return path;
}
