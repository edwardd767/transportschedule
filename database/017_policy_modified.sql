-- Standard Policy & Guidelines: per-policy "Last Modified on" stamps.
-- The worker adds this column automatically on ensure(); this file is for manual runs.
ALTER TABLE public.hotelx_hotel_setup
  ADD COLUMN IF NOT EXISTS policy_modified jsonb NOT NULL DEFAULT '{}'::jsonb;
