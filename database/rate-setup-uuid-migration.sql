-- Convert existing Rate Setup identifiers to UUIDs.
-- Run once after rate-setup-schema.sql on an existing database.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TEMP TABLE rate_setup_id_map (
  property_id text NOT NULL,
  old_id text NOT NULL,
  new_id uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (property_id, old_id)
) ON COMMIT DROP;

INSERT INTO rate_setup_id_map (property_id, old_id)
SELECT property_id, id::text FROM public.hotelx_rate_setup;

ALTER TABLE public.hotelx_rate_setup_validity DROP CONSTRAINT IF EXISTS hotelx_rate_setup_validity_property_id_rate_setup_id_id_fkey;

ALTER TABLE public.hotelx_rate_setup_validity ADD COLUMN IF NOT EXISTS rate_setup_uuid uuid;
UPDATE public.hotelx_rate_setup_validity v
SET rate_setup_uuid = m.new_id
FROM rate_setup_id_map m
WHERE m.property_id = v.property_id AND m.old_id = v.rate_setup_id::text;

ALTER TABLE public.hotelx_rate_setup ADD COLUMN IF NOT EXISTS id_uuid uuid;
UPDATE public.hotelx_rate_setup r SET id_uuid = m.new_id FROM rate_setup_id_map m WHERE m.property_id = r.property_id AND m.old_id = r.id::text;
ALTER TABLE public.hotelx_rate_setup DROP CONSTRAINT IF EXISTS hotelx_rate_setup_pkey;
ALTER TABLE public.hotelx_rate_setup DROP COLUMN id;
ALTER TABLE public.hotelx_rate_setup RENAME COLUMN id_uuid TO id;
ALTER TABLE public.hotelx_rate_setup ADD PRIMARY KEY (property_id, id);

ALTER TABLE public.hotelx_rate_setup_validity DROP CONSTRAINT IF EXISTS hotelx_rate_setup_validity_pkey;
ALTER TABLE public.hotelx_rate_setup_validity DROP COLUMN rate_setup_id;
ALTER TABLE public.hotelx_rate_setup_validity RENAME COLUMN rate_setup_uuid TO rate_setup_id;
ALTER TABLE public.hotelx_rate_setup_validity ALTER COLUMN rate_setup_id SET NOT NULL;
ALTER TABLE public.hotelx_rate_setup_validity ALTER COLUMN id TYPE uuid USING gen_random_uuid();
ALTER TABLE public.hotelx_rate_setup_validity ADD PRIMARY KEY (property_id, rate_setup_id, id);
ALTER TABLE public.hotelx_rate_setup_validity ADD FOREIGN KEY (property_id, rate_setup_id) REFERENCES public.hotelx_rate_setup(property_id, id) ON DELETE CASCADE;

COMMIT;
