-- Persistent Housekeeping room status and exact room assignment support.
-- Applied to the live Neon database on 2026-09-12.

ALTER TABLE public.hotelx_room_master
  ADD COLUMN IF NOT EXISTS housekeeping_status_code text NOT NULL DEFAULT 'VC';

ALTER TABLE public.hotelx_booking_rooms
  ADD COLUMN IF NOT EXISTS assigned_room_nos jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.hotelx_sync_housekeeping_status_from_profile()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.hotelx_room_master AS room
  SET housekeeping_status_code = COALESCE(
    NULLIF(NEW.operational_policy->'housekeepingRoomStatuses'->>room.room_no, ''),
    room.housekeeping_status_code,
    'VC'
  )
  WHERE room.property_id = NEW.property_id;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'hotelx_hotel_setup_housekeeping_sync'
  ) THEN
    CREATE TRIGGER hotelx_hotel_setup_housekeeping_sync
    AFTER INSERT OR UPDATE OF operational_policy ON public.hotelx_hotel_setup
    FOR EACH ROW
    EXECUTE FUNCTION public.hotelx_sync_housekeeping_status_from_profile();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.hotelx_sync_booking_room_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  raw_assignments text;
  parsed_assignments jsonb := '{}'::jsonb;
BEGIN
  SELECT booking.special_requests->>'_roomAssignments'
  INTO raw_assignments
  FROM public.hotelx_bookings AS booking
  WHERE booking.property_id = NEW.property_id
    AND booking.booking_no = NEW.booking_reference;

  IF COALESCE(raw_assignments, '') <> '' THEN
    BEGIN
      parsed_assignments := raw_assignments::jsonb;
    EXCEPTION WHEN others THEN
      parsed_assignments := '{}'::jsonb;
    END;
  END IF;

  NEW.assigned_room_nos := COALESCE(
    parsed_assignments->NEW.room_type_code,
    '[]'::jsonb
  );
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'hotelx_booking_rooms_assignment_sync'
  ) THEN
    CREATE TRIGGER hotelx_booking_rooms_assignment_sync
    BEFORE INSERT OR UPDATE ON public.hotelx_booking_rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.hotelx_sync_booking_room_assignment();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.hotelx_refresh_booking_assigned_room_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.hotelx_bookings AS booking
  SET assigned_rooms = COALESCE((
    SELECT SUM(jsonb_array_length(room.assigned_room_nos))
    FROM public.hotelx_booking_rooms AS room
    WHERE room.property_id = NEW.property_id
      AND room.booking_reference = NEW.booking_reference
  ), 0)
  WHERE booking.property_id = NEW.property_id
    AND booking.booking_no = NEW.booking_reference;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'hotelx_booking_rooms_assignment_count'
  ) THEN
    CREATE TRIGGER hotelx_booking_rooms_assignment_count
    AFTER INSERT OR UPDATE ON public.hotelx_booking_rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.hotelx_refresh_booking_assigned_room_count();
  END IF;
END $$;
