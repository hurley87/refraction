/**
 * True when an error from @supabase/supabase-js looks like a transport /
 * connectivity failure (not a SQL/RLS/not-found issue).
 */
export function isSupabaseNetworkError(error: unknown): boolean {
  const collect = (e: unknown): string => {
    if (e instanceof Error) {
      const causeMsg = e.cause ? collect(e.cause) : '';
      return `${e.message} ${causeMsg}`;
    }
    if (typeof e === 'object' && e !== null && 'message' in e) {
      const m = (e as { message: unknown }).message;
      return typeof m === 'string' ? m : '';
    }
    return String(e ?? '');
  };

  const text = collect(error).toLowerCase();
  return (
    text.includes('fetch failed') ||
    text.includes('network error') ||
    text.includes('econnrefused') ||
    text.includes('enotfound') ||
    text.includes('etimedout') ||
    text.includes('eai_again') ||
    text.includes('getaddrinfo') ||
    text.includes('certificate') ||
    text.includes('ssl') ||
    text.includes('aborted') ||
    text.includes('socket')
  );
}
