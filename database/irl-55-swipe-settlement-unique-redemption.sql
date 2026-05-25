-- IRL-55: At most one settlement queue row per redemption (idempotent swipe / worker model).

CREATE UNIQUE INDEX IF NOT EXISTS idx_activation_settlement_one_row_per_redemption
    ON activation_settlement_transaction (redemption_id);

COMMENT ON INDEX idx_activation_settlement_one_row_per_redemption IS
    'IRL-55: Guarantees swipe-to-redeem cannot enqueue duplicate settlement rows for the same redemption.';
