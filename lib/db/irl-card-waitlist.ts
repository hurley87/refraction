import { supabase } from './client';

export const WELCOME_EMAIL_MAX_ATTEMPTS = 5;
export const LIST_SYNC_MAX_ATTEMPTS = 5;
const STALE_SENDING_MINUTES = 10;

export type WelcomeEmailStatus = 'pending' | 'sending' | 'sent' | 'failed';
export type ListSyncStatus = 'not_requested' | 'pending' | 'synced' | 'failed';

export type IrlCardWaitlistSignup = {
  id: string;
  email: string;
  emailNormalized: string;
  countryId: string;
  geoCityId: string;
  countryIso2: string;
  cityName: string;
  alreadyUsesIrl: boolean;
  playerId: number | null;
  privyUserId: string | null;
  marketingConsent: boolean;
  welcomeEmailStatus: WelcomeEmailStatus;
  welcomeEmailAttempts: number;
  listSyncStatus: ListSyncStatus;
  listSyncAttempts: number;
  createdAt: string;
};

type SignupRow = {
  id: string;
  email: string;
  email_normalized: string;
  country_id: string;
  geo_city_id: string;
  country_iso2: string;
  city_name: string;
  already_uses_irl: boolean;
  player_id: number | null;
  privy_user_id: string | null;
  marketing_consent: boolean;
  welcome_email_status: WelcomeEmailStatus;
  welcome_email_attempts: number;
  list_sync_status: ListSyncStatus;
  list_sync_attempts: number;
  created_at: string;
};

const COLUMNS =
  'id, email, email_normalized, country_id, geo_city_id, country_iso2, city_name, already_uses_irl, player_id, privy_user_id, marketing_consent, welcome_email_status, welcome_email_attempts, list_sync_status, list_sync_attempts, created_at';

function toSignup(row: SignupRow): IrlCardWaitlistSignup {
  return {
    id: row.id,
    email: row.email,
    emailNormalized: row.email_normalized,
    countryId: row.country_id,
    geoCityId: row.geo_city_id,
    countryIso2: row.country_iso2.trim().toUpperCase(),
    cityName: row.city_name,
    alreadyUsesIrl: row.already_uses_irl,
    playerId: row.player_id,
    privyUserId: row.privy_user_id,
    marketingConsent: row.marketing_consent,
    welcomeEmailStatus: row.welcome_email_status,
    welcomeEmailAttempts: row.welcome_email_attempts,
    listSyncStatus: row.list_sync_status,
    listSyncAttempts: row.list_sync_attempts,
    createdAt: row.created_at,
  };
}

export function normalizeWaitlistEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type WaitlistAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  source?: string;
  sourceRef?: string;
  landingPage?: string;
  referrer?: string;
};

export type InsertWaitlistSignupInput = {
  email: string;
  countryId: string;
  geoCityId: string;
  countryIso2: string;
  cityName: string;
  alreadyUsesIrl: boolean;
  playerId: number | null;
  privyUserId: string | null;
  marketingConsent: boolean;
  attribution?: WaitlistAttribution;
};

export async function getWaitlistSignupByEmail(
  email: string
): Promise<IrlCardWaitlistSignup | null> {
  const { data, error } = await supabase
    .from('irl_card_waitlist_signups')
    .select(COLUMNS)
    .eq('email_normalized', normalizeWaitlistEmail(email))
    .maybeSingle();

  if (error) throw error;
  return data ? toSignup(data as SignupRow) : null;
}

/**
 * Inserts once per normalized email. A repeat signup leaves the stored row
 * (answers, consent, first-touch attribution) unchanged.
 */
export async function upsertWaitlistSignup(
  input: InsertWaitlistSignupInput
): Promise<{ signup: IrlCardWaitlistSignup; created: boolean }> {
  const now = new Date().toISOString();
  const attribution = input.attribution ?? {};
  const payload = {
    email: input.email.trim(),
    email_normalized: normalizeWaitlistEmail(input.email),
    country_id: input.countryId,
    geo_city_id: input.geoCityId,
    country_iso2: input.countryIso2.trim().toUpperCase(),
    city_name: input.cityName.trim(),
    already_uses_irl: input.alreadyUsesIrl,
    player_id: input.playerId,
    privy_user_id: input.privyUserId,
    marketing_consent: input.marketingConsent,
    consent_at: input.marketingConsent ? now : null,
    list_sync_status: input.marketingConsent ? 'pending' : 'not_requested',
    utm_source: attribution.utmSource ?? null,
    utm_medium: attribution.utmMedium ?? null,
    utm_campaign: attribution.utmCampaign ?? null,
    utm_term: attribution.utmTerm ?? null,
    utm_content: attribution.utmContent ?? null,
    source: attribution.source ?? null,
    source_ref: attribution.sourceRef ?? null,
    landing_page: attribution.landingPage ?? null,
    referrer: attribution.referrer ?? null,
  };

  const { data, error } = await supabase
    .from('irl_card_waitlist_signups')
    .upsert(payload, {
      onConflict: 'email_normalized',
      ignoreDuplicates: true,
    })
    .select(COLUMNS);

  if (error) throw error;

  const inserted = (data as SignupRow[] | null)?.[0];
  if (inserted) {
    return { signup: toSignup(inserted), created: true };
  }

  const existing = await getWaitlistSignupByEmail(input.email);
  if (!existing) {
    throw new Error('Waitlist signup was not stored');
  }
  return { signup: existing, created: false };
}

