import { supabase } from './client';
import {
  CONVERSION_COLS,
  SESSION_COLS,
  SPEND_TX_COLS,
  rowToConversion,
  rowToSession,
  rowToSpendTransaction,
  toNum,
} from './spend-ledger-rows';
import type {
  PointConversion,
  SpendSession,
  SpendTransaction,
} from '@/lib/types';

export type SpendPilotAdminTotals = {
  /** Distinct users with status `funded` conversion */
  usersConverted: number;
  totalUsdcDistributed: number;
  totalUsdcReceivedAtEventWallet: number;
  spendSessionsCount: number;
};

export async function getSpendPilotAdminTotals(
  spendExperienceId: string
): Promise<SpendPilotAdminTotals> {
  const [fundedAgg, confirmedPaymentsAgg, sessionsCountRes] = await Promise.all(
    [
      supabase
        .from('point_conversions')
        .select('user_id, usdc_amount')
        .eq('spend_experience_id', spendExperienceId)
        .eq('status', 'funded'),
      supabase
        .from('spend_transactions')
        .select('usdc_amount')
        .eq('spend_experience_id', spendExperienceId)
        .eq('status', 'confirmed'),
      supabase
        .from('spend_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('spend_experience_id', spendExperienceId),
    ]
  );

  if (fundedAgg.error) {
    console.error('getSpendPilotAdminTotals funded:', fundedAgg.error);
    throw new Error(fundedAgg.error.message || 'Failed to sum conversions');
  }
  if (confirmedPaymentsAgg.error) {
    console.error(
      'getSpendPilotAdminTotals payments:',
      confirmedPaymentsAgg.error
    );
    throw new Error(
      confirmedPaymentsAgg.error.message || 'Failed to sum payments'
    );
  }
  if (sessionsCountRes.error) {
    console.error('getSpendPilotAdminTotals sessions:', sessionsCountRes.error);
    throw new Error(
      sessionsCountRes.error.message || 'Failed to count sessions'
    );
  }

  const fundedRows = fundedAgg.data ?? [];
  const userIds = new Set(fundedRows.map((r) => String(r.user_id)));
  const totalUsdcDistributed = fundedRows.reduce<number>(
    (sum, r) => sum + toNum(r.usdc_amount),
    0
  );

  const paymentRows = confirmedPaymentsAgg.data ?? [];
  const totalUsdcReceivedAtEventWallet = paymentRows.reduce<number>(
    (sum, r) => sum + toNum(r.usdc_amount),
    0
  );

  return {
    usersConverted: userIds.size,
    totalUsdcDistributed,
    totalUsdcReceivedAtEventWallet,
    spendSessionsCount: sessionsCountRes.count ?? 0,
  };
}

const ACTIVITY_SESSION_LIMIT = 200;
const FAILED_LIMIT = 100;

export type SpendPilotSessionActivityRow = {
  session: SpendSession;
  conversion: PointConversion | null;
  payment: SpendTransaction | null;
};

export async function listSpendPilotActivityForExperience(
  spendExperienceId: string
): Promise<{
  sessions: SpendPilotSessionActivityRow[];
  failedConversions: PointConversion[];
  failedPayments: SpendTransaction[];
}> {
  const { data: sessionRows, error: sessErr } = await supabase
    .from('spend_sessions')
    .select(SESSION_COLS)
    .eq('spend_experience_id', spendExperienceId)
    .order('created_at', { ascending: false })
    .limit(ACTIVITY_SESSION_LIMIT);

  if (sessErr) {
    console.error('listSpendPilotActivityForExperience sessions:', sessErr);
    throw new Error(sessErr.message || 'Failed to load sessions');
  }

  const sessions = (sessionRows ?? []).map((row) =>
    rowToSession(row as Record<string, unknown>)
  );
  const sessionIds = sessions.map((s) => s.id);

  const conversionsBySession = new Map<string, PointConversion>();
  const paymentsBySession = new Map<string, SpendTransaction>();

  if (sessionIds.length > 0) {
    const [convRes, payRes] = await Promise.all([
      supabase
        .from('point_conversions')
        .select(CONVERSION_COLS)
        .eq('spend_experience_id', spendExperienceId)
        .in('spend_session_id', sessionIds),
      supabase
        .from('spend_transactions')
        .select(SPEND_TX_COLS)
        .eq('spend_experience_id', spendExperienceId)
        .in('spend_session_id', sessionIds),
    ]);

    if (convRes.error) {
      console.error('listSpendPilotActivityForExperience conv:', convRes.error);
      throw new Error(convRes.error.message || 'Failed to load conversions');
    }
    if (payRes.error) {
      console.error('listSpendPilotActivityForExperience pay:', payRes.error);
      throw new Error(payRes.error.message || 'Failed to load payments');
    }

    for (const row of convRes.data ?? []) {
      const c = rowToConversion(row as Record<string, unknown>);
      conversionsBySession.set(c.spend_session_id, c);
    }
    for (const row of payRes.data ?? []) {
      const p = rowToSpendTransaction(row as Record<string, unknown>);
      paymentsBySession.set(p.spend_session_id, p);
    }
  }

  const activitySessions: SpendPilotSessionActivityRow[] = sessions.map(
    (session) => ({
      session,
      conversion: conversionsBySession.get(session.id) ?? null,
      payment: paymentsBySession.get(session.id) ?? null,
    })
  );

  const [failedConvRes, failedPayRes] = await Promise.all([
    supabase
      .from('point_conversions')
      .select(CONVERSION_COLS)
      .eq('spend_experience_id', spendExperienceId)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(FAILED_LIMIT),
    supabase
      .from('spend_transactions')
      .select(SPEND_TX_COLS)
      .eq('spend_experience_id', spendExperienceId)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(FAILED_LIMIT),
  ]);

  if (failedConvRes.error) {
    console.error(
      'listSpendPilotActivityForExperience failed conv:',
      failedConvRes.error
    );
    throw new Error(
      failedConvRes.error.message || 'Failed to load failed conversions'
    );
  }
  if (failedPayRes.error) {
    console.error(
      'listSpendPilotActivityForExperience failed pay:',
      failedPayRes.error
    );
    throw new Error(
      failedPayRes.error.message || 'Failed to load failed payments'
    );
  }

  return {
    sessions: activitySessions,
    failedConversions: (failedConvRes.data ?? []).map((row) =>
      rowToConversion(row as Record<string, unknown>)
    ),
    failedPayments: (failedPayRes.data ?? []).map((row) =>
      rowToSpendTransaction(row as Record<string, unknown>)
    ),
  };
}
