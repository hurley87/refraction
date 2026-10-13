/**
 * Move a member-written location description into that creator's single
 * check-in comment, then clear the description. Admin-created spots and
 * spots with no creator wallet are left alone.
 *
 * A comment only shows under CHECK-INS when visit_status is 'been'.
 * An existing want_to_try row is updated to been so the words appear.
 * If the creator already has a different comment, the spot is skipped
 * and the description is kept.
 *
 * Usage:
 *   node scripts/move-member-descriptions-to-comments.mjs           # dry-run
 *   node scripts/move-member-descriptions-to-comments.mjs --apply    # write
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const key = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!url.trim() || !key.trim()) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

if (process.argv.includes('--apply') && !serviceKey.trim()) {
  console.error('--apply requires SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');
const supabase = createClient(url, key);

/** Keep in sync with lib/db/admin.ts */
const ADMIN_EMAILS = new Set(
  [
    'dhurls99@gmail.com',
    'kaitlyn@refractionfestival.com',
    'jim@refractionfestival.com',
    'malcolm@refractionfestival.com',
    'lovegreg@gmail.com',
    'greg@refractionfestival.com',
    'graham@refractionfestival.com',
    'raf@refractionfestival.com',
  ].map((email) => email.toLowerCase())
);
const ADMIN_USERNAMES = new Set(['iddqd']);

const WALLET_FIELDS = [
  'wallet_address',
  'solana_wallet_address',
  'stellar_wallet_address',
  'aptos_wallet_address',
];

function isAdminUsername(username) {
  const normalized = username?.trim().toLowerCase();
  return Boolean(normalized && ADMIN_USERNAMES.has(normalized));
}

function isAdminEmail(email) {
  const normalized = email?.trim().toLowerCase();
  return Boolean(normalized && ADMIN_EMAILS.has(normalized));
}

async function fetchAll(table, select) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

function indexPlayers(players) {
  const byWallet = new Map();
  for (const player of players) {
    for (const field of WALLET_FIELDS) {
      const raw = player[field];
      if (typeof raw !== 'string' || !raw.trim()) continue;
      const trimmed = raw.trim();
      byWallet.set(trimmed, player);
      byWallet.set(trimmed.toLowerCase(), player);
    }
  }
  return byWallet;
}

function findPlayer(byWallet, walletAddress) {
  const trimmed = walletAddress.trim();
  return byWallet.get(trimmed) ?? byWallet.get(trimmed.toLowerCase()) ?? null;
}

async function fetchCheckinsForLocations(locationIds) {
  const byKey = new Map();
  for (let i = 0; i < locationIds.length; i += 200) {
    const chunk = locationIds.slice(i, i + 200);
    const { data, error } = await supabase
      .from('player_location_checkins')
      .select('id, player_id, location_id, comment, visit_status, checkin_at')
      .in('location_id', chunk);
    if (error) throw error;
    for (const row of data ?? []) {
      byKey.set(`${row.player_id}:${row.location_id}`, row);
    }
  }
  return byKey;
}

function planRow(location, player, existing) {
  const description = location.description.trim();
  const existingComment = (existing?.comment ?? '').trim();
  if (existingComment && existingComment !== description) {
    return { action: 'conflict' };
  }
  if (existingComment === description) {
    return { action: 'clear_only' };
  }
  return { action: existing ? 'update' : 'insert', playerId: player.id };
}

async function applyMove(location, player, existing) {
  const description = location.description.trim();
  if (!existing) {
    const { error } = await supabase.from('player_location_checkins').insert({
      player_id: player.id,
      location_id: location.id,
      points_earned: 0,
      visit_status: 'been',
      checkin_at: new Date().toISOString(),
      comment: description,
    });
    if (error) throw error;
  } else {
    const update = {
      visit_status: 'been',
      comment: description,
    };
    if (!existing.checkin_at) {
      update.checkin_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('player_location_checkins')
      .update(update)
      .eq('id', existing.id);
    if (error) throw error;
  }

  const { error: clearError } = await supabase
    .from('locations')
    .update({ description: null })
    .eq('id', location.id);
  if (clearError) throw clearError;
}

async function applyClear(locationId) {
  const { error } = await supabase
    .from('locations')
    .update({ description: null })
    .eq('id', locationId);
  if (error) throw error;
}

function bump(counts, key) {
  counts[key] = (counts[key] ?? 0) + 1;
}

async function main() {
  const [locations, players] = await Promise.all([
    fetchAll(
      'locations',
      'id, name, description, creator_wallet_address, creator_username'
    ),
    fetchAll(
      'players',
      'id, email, username, wallet_address, solana_wallet_address, stellar_wallet_address, aptos_wallet_address'
    ),
  ]);

  const byWallet = indexPlayers(players);
  const described = locations.filter(
    (location) => typeof location.description === 'string' && location.description.trim()
  );
  const withCreator = described.filter((location) =>
    location.creator_wallet_address?.trim()
  );
  const checkins = await fetchCheckinsForLocations(withCreator.map((location) => location.id));

  const counts = {};
  const samples = {};
  const note = (key, location) => {
    bump(counts, key);
    if (!samples[key]) samples[key] = [];
    if (samples[key].length < 8) {
      samples[key].push(`${location.id} ${location.name}`);
    }
  };

  for (const location of described) {
    if (!location.creator_wallet_address?.trim()) {
      note('skip_no_creator', location);
      continue;
    }

    const player = findPlayer(byWallet, location.creator_wallet_address);
    if (
      isAdminUsername(location.creator_username) ||
      isAdminUsername(player?.username) ||
      isAdminEmail(player?.email)
    ) {
      note('skip_admin', location);
      continue;
    }
    if (!player?.id) {
      note('skip_no_player', location);
      continue;
    }

    const existing = checkins.get(`${player.id}:${location.id}`) ?? null;
    const decision = planRow(location, player, existing);
    if (decision.action === 'conflict') {
      note('skip_conflict', location);
      continue;
    }

    note(decision.action, location);
    if (!APPLY) continue;

    if (decision.action === 'clear_only') {
      await applyClear(location.id);
    } else {
      await applyMove(location, player, existing);
    }
  }

  console.log(APPLY ? 'Applied.' : 'Dry run. Re-run with --apply to write.');
  console.log(JSON.stringify(counts, null, 2));
  for (const [key, rows] of Object.entries(samples)) {
    console.log(`\n${key}`);
    for (const row of rows) console.log(`  ${row}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
