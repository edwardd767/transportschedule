-- Payment type master, scoped per property (same pattern as the other hotelx_* masters).
-- Drop the earlier global-shaped table if it exists without property_id.
DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'hotelx_payment_type'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'hotelx_payment_type' AND column_name = 'property_id'
    ) THEN
      DROP TABLE public.hotelx_payment_type;
    END IF;
  END $$;

CREATE TABLE IF NOT EXISTS public.hotelx_payment_type (
  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
  payment_type_id uuid NOT NULL DEFAULT gen_random_uuid(),
  sort_order integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  createddate timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, payment_type_id),
  UNIQUE (property_id, description)
);

INSERT INTO public.hotelx_payment_type (property_id, sort_order, description)
SELECT meta.id, item.sort_order, item.description
FROM public.hotelx_transport_meta AS meta
CROSS JOIN (VALUES
  (1, 'Cash'),
  (2, 'Credit/Debit Card'),
  (3, 'CityLedger'),
  (4, 'Cheque'),
  (5, 'Bank TT'),
  (6, 'Voucher'),
  (7, 'Other')
) AS item(sort_order, description)
ON CONFLICT (property_id, description) DO NOTHING;
