-- Run in the production branch / neondb of hotelx-transport-prototype.
-- The separate prototype keeps related transport data in one atomic snapshot.
-- Application updates must compare revision before incrementing it, so a
-- stale browser cannot overwrite another browser's accepted seat assignment.
-- This migration creates storage only. It does not seed or replace records.

BEGIN;

CREATE TABLE IF NOT EXISTS public.hotelx_transport_state (
  id text PRIMARY KEY CHECK (id = 'hotel-paradise'),
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT hotelx_transport_state_shape CHECK (
    jsonb_typeof(state) = 'object'
    AND state ?& ARRAY['setup', 'trips', 'templates', 'dayNotes']
    AND jsonb_typeof(state->'setup') = 'object'
    AND jsonb_typeof(state->'trips') = 'array'
    AND jsonb_typeof(state->'templates') = 'array'
    AND jsonb_typeof(state->'dayNotes') = 'object'
  )
);

REVOKE ALL ON TABLE public.hotelx_transport_state FROM PUBLIC;

COMMIT;

SELECT 'Transport storage ready' AS result;
