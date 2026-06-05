import { isClientFetchNetworkError } from '@/lib/api/network-error';

import type { ApiResponse } from './response';

/**
 * Custom error class for API errors with status code
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Type-safe API client wrapper that handles standardized API responses
 * @param endpoint - API endpoint URL
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Promise resolving to the data from the API response
 * @throws ApiError if the request fails or response indicates failure
 */
export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(endpoint, options);
  } catch (error) {
    if (isClientFetchNetworkError(error)) {
      throw new ApiError(0, 'Network request failed', error);
    }
    throw error;
  }

  const json: ApiResponse<T> = await response.json();

  if (!response.ok || !json.success) {
    throw new ApiError(
      response.status,
      json.error || 'Request failed',
      json.details
    );
  }

  return json.data as T;
}
