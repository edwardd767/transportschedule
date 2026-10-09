-- Night Audit Auto Email: SMTP Settings (host, port, SSL, sender, subject, email content).
-- The worker adds this column automatically on ensure(); this file is for manual runs.
ALTER TABLE public.hotelx_hotel_setup
  ADD COLUMN IF NOT EXISTS smtp_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
