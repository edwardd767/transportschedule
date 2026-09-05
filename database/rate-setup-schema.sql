-- HotelX Rate Setup normalized tables
-- Safe to run repeatedly in Neon PostgreSQL.

CREATE TABLE IF NOT EXISTS public.hotelx_season_master (
  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
  id text NOT NULL,
  sort_order integer NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#ff9100',
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (property_id, id)
);

CREATE TABLE IF NOT EXISTS public.hotelx_season_calendar (
  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
  calendar_date date NOT NULL,
  season_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (property_id, calendar_date),
  FOREIGN KEY (property_id, season_id) REFERENCES public.hotelx_season_master(property_id, id)
);

CREATE TABLE IF NOT EXISTS public.hotelx_rate_element (
  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
  id text NOT NULL,
  sort_order integer NOT NULL,
  name text NOT NULL,
  basis text NOT NULL,
  min_qty integer NOT NULL DEFAULT 0 CHECK (min_qty >= 0),
  max_qty integer NOT NULL DEFAULT 0 CHECK (max_qty >= min_qty),
  amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (property_id, id)
);

CREATE TABLE IF NOT EXISTS public.hotelx_rate_type (
  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
  id text NOT NULL,
  sort_order integer NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (property_id, id)
);

CREATE TABLE IF NOT EXISTS public.hotelx_rate_setup (
  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
  id text NOT NULL,
  sort_order integer NOT NULL,
  code text NOT NULL,
  description text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  web boolean NOT NULL DEFAULT false,
  last_updated_on date,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (property_id, id),
  UNIQUE (property_id, code)
);

CREATE TABLE IF NOT EXISTS public.hotelx_rate_setup_validity (
  property_id text NOT NULL,
  rate_setup_id text NOT NULL,
  id text NOT NULL,
  sort_order integer NOT NULL,
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (property_id, rate_setup_id, id),
  FOREIGN KEY (property_id, rate_setup_id) REFERENCES public.hotelx_rate_setup(property_id, id) ON DELETE CASCADE,
  CHECK (valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS hotelx_season_calendar_season_idx
  ON public.hotelx_season_calendar(property_id, season_id, calendar_date);
CREATE INDEX IF NOT EXISTS hotelx_rate_element_name_idx
  ON public.hotelx_rate_element(property_id, name);
CREATE INDEX IF NOT EXISTS hotelx_rate_type_name_idx
  ON public.hotelx_rate_type(property_id, name);
CREATE INDEX IF NOT EXISTS hotelx_rate_setup_code_idx
  ON public.hotelx_rate_setup(property_id, code);
CREATE INDEX IF NOT EXISTS hotelx_rate_setup_validity_dates_idx
  ON public.hotelx_rate_setup_validity(property_id, rate_setup_id, valid_from, valid_to);
