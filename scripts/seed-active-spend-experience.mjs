// One-off dev helper: seed an ACTIVE spend experience for UX iteration on /spend/[id].
// Skips the Privy server-wallet provisioning and the Base activation funding gate by
// writing directly via the Supabase service-role client. NOT for production data.
//
// Usage: node scripts/seed-active-spend-experience.mjs
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

if (!url.trim() || !key.trim()) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

const PLACEHOLDER_ADDR = '0x000000000000000000000000000000000000dEaD';

async function main() {
  // Todo 1: confirm the table + server-wallet/rail migration columns exist.
  const probe = await supabase
    .from('spend_experiences')
    .select('id, status, spend_rail, server_wallet_address')
    .limit(1);

  if (probe.error) {
    console.error('Schema probe failed:', probe.error.message);
    console.error(
      'Ensure spend-experiences-schema.sql + add-spend-rail / add-server-wallet migrations are applied.'
    );
    process.exit(1);
  }
  console.log('Schema OK (spend_experiences with spend_rail + server_wallet_address).');

  // Todo 2: insert an active row with a past start and a future end.
  const now = Date.now();
  const insert = await supabase
    .from('spend_experiences')
    .insert({
      title: 'UX dev experience',
      description: 'Local UI iteration',
      status: 'active',
      spend_rail: 'base_usdc',
      points_to_usdc_rate: 1000,
      max_usdc_per_user: 1,
      treasury_wallet_address: PLACEHOLDER_ADDR,
      receiving_wallet_address: PLACEHOLDER_ADDR,
      server_wallet_address: PLACEHOLDER_ADDR,
      server_wallet_chain: 'base-mainnet',
      start_time: new Date(now - 60 * 60 * 1000).toISOString(),
      end_time: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id, status, start_time, end_time')
    .single();

  if (insert.error) {
    console.error('Insert failed:', insert.error.message);
    process.exit(1);
  }

  console.log('Inserted active spend experience:');
  console.log(JSON.stringify(insert.data, null, 2));
  console.log(`\nOpen: /spend/${insert.data.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
