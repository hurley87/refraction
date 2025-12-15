import type { ApiResponse } from './response';

/**
 * Custom error class for API errors with status code
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
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
  const response = await fetch(endpoint, options);
  const json: ApiResponse<T> = await response.json();
  
  if (!response.ok || !json.success) {
    throw new ApiError(response.status, json.error || 'Request failed');
  }
  
  return json.data as T;
}

