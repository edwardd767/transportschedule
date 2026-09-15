CREATE TABLE IF NOT EXISTS public.hotelx_payment_type (
  payment_type_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order integer NOT NULL DEFAULT 0,
  description text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  createddate timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.hotelx_payment_type (sort_order, description)
VALUES
  (1, 'Cash'),
  (2, 'Credit/Debit Card'),
  (3, 'CityLedger'),
  (4, 'Cheque'),
  (5, 'Bank TT'),
  (6, 'Voucher'),
  (7, 'Other')
ON CONFLICT (description) DO NOTHING;
