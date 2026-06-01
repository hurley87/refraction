-- Add optional end_date to manual_events so manually-added events can be
-- multi-day (festivals, tour weekenders, residencies), matching the
-- startDatetime / endDatetime parity already supported by DICE events.
--
-- end_date is nullable: a null value means the event is single-day and
-- renders exactly as before. When set, it must be on or after `date`.

ALTER TABLE manual_events
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

COMMENT ON COLUMN manual_events.end_date IS 'Optional event end date for multi-day events; must be on or after date when set.';
