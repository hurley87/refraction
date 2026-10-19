/** Public name used in metadata and structured data. */
export const SITE_NAME = 'IRL';

/** Same sentence as the root metadata description. */
export const SITE_DESCRIPTION =
  "Culture's rewards program. Music, Art, Events. Access Worldwide.";

/** Favicon served from `app/icon.svg`. Declared large enough for Google's logo guideline. */
export const SITE_LOGO_PATH = '/icon.svg';

/** Profile links in `components/layout/footer.tsx`. */
export const IRL_INSTAGRAM_URL = 'https://www.instagram.com/irl_energy/';
export const IRL_X_URL = 'https://x.com/irl_energy';
export const IRL_TELEGRAM_URL = 'https://t.me/irlnetwork';

/** Sister site. Not linked from the footer. */
export const REFRACTION_FESTIVAL_URL = 'https://refractionfestival.com';

/** Profiles Google can use to disambiguate IRL. */
export const SITE_SAME_AS = [
  IRL_INSTAGRAM_URL,
  IRL_X_URL,
  REFRACTION_FESTIVAL_URL,
] as const;
