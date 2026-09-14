from pathlib import Path

path = Path("worker/normalized-storage.ts")
text = path.read_text()

old = """  `CREATE TABLE IF NOT EXISTS public.hotelx_department (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    department_id uuid NOT NULL DEFAULT gen_random_uuid(),
    sort_order integer NOT NULL,
    department_name text NOT NULL,
    incidental_charges jsonb NOT NULL DEFAULT '[]'::jsonb,
    reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
    PRIMARY KEY (property_id, department_id)
  )`,"""
new = """  `CREATE TABLE IF NOT EXISTS public.hotelx_department (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    department_id uuid NOT NULL DEFAULT gen_random_uuid(),
    sort_order integer NOT NULL,
    department_name text NOT NULL,
    incidental_charges jsonb NOT NULL DEFAULT '[]'::jsonb,
    reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_allow_reason boolean NOT NULL DEFAULT false,
    is_allow_sales_channel boolean NOT NULL DEFAULT false,
    is_allow_incidental_charges boolean NOT NULL DEFAULT false,
    is_allow_service_request boolean NOT NULL DEFAULT false,
    PRIMARY KEY (property_id, department_id)
  )`,
  `ALTER TABLE public.hotelx_department
    ADD COLUMN IF NOT EXISTS is_allow_reason boolean NOT NULL DEFAULT false`,
  `ALTER TABLE public.hotelx_department
    ADD COLUMN IF NOT EXISTS is_allow_sales_channel boolean NOT NULL DEFAULT false`,
  `ALTER TABLE public.hotelx_department
    ADD COLUMN IF NOT EXISTS is_allow_incidental_charges boolean NOT NULL DEFAULT false`,
  `ALTER TABLE public.hotelx_department
    ADD COLUMN IF NOT EXISTS is_allow_service_request boolean NOT NULL DEFAULT false`,"""
if old not in text:
    raise SystemExit("department schema anchor not found")
text = text.replace(old, new, 1)

old = """    INSERT INTO public.hotelx_department (
      property_id, department_id, sort_order, department_name, incidental_charges, reasons
    )
    SELECT p_property_id, (item.value->>'id')::uuid, item.ordinality::integer,
      item.value->>'name', COALESCE(item.value->'incidentalCharges', '[]'::jsonb),
      COALESCE(item.value->'reasons', '[]'::jsonb)
    FROM jsonb_array_elements(COALESCE(p_state #> '{hotelMasters,departments}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);"""
new = """    INSERT INTO public.hotelx_department (
      property_id, department_id, sort_order, department_name, incidental_charges, reasons,
      is_allow_reason, is_allow_sales_channel, is_allow_incidental_charges, is_allow_service_request
    )
    SELECT p_property_id, (item.value->>'id')::uuid, item.ordinality::integer,
      item.value->>'name', COALESCE(item.value->'incidentalCharges', '[]'::jsonb),
      COALESCE(item.value->'reasons', '[]'::jsonb),
      COALESCE(
        (item.value->>'allowReason')::boolean,
        jsonb_array_length(COALESCE(item.value->'reasons', '[]'::jsonb)) > 0
      ),
      COALESCE(
        (item.value->>'allowSalesChannel')::boolean,
        jsonb_array_length(COALESCE(item.value->'salesChannels', '[]'::jsonb)) > 0
      ),
      COALESCE(
        (item.value->>'allowIncidentalCharges')::boolean,
        jsonb_array_length(COALESCE(item.value->'incidentalCharges', '[]'::jsonb)) > 0
      ),
      COALESCE((item.value->>'serviceRequest')::boolean, false)
    FROM jsonb_array_elements(COALESCE(p_state #> '{hotelMasters,departments}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);"""
if old not in text:
    raise SystemExit("department insert anchor not found")
text = text.replace(old, new, 1)

old = """            'reasons', department.reasons,
            'salesChannels', COALESCE(("""
new = """            'reasons', department.reasons,
            'allowReason', department.is_allow_reason,
            'allowSalesChannel', department.is_allow_sales_channel,
            'allowIncidentalCharges', department.is_allow_incidental_charges,
            'serviceRequest', department.is_allow_service_request,
            'salesChannels', COALESCE(("""
if old not in text:
    raise SystemExit("department read anchor not found")
text = text.replace(old, new, 1)

path.write_text(text)

migration = Path("database/011_hotelx_department_access_flags.sql")
migration.write_text("""ALTER TABLE public.hotelx_department
  ADD COLUMN IF NOT EXISTS is_allow_reason boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_allow_sales_channel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_allow_incidental_charges boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_allow_service_request boolean NOT NULL DEFAULT false;

UPDATE public.hotelx_department AS department
SET
  is_allow_reason = CASE
    WHEN jsonb_typeof(COALESCE(department.reasons, '[]'::jsonb)) = 'array'
      AND jsonb_array_length(COALESCE(department.reasons, '[]'::jsonb)) > 0
    THEN true ELSE department.is_allow_reason
  END,
  is_allow_sales_channel = CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.hotelx_sales_channel AS channel
      WHERE channel.property_id = department.property_id
        AND channel.department_id = department.department_id
        AND channel.active
    )
    THEN true ELSE department.is_allow_sales_channel
  END,
  is_allow_incidental_charges = CASE
    WHEN (
      jsonb_typeof(COALESCE(department.incidental_charges, '[]'::jsonb)) = 'array'
      AND jsonb_array_length(COALESCE(department.incidental_charges, '[]'::jsonb)) > 0
    ) OR EXISTS (
      SELECT 1
      FROM public.hotelx_incidentalcharges AS charge
      WHERE charge.property_id = department.property_id
        AND charge.department_id = department.department_id
    )
    THEN true ELSE department.is_allow_incidental_charges
  END;
""")
