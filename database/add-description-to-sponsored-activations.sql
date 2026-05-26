ALTER TABLE sponsored_activation
    ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN sponsored_activation.description IS
    'Optional public-facing description shown on the activation landing page.';
