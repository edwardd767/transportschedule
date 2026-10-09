-- Night Audit Auto Email: Housekeeping Notification settings (own SMTP host + recipient/sender).
-- The worker adds this column automatically on ensure(); this file is for manual runs.
ALTER TABLE public.hotelx_hotel_setup
  ADD COLUMN IF NOT EXISTS housekeeping_notification jsonb NOT NULL DEFAULT '{}'::jsonb;
