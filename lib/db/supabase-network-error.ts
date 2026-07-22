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

type SupabaseNetworkRetryOptions = {
  maxAttempts?: number;
  delayMs?: number;
};

/**
 * Retries an idempotent Supabase operation only for transport failures.
 * SQL, authorization, and validation errors are returned immediately.
 */
export async function retrySupabaseNetworkOperation<T>(
  operation: () => Promise<T>,
  options: SupabaseNetworkRetryOptions = {}
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 2);
  const delayMs = Math.max(0, options.delayMs ?? 50);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isSupabaseNetworkError(error) || attempt === maxAttempts) {
        throw error;
      }
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error('Supabase operation exhausted retry attempts');
}
