-- Add Tempo as a sponsored activation settlement rail.
-- Existing settlement lifecycle functions are rail-agnostic.

ALTER TABLE sponsored_activation
  DROP CONSTRAINT IF EXISTS sponsored_activation_settlement_rail_check;

ALTER TABLE sponsored_activation
  ADD CONSTRAINT sponsored_activation_settlement_rail_check
  CHECK (settlement_rail IN ('base', 'stellar', 'tempo'));

ALTER TABLE activation_settlement_transaction
  DROP CONSTRAINT IF EXISTS activation_settlement_transaction_settlement_rail_check;

ALTER TABLE activation_settlement_transaction
  ADD CONSTRAINT activation_settlement_transaction_settlement_rail_check
  CHECK (settlement_rail IN ('base', 'stellar', 'tempo'));
