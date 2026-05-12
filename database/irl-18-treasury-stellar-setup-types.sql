-- IRL-18: Treasury ledger types for Stellar account activation and USDC trustline setup.

ALTER TABLE treasury_transactions
  DROP CONSTRAINT IF EXISTS treasury_transactions_transaction_type_check;

ALTER TABLE treasury_transactions
  ADD CONSTRAINT treasury_transactions_transaction_type_check
  CHECK (transaction_type IN (
      'fund_user',
      'receive_payment',
      'admin_recovery',
      'stellar_account_activation',
      'stellar_usdc_trustline_setup'
  ));

COMMENT ON CONSTRAINT treasury_transactions_transaction_type_check ON treasury_transactions IS
  'Includes Stellar readiness audit types (IRL-18): stellar_account_activation, stellar_usdc_trustline_setup.';
