-- Normalize Hotel Operational Policy into individual columns.
ALTER TABLE public.hotelx_hotel_setup
  ADD COLUMN IF NOT EXISTS standard_check_in_time text NOT NULL DEFAULT '01:00 PM',
  ADD COLUMN IF NOT EXISTS standard_check_out_time text NOT NULL DEFAULT '12:00 PM',
  ADD COLUMN IF NOT EXISTS night_audit_cut_off_time text NOT NULL DEFAULT '10:00 AM',
  ADD COLUMN IF NOT EXISTS postpaid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS floor_plan boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cashier_closure boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS occupancy_house_use boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS occupancy_day_use boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS occupancy_complimentary boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS occupancy_ooo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS occupancy_ooi boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS security_deposit_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS key_card_deposit_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_scheme_forfeited_revenue text NOT NULL DEFAULT 'SST',
  ADD COLUMN IF NOT EXISTS prompt_during_walk_in boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS prompt_during_pre_checkin boolean NOT NULL DEFAULT false;

-- Existing JSON values are migrated by worker/normalized-storage.ts before the legacy column is dropped.
ALTER TABLE public.hotelx_hotel_setup DROP COLUMN IF EXISTS operational_policy;
