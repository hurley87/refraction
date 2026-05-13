-- IRL-28: Full payment prepare-operation lifecycle (prepared → submitted → terminal) with
-- retry metadata and needs_review for unresolved on-chain verification.

-- ---------------------------------------------------------------------------
-- Status CHECK: align with SpendRailPaymentOperationStatus vocabulary
-- ---------------------------------------------------------------------------
ALTER TABLE spend_payment_prepare_operations
  DROP CONSTRAINT IF EXISTS spend_payment_prepare_operations_status_check;

ALTER TABLE spend_payment_prepare_operations
  ADD CONSTRAINT spend_payment_prepare_operations_status_check
  CHECK (status IN (
    'prepared',
    'submitted',
    'confirmed',
    'failed',
    'needs_review'
  ));

COMMENT ON CONSTRAINT spend_payment_prepare_operations_status_check
  ON spend_payment_prepare_operations IS
  'Payment operation lifecycle (IRL-28); canonical with spend_transactions for tx hash / verification.';

-- ---------------------------------------------------------------------------
-- Retry / failure / ambiguity metadata
-- ---------------------------------------------------------------------------
ALTER TABLE spend_payment_prepare_operations
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE spend_payment_prepare_operations
  ADD COLUMN IF NOT EXISTS last_failure_reason TEXT;

ALTER TABLE spend_payment_prepare_operations
  ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMPTZ;

ALTER TABLE spend_payment_prepare_operations
  ADD COLUMN IF NOT EXISTS last_ambiguity_metadata JSONB;

COMMENT ON COLUMN spend_payment_prepare_operations.attempt_count IS
  'Increments when a failed-without-blocked-retry prepare is reset to prepared for an explicit user retry (IRL-28).';

COMMENT ON COLUMN spend_payment_prepare_operations.last_failure_reason IS
  'Sanitized last definitive verification failure reason from confirm, when status is failed.';

COMMENT ON COLUMN spend_payment_prepare_operations.last_failure_at IS
  'Timestamp of the last recorded failure metadata update.';

COMMENT ON COLUMN spend_payment_prepare_operations.last_ambiguity_metadata IS
  'Structured context when status is needs_review (e.g. unresolved RPC / receipt wait).';

COMMENT ON TABLE spend_payment_prepare_operations IS
  'Per-session idempotent payment operation (prepare descriptor + lifecycle). IRL-28: status drives retry and needs_review gating.';
