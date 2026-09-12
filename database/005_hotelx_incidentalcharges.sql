CREATE TABLE IF NOT EXISTS public.hotelx_incidentalcharges (
  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
  charge_id text NOT NULL,
  department_id uuid NOT NULL,
  title text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_scheme text NOT NULL,
  outlet_code text NOT NULL DEFAULT '',
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  msic_code text NOT NULL DEFAULT '',
  classification text NOT NULL DEFAULT '',
  PRIMARY KEY (property_id, charge_id),
  FOREIGN KEY (property_id, department_id)
    REFERENCES public.hotelx_department(property_id, department_id)
    ON DELETE CASCADE
);
