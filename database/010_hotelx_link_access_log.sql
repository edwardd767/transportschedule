-- Run in the production branch / neondb of hotelx-transport-prototype.
-- Stores private-link access records captured by the Transport API.
-- Client device hostnames are not exposed by normal web browsers; hostname
-- may therefore be NULL unless the server can resolve one independently.

BEGIN;

CREATE TABLE IF NOT EXISTS public.hotelx_link_access_log (
  ip_address inet NOT NULL,
  hostname text
);

REVOKE ALL ON TABLE public.hotelx_link_access_log FROM PUBLIC;

COMMIT;

SELECT 'HotelX link access log ready' AS result;
