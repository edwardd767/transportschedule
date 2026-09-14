ALTER TABLE public.hotelx_department
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
