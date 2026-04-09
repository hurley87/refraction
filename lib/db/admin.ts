/**
 * Admin email addresses with elevated permissions
 */
export const ADMIN_EMAILS = [
  'dhurls99@gmail.com',
  'kaitlyn@refractionfestival.com',
  'jim@refractionfestival.com',
  'malcolm@refractionfestival.com',
  'lovegreg@gmail.com',
  'greg@refractionfestival.com',
  'graham@refractionfestival.com',
];

/**
 * Admin usernames (must match `players.username` for the creator wallet — not request body alone).
 */
export const ADMIN_USERNAMES = ['IDDQD'];

/**
 * Check if an email address has admin permissions
 */
export const checkAdminPermission = (email: string | undefined) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
};

/**
 * Case-insensitive match against {@link ADMIN_USERNAMES}.
 */
export const isAdminUsername = (username: string | null | undefined) => {
  if (!username?.trim()) return false;
  const normalized = username.trim().toLowerCase();
  return ADMIN_USERNAMES.some((a) => a.toLowerCase() === normalized);
};
