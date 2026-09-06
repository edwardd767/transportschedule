CREATE TABLE IF NOT EXISTS public.hotelx_roomstatus (
  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
  status_code text NOT NULL,
  sort_order integer NOT NULL,
  status_name text NOT NULL,
  status_color text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (property_id, status_code)
);
