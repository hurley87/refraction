import { MAX_VARCHAR_LENGTH } from "@/lib/constants";

/**
 * Sanitizes a required string value by trimming and truncating to max length.
 * Returns the sanitized string.
 */
export const sanitizeVarchar = (
  value: string,
  maxLength: number = MAX_VARCHAR_LENGTH,
): string => {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

/**
 * Sanitizes an optional string value by trimming and truncating to max length.
 * Returns null if the value is empty, null, undefined, or not a string.
 */
export const sanitizeOptionalVarchar = (
  value?: string | null,
  maxLength: number = MAX_VARCHAR_LENGTH,
): string | null => {
  if (!value) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

/**
 * Sanitizes an unknown value, returning undefined if it's not a valid non-empty string.
 * Useful for validating request body fields where the type is unknown.
 */
export const sanitizeString = (
  value: unknown,
  maxLength: number = MAX_VARCHAR_LENGTH,
): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, maxLength);
};

/**
 * Validates and sanitizes a URL string.
 * Returns the sanitized URL if valid, or an error object if invalid.
 */
export const validateUrl = (
  url: string | null | undefined,
  maxLength: number = MAX_VARCHAR_LENGTH,
): { valid: true; url: string | null } | { valid: false; error: string } => {
  if (!url || typeof url !== "string") {
    return { valid: true, url: null };
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: true, url: null };
  }

  try {
    const parsed = new URL(trimmed);
    // Only allow http/https protocols for security
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, error: "URL must use http or https protocol" };
    }
    const sanitized = sanitizeOptionalVarchar(trimmed, maxLength);
    return { valid: true, url: sanitized };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
};
