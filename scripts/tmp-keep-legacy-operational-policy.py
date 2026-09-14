from pathlib import Path

p = Path('worker/normalized-storage.ts')
s = p.read_text()
old = "  `ALTER TABLE public.hotelx_hotel_setup DROP COLUMN IF EXISTS operational_policy`,\n"
if old not in s:
    raise SystemExit('operational_policy drop statement not found')
s = s.replace(old, '', 1)
p.write_text(s)

m = Path('database/012_hotelx_operational_policy_columns.sql')
text = m.read_text()
text = text.replace("\n-- Existing JSON values are migrated by worker/normalized-storage.ts before the legacy column is dropped.\nALTER TABLE public.hotelx_hotel_setup DROP COLUMN IF EXISTS operational_policy;\n", "\n-- Existing JSON values are migrated by worker/normalized-storage.ts.\n-- The legacy operational_policy JSONB column is intentionally retained but no longer read or written.\n")
m.write_text(text)
