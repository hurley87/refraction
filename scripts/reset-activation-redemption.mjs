// One-off dev helper: reset a sponsored-activation redemption back to the
// "confirm purchase" stage (status `eligible`) for UX re-testing.
// Writes directly via the Supabase service-role client. NOT for production data.
//
// Usage:
//   node scripts/reset-activation-redemption.mjs            # reset most-recently-updated redemption
//   node scripts/reset-activation-redemption.mjs <redemptionId>
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const url =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

if (!url.trim() || !key.trim()) {
  console.error(
    'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local'
  );
  process.exit(1);
}

const supabase = createClient(url, key);
const TABLE = 'activation_redemption';
const targetId = process.argv[2] ?? null;

async function main() {
  let row;
  if (targetId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', targetId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      console.error(`No redemption found with id ${targetId}`);
      process.exit(1);
    }
    row = data;
  } else {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      console.error('No activation_redemption rows exist.');
      process.exit(1);
    }
    row = data;
  }

  console.log('Resetting redemption:');
  console.log({
    id: row.id,
    activation_id: row.activation_id,
    reward_item_id: row.reward_item_id,
    user_id: row.user_id,
    status: row.status,
    points_spent: row.points_spent,
    purchase_confirmed_at: row.purchase_confirmed_at,
    redeemed_at: row.redeemed_at,
  });

  const now = new Date().toISOString();
  const { data: updated, error: updErr } = await supabase
    .from(TABLE)
    .update({
      status: 'eligible',
      points_spent: null,
      usdc_amount_snapshot: null,
      purchase_confirmed_at: null,
      redeemed_at: null,
      cancelled_reason: null,
      updated_at: now,
    })
    .eq('id', row.id)
    .select('*')
    .single();

  if (updErr) throw new Error(updErr.message);

  console.log('\nDone. New state:');
  console.log({ id: updated.id, status: updated.status });
  console.log(
    '\nRefresh the activation page — you should be back at "confirm purchase".'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
