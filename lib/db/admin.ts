/**
 * Admin email addresses with elevated permissions
 */
export const ADMIN_EMAILS = [
  "dhurls99@gmail.com",
  "kaitlyn@refractionfestival.com",
  "jim@refractionfestival.com",
  "malcolm@refractionfestival.com",
  "lovegreg@gmail.com",
  "greg@refractionfestival.com",
];

/**
 * Check if an email address has admin permissions
 */
export const checkAdminPermission = (email: string | undefined) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
};

