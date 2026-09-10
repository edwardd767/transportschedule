CREATE TABLE IF NOT EXISTS public.hotelx_sales_channel (
  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
  department_id text NOT NULL,
  sales_channel_id text NOT NULL,
  sort_order integer NOT NULL,
  sales_channel_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (property_id, department_id, sales_channel_id),
  FOREIGN KEY (property_id, department_id)
    REFERENCES public.hotelx_department(property_id, department_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS hotelx_sales_channel_department_idx
  ON public.hotelx_sales_channel(property_id, department_id, sort_order);

INSERT INTO public.hotelx_sales_channel (
  property_id,
  department_id,
  sales_channel_id,
  sort_order,
  sales_channel_name,
  active
)
SELECT
  department.property_id,
  department.department_id,
  department.department_id || '-sales-channel-' || channel.ordinality::text,
  channel.ordinality::integer,
  channel.value #>> '{}',
  true
FROM public.hotelx_department AS department
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(department.sales_channels, '[]'::jsonb))
  WITH ORDINALITY AS channel(value, ordinality)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.hotelx_sales_channel AS existing
  WHERE existing.property_id = department.property_id
    AND existing.department_id = department.department_id
)
ON CONFLICT DO NOTHING;
