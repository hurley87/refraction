/**
 * Builds `Authorization: Bearer` headers for browser calls to admin API routes
 * that verify the Privy access token on the server.
 */
export async function adminApiAuthHeaders(
  getAccessToken: () => Promise<string | null | undefined>
): Promise<{ Authorization: string }> {
  const token = await getAccessToken();
  const trimmed = token?.trim();
  if (!trimmed) {
    throw new Error('Missing authorization token');
  }
  return { Authorization: `Bearer ${trimmed}` };
}
