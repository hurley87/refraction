import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Standardized API response type
 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/**
 * Returns a successful API response
 * @param data - The data to return
 * @param message - Optional success message
 * @param status - HTTP status code (default: 200)
 */
export function apiSuccess<T>(
  data: T,
  message?: string,
  status = 200,
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  return NextResponse.json(response, { status });
}

/**
 * Returns an error API response
 * @param error - Error message
 * @param status - HTTP status code (default: 500)
 */
export function apiError(
  error: string,
  status: 400 | 404 | 429 | 500 = 500,
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status },
  );
}

/**
 * Returns a validation error response from Zod errors
 * @param zodError - Zod validation error
 * @param status - HTTP status code (default: 400)
 */
export function apiValidationError(
  zodError: ZodError,
  status = 400,
): NextResponse<ApiResponse> {
  // Format Zod errors into a readable message
  const errorMessages = zodError.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  const errorMessage =
    errorMessages.length === 1
      ? errorMessages[0]
      : `Validation failed: ${errorMessages.join("; ")}`;

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
    },
    { status },
  );
}

