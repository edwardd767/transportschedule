CREATE TABLE IF NOT EXISTS public.hotelx_department (
  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
  department_id text NOT NULL,
  sort_order integer NOT NULL,
  department_name text NOT NULL,
  incidental_charges jsonb NOT NULL DEFAULT '[]'::jsonb,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  sales_channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (property_id, department_id)
);
