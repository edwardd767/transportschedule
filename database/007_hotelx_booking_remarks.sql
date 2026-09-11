-- Booking Remarks persistence for HotelX bookings.
-- The UI keeps the remark values inside special_requests so the existing normalized
-- booking save/load flow remains backward compatible. These generated columns expose
-- the same values directly on public.hotelx_bookings for reporting and SQL access.

ALTER TABLE public.hotelx_bookings
  DROP COLUMN IF EXISTS internal_remarks,
  DROP COLUMN IF EXISTS payment_remarks,
  ADD COLUMN internal_remarks text
    GENERATED ALWAYS AS (
      COALESCE(special_requests->>'__bookingInternalRemarks', '')
    ) STORED,
  ADD COLUMN payment_remarks text[]
    GENERATED ALWAYS AS (
      ARRAY[
        COALESCE(special_requests->>'__bookingPaymentRemarks1', ''),
        COALESCE(special_requests->>'__bookingPaymentRemarks2', '')
      ]
    ) STORED;
