from pathlib import Path

storage_path = Path('worker/normalized-storage.ts')
text = storage_path.read_text(encoding='utf-8')

anchor = """  `CREATE INDEX IF NOT EXISTS hotelx_room_master_type_idx
    ON public.hotelx_room_master(property_id, room_type_code, location_code)`,
"""
if anchor not in text:
    raise SystemExit('normalized-storage index anchor not found')

schema_block = r"""  `CREATE TABLE IF NOT EXISTS public.hotelx_season_master (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    name text NOT NULL,
    color text NOT NULL DEFAULT '#ff9100',
    active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_season_calendar (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    calendar_date date NOT NULL,
    season_id text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, calendar_date),
    FOREIGN KEY (property_id, season_id)
      REFERENCES public.hotelx_season_master(property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_rate_element (
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
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_rate_type (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    name text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_rate_setup (
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
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_rate_setup_validity (
    property_id text NOT NULL,
    rate_setup_id text NOT NULL,
    id text NOT NULL,
    sort_order integer NOT NULL,
    valid_from date NOT NULL,
    valid_to date NOT NULL,
    active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, rate_setup_id, id),
    FOREIGN KEY (property_id, rate_setup_id)
      REFERENCES public.hotelx_rate_setup(property_id, id) ON DELETE CASCADE,
    CHECK (valid_to >= valid_from)
  )`,
  `CREATE INDEX IF NOT EXISTS hotelx_season_calendar_season_idx
    ON public.hotelx_season_calendar(property_id, season_id, calendar_date)`,
  `CREATE INDEX IF NOT EXISTS hotelx_rate_element_name_idx
    ON public.hotelx_rate_element(property_id, name)`,
  `CREATE INDEX IF NOT EXISTS hotelx_rate_type_name_idx
    ON public.hotelx_rate_type(property_id, name)`,
  `CREATE INDEX IF NOT EXISTS hotelx_rate_setup_code_idx
    ON public.hotelx_rate_setup(property_id, code)`,
  `CREATE INDEX IF NOT EXISTS hotelx_rate_setup_validity_dates_idx
    ON public.hotelx_rate_setup_validity(property_id, rate_setup_id, valid_from, valid_to)`,
"""

if 'public.hotelx_season_master' not in text:
    text = text.replace(anchor, schema_block + anchor, 1)
    storage_path.write_text(text, encoding='utf-8')

index_path = Path('worker/index.ts')
index_text = index_path.read_text(encoding='utf-8')
health_anchor = "            hotelMasterSchemaVersion: 1,\n"
if health_anchor not in index_text:
    raise SystemExit('Worker health anchor not found')
if 'rateSetupSchemaVersion' not in index_text:
    index_text = index_text.replace(
        health_anchor,
        health_anchor + "            rateSetupSchemaVersion: 1,\n",
        1,
    )
    index_path.write_text(index_text, encoding='utf-8')

test_path = Path('scripts/test-transport-worker.mjs')
test_text = test_path.read_text(encoding='utf-8')
test_anchor = "assert.equal((await call('/health')).data.hotelMasterSchemaVersion, 1);\n"
if test_anchor not in test_text:
    raise SystemExit('Worker test health anchor not found')
if 'rateSetupSchemaVersion' not in test_text:
    test_text = test_text.replace(
        test_anchor,
        test_anchor + "assert.equal((await call('/health')).data.rateSetupSchemaVersion, 1);\n",
        1,
    )
    test_path.write_text(test_text, encoding='utf-8')

migration = """-- HotelX Rate Setup normalized tables\n-- Safe to run repeatedly in Neon PostgreSQL.\n\nCREATE TABLE IF NOT EXISTS public.hotelx_season_master (\n  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,\n  id text NOT NULL,\n  sort_order integer NOT NULL,\n  name text NOT NULL,\n  color text NOT NULL DEFAULT '#ff9100',\n  active boolean NOT NULL DEFAULT true,\n  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (property_id, id)\n);\n\nCREATE TABLE IF NOT EXISTS public.hotelx_season_calendar (\n  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,\n  calendar_date date NOT NULL,\n  season_id text NOT NULL,\n  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (property_id, calendar_date),\n  FOREIGN KEY (property_id, season_id) REFERENCES public.hotelx_season_master(property_id, id)\n);\n\nCREATE TABLE IF NOT EXISTS public.hotelx_rate_element (\n  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,\n  id text NOT NULL,\n  sort_order integer NOT NULL,\n  name text NOT NULL,\n  basis text NOT NULL,\n  min_qty integer NOT NULL DEFAULT 0 CHECK (min_qty >= 0),\n  max_qty integer NOT NULL DEFAULT 0 CHECK (max_qty >= min_qty),\n  amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),\n  active boolean NOT NULL DEFAULT true,\n  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (property_id, id)\n);\n\nCREATE TABLE IF NOT EXISTS public.hotelx_rate_type (\n  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,\n  id text NOT NULL,\n  sort_order integer NOT NULL,\n  name text NOT NULL,\n  active boolean NOT NULL DEFAULT true,\n  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (property_id, id)\n);\n\nCREATE TABLE IF NOT EXISTS public.hotelx_rate_setup (\n  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,\n  id text NOT NULL,\n  sort_order integer NOT NULL,\n  code text NOT NULL,\n  description text NOT NULL,\n  active boolean NOT NULL DEFAULT true,\n  web boolean NOT NULL DEFAULT false,\n  last_updated_on date,\n  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (property_id, id),\n  UNIQUE (property_id, code)\n);\n\nCREATE TABLE IF NOT EXISTS public.hotelx_rate_setup_validity (\n  property_id text NOT NULL,\n  rate_setup_id text NOT NULL,\n  id text NOT NULL,\n  sort_order integer NOT NULL,\n  valid_from date NOT NULL,\n  valid_to date NOT NULL,\n  active boolean NOT NULL DEFAULT true,\n  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (property_id, rate_setup_id, id),\n  FOREIGN KEY (property_id, rate_setup_id) REFERENCES public.hotelx_rate_setup(property_id, id) ON DELETE CASCADE,\n  CHECK (valid_to >= valid_from)\n);\n\nCREATE INDEX IF NOT EXISTS hotelx_season_calendar_season_idx\n  ON public.hotelx_season_calendar(property_id, season_id, calendar_date);\nCREATE INDEX IF NOT EXISTS hotelx_rate_element_name_idx\n  ON public.hotelx_rate_element(property_id, name);\nCREATE INDEX IF NOT EXISTS hotelx_rate_type_name_idx\n  ON public.hotelx_rate_type(property_id, name);\nCREATE INDEX IF NOT EXISTS hotelx_rate_setup_code_idx\n  ON public.hotelx_rate_setup(property_id, code);\nCREATE INDEX IF NOT EXISTS hotelx_rate_setup_validity_dates_idx\n  ON public.hotelx_rate_setup_validity(property_id, rate_setup_id, valid_from, valid_to);\n"""
Path('database/rate-setup-schema.sql').write_text(migration, encoding='utf-8')

print('Rate Setup database schema applied to source.')
