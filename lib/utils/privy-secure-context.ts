/** Hostnames where Privy allows embedded wallets over plain HTTP (browser secure-context exception). */
const PRIVY_HTTP_ALLOWED_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

/**
 * Mirrors `@privy-io/react-auth` PrivyProvider init: embedded wallets require HTTPS
 * except on localhost / 127.0.0.1 (and chrome-extension: for extension embeds).
 */
export function isPrivyEmbeddedWalletContext(location?: Location): boolean {
  if (typeof window === 'undefined' && !location) {
    return true;
  }

  const resolved = location ?? window.location;
  if (PRIVY_HTTP_ALLOWED_HOSTNAMES.has(resolved.hostname)) {
    return true;
  }

  return (
    resolved.protocol === 'https:' || resolved.protocol === 'chrome-extension:'
  );
}

/** Build an HTTPS URL for the current page (path + query + hash preserved). */
export function getHttpsRedirectUrl(location: Location): string {
  const url = new URL(location.href);
  url.protocol = 'https:';
  return url.toString();
}
