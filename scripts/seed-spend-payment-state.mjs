// One-off dev helper: push an existing spend session into the "ready to pay" state
// (session.status='conversion_complete' + a funded point_conversions row) so /spend/[id]
// renders the payment ("time to purchase") screen without a real on-chain conversion.
//
// A session must already exist for the experience — load /spend/<id> while logged in once.
//
// Usage: node scripts/seed-spend-payment-state.mjs [experienceId]
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

const experienceId = process.argv[2] ?? 'c114854a-255f-4f92-b8ff-de42b2416f36';
const PLACEHOLDER_TX = '0x' + 'ab'.repeat(32);

async function main() {
  const expRes = await supabase
    .from('spend_experiences')
    .select(
      'id, status, spend_rail, points_to_usdc_rate, max_usdc_per_user, treasury_wallet_address'
    )
    .eq('id', experienceId)
    .maybeSingle();

  if (expRes.error || !expRes.data) {
    console.error('Experience not found:', experienceId, expRes.error?.message ?? '');
    process.exit(1);
  }
  const exp = expRes.data;

  // Find the most recent session for this experience (created when the user loaded the page).
  const sessRes = await supabase
    .from('spend_sessions')
    .select('id, user_id, wallet_address, spend_rail, status, expires_at')
    .eq('spend_experience_id', experienceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessRes.error) {
    console.error('Session lookup failed:', sessRes.error.message);
    process.exit(1);
  }
  if (!sessRes.data) {
    console.error(
      `No spend_session found for experience ${experienceId}.\n` +
        `Load /spend/${experienceId} while logged in (so a session row is created), then rerun.`
    );
    process.exit(2);
  }
  const session = sessRes.data;

  const usdcAmount = Number(exp.max_usdc_per_user);
  const pointsRequired = Math.ceil(usdcAmount * Number(exp.points_to_usdc_rate));

  // Promote the session to conversion_complete (required by payment/prepare gating).
  const updSess = await supabase
    .from('spend_sessions')
    .update({ status: 'conversion_complete' })
    .eq('id', session.id);
  if (updSess.error) {
    console.error('Failed to update session status:', updSess.error.message);
    process.exit(1);
  }

  // Upsert a funded point_conversions row for this session.
  const existingConv = await supabase
    .from('point_conversions')
    .select('id')
    .eq('spend_session_id', session.id)
    .maybeSingle();

  const fundedFields = {
    status: 'funded',
    points_deducted: pointsRequired,
    usdc_amount: usdcAmount,
    treasury_wallet_address: exp.treasury_wallet_address,
    user_wallet_address: session.wallet_address,
    funding_tx_hash: PLACEHOLDER_TX,
    completed_at: new Date().toISOString(),
    failed_reason: null,
  };

  let conversionId;
  if (existingConv.data) {
    const upd = await supabase
      .from('point_conversions')
      .update(fundedFields)
      .eq('id', existingConv.data.id)
      .select('id')
      .single();
    if (upd.error) {
      console.error('Failed to update conversion:', upd.error.message);
      process.exit(1);
    }
    conversionId = upd.data.id;
  } else {
    const ins = await supabase
      .from('point_conversions')
      .insert({
        spend_experience_id: experienceId,
        spend_session_id: session.id,
        user_id: session.user_id,
        spend_rail: exp.spend_rail,
        idempotency_key: `fund_user:dev:${session.id}`,
        ...fundedFields,
      })
      .select('id')
      .single();
    if (ins.error) {
      console.error('Failed to insert conversion:', ins.error.message);
      process.exit(1);
    }
    conversionId = ins.data.id;
  }

  console.log('Session promoted to ready-to-pay:');
  console.log(
    JSON.stringify(
      {
        experienceId,
        sessionId: session.id,
        wallet: session.wallet_address,
        sessionStatus: 'conversion_complete',
        conversionId,
        conversionStatus: 'funded',
        usdcAmount,
        pointsRequired,
      },
      null,
      2
    )
  );
  console.log(`\nRefresh: /spend/${experienceId} (logged in as the session owner)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
