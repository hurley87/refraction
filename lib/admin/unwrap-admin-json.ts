/**
 * Admin API responses use `apiSuccess` (`{ data: T }`). Some callers still send a bare payload — accept both.
 */
export function unwrapAdminJson<T>(responseData: unknown): T {
  const body = responseData as { data?: T };
  return (body.data ?? body) as T;
}
