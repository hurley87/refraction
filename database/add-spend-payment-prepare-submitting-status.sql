-- Atomic Stellar backend payment submit guard: transient `submitting` between `prepared`
-- and `submitted` so concurrent confirm requests cannot both call Privy/Horizon.

ALTER TABLE spend_payment_prepare_operations
  DROP CONSTRAINT IF EXISTS spend_payment_prepare_operations_status_check;

ALTER TABLE spend_payment_prepare_operations
  ADD CONSTRAINT spend_payment_prepare_operations_status_check
  CHECK (status IN (
    'prepared',
    'submitting',
    'submitted',
    'confirmed',
    'failed',
    'needs_review'
  ));

COMMENT ON CONSTRAINT spend_payment_prepare_operations_status_check
  ON spend_payment_prepare_operations IS
  'Payment operation lifecycle (IRL-28 + submitting guard); submitting is transient during backend Stellar submit.';
