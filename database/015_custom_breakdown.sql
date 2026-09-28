-- General Policy: Custom Breakdown toggle.
-- The worker adds this column automatically on ensure(); this file is for manual runs.
ALTER TABLE public.hotelx_hotel_setup
  ADD COLUMN IF NOT EXISTS custom_breakdown boolean NOT NULL DEFAULT false;
