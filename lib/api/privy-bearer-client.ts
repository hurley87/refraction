import { apiClient } from '@/lib/api/client';

/** Authenticated JSON POST using a Privy access token. */
export async function apiClientBearerPost<T>(
  token: string,
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  return apiClient<T>(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/** Authenticated GET using a Privy access token. */
export async function apiClientBearerGet<T>(
  token: string,
  path: string
): Promise<T> {
  return apiClient<T>(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
}
