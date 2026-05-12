-- IRL-21: Allow NULL rail_user_wallet_address on spend_sessions for stellar_usdc until
-- Privy-managed Stellar readiness completes. Base USDC sessions remain required non-NULL.

ALTER TABLE spend_sessions
  DROP CONSTRAINT IF EXISTS spend_sessions_rail_wallet_required_for_base_usdc;

ALTER TABLE spend_sessions
  ALTER COLUMN rail_user_wallet_address DROP NOT NULL;

ALTER TABLE spend_sessions
  ADD CONSTRAINT spend_sessions_rail_wallet_required_for_base_usdc
  CHECK (
    spend_rail IS DISTINCT FROM 'base_usdc'
    OR rail_user_wallet_address IS NOT NULL
  );

COMMENT ON COLUMN spend_sessions.rail_user_wallet_address IS
  'Rail-specific user wallet: required non-NULL for base_usdc (EVM). For stellar_usdc, NULL until '
  'wallet readiness sets the Privy-managed Stellar G-address; never use the session EVM wallet as a placeholder.';

-- Pending readiness rows may omit the address until orchestration resolves the Stellar account.

ALTER TABLE spend_wallet_readiness_operations
  ALTER COLUMN rail_user_wallet_address DROP NOT NULL;

COMMENT ON COLUMN spend_wallet_readiness_operations.rail_user_wallet_address IS
  'Rail user wallet for this operation; NULL while Stellar readiness is pending, then the resolved G-address.';