export type WaitlistMemberPrefill = {
  email: string | null;
  countryId: string | null;
  city: { mapboxId: string; name: string; region: string | null } | null;
};

/** Email, country and saved city for a signed-in member's form prefill. */
export async function getWaitlistMemberPrefill(
  playerId: number
): Promise<WaitlistMemberPrefill> {
  const { data, error } = await supabase
    .from('players')
    .select('email, country_id, geo_city_id')
    .eq('id', playerId)
    .maybeSingle();
  if (error) throw error;

  const row = data as {
    email: string | null;
    country_id: string | null;
    geo_city_id: string | null;
  } | null;
  if (!row) return { email: null, countryId: null, city: null };

  let city: WaitlistMemberPrefill['city'] = null;
  if (row.geo_city_id) {
    const { data: cityRow, error: cityError } = await supabase
      .from('geo_cities')
      .select('mapbox_id, name, region, country_id')
      .eq('id', row.geo_city_id)
      .maybeSingle();
    if (cityError) throw cityError;
    const c = cityRow as {
      mapbox_id: string;
      name: string;
      region: string | null;
      country_id: string;
    } | null;
    if (c && (!row.country_id || c.country_id === row.country_id)) {
      city = { mapboxId: c.mapbox_id, name: c.name, region: c.region };
    }
  }

  return {
    email: row.email?.trim() || null,
    countryId: row.country_id,
    city,
  };
}

/** Links an anonymous signup to the member's player when they later join signed in. */
export async function linkWaitlistSignupToPlayer(
  id: string,
  playerId: number,
  privyUserId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('irl_card_waitlist_signups')
    .update({ player_id: playerId, privy_user_id: privyUserId })
    .eq('id', id)
    .is('player_id', null);

  if (error) throw error;
}

/**
 * Claims the welcome send. Only one caller gets the row back, so concurrent
 * requests and retries never send twice.
 */
export async function claimWelcomeSend(
  id: string
): Promise<IrlCardWaitlistSignup | null> {
  const { data, error } = await supabase.rpc('claim_irl_card_welcome_send', {
    p_id: id,
    p_max_attempts: WELCOME_EMAIL_MAX_ATTEMPTS,
    p_stale_after: `${STALE_SENDING_MINUTES} minutes`,
  });

  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as SignupRow | undefined;
  return row ? toSignup(row) : null;
}

export async function markWelcomeSent(id: string): Promise<void> {
  const { error } = await supabase
    .from('irl_card_waitlist_signups')
    .update({
      welcome_email_status: 'sent',
      welcome_email_sent_at: new Date().toISOString(),
      welcome_email_last_error: null,
    })
    .eq('id', id)
    .eq('welcome_email_status', 'sending');

  if (error) throw error;
}

export async function markWelcomeFailed(
  id: string,
  errorMessage: string
): Promise<void> {
  const { error } = await supabase
    .from('irl_card_waitlist_signups')
    .update({
      welcome_email_status: 'failed',
      welcome_email_last_error: errorMessage.slice(0, 500),
    })
    .eq('id', id)
    .eq('welcome_email_status', 'sending');

  if (error) throw error;
}

export async function markListSynced(
  id: string,
  attempts: number
): Promise<void> {
  const { error } = await supabase
    .from('irl_card_waitlist_signups')
    .update({
      list_sync_status: 'synced',
      list_sync_attempts: attempts,
      list_synced_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function markListFailed(
  id: string,
  attempts: number
): Promise<void> {
  const { error } = await supabase
    .from('irl_card_waitlist_signups')
    .update({ list_sync_status: 'failed', list_sync_attempts: attempts })
    .eq('id', id);

  if (error) throw error;
}

/** Signups whose welcome email or list sync still needs another try. */
export async function listRetryableSignups(
  limit = 50
): Promise<IrlCardWaitlistSignup[]> {
  const staleBefore = new Date(
    Date.now() - STALE_SENDING_MINUTES * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from('irl_card_waitlist_signups')
    .select(COLUMNS)
    .or(
      [
        `and(welcome_email_status.in.(pending,failed),welcome_email_attempts.lt.${WELCOME_EMAIL_MAX_ATTEMPTS})`,
        `and(welcome_email_status.eq.sending,welcome_email_claimed_at.lt.${staleBefore},welcome_email_attempts.lt.${WELCOME_EMAIL_MAX_ATTEMPTS})`,
        `and(list_sync_status.in.(pending,failed),list_sync_attempts.lt.${LIST_SYNC_MAX_ATTEMPTS})`,
      ].join(',')
    )
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return ((data as SignupRow[]) ?? []).map(toSignup);
}
