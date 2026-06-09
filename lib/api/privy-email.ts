/** Omit blank Privy email strings from API request bodies (matches optionalEmailSchema). */
export function optionalPrivyEmailBody(emailAddress: string | undefined): {
  email?: string;
} {
  const email = emailAddress?.trim();
  return email ? { email } : {};
}
