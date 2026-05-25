/**
 * Drops null, undefined, and empty-string values before sending to Mixpanel.
 */
export function compactAnalyticsEventProps(
  properties: Record<string, unknown>
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([, v]) => v !== undefined && v !== null && v !== ''
    )
  ) as Record<string, string | number | boolean>;
}
