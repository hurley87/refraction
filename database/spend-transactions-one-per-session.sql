-- Enforce at most one spend_transaction row per session (idempotent payment / retries).
-- Safe to apply after spend-pilot-sessions-ledger.sql; drops redundant partial unique if present.

DROP INDEX IF EXISTS idx_spend_transactions_one_confirmed_per_session;

CREATE UNIQUE INDEX IF NOT EXISTS idx_spend_transactions_session_unique
    ON spend_transactions (spend_session_id);
