-- Normalize free-text NYC variants in manual_events to the canonical
-- "New York City". Matches case-insensitively and ignores surrounding
-- whitespace; "New York City" rows are left unchanged (no-op).

UPDATE manual_events
SET city = 'New York City',
    updated_at = NOW()
WHERE LOWER(TRIM(city)) IN ('nyc', 'new york');
