import type { TransportState } from '../lib/transport-state';
import { ApiError, type Query } from './neon';

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_meta (
    id text PRIMARY KEY,
    schema_version integer NOT NULL DEFAULT 2 CHECK (schema_version = 2),
    revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_rules (
    property_id text PRIMARY KEY REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    start_time text NOT NULL,
    end_time text NOT NULL,
    turnaround_minutes integer NOT NULL DEFAULT 0,
    boarding_lead_minutes integer NOT NULL DEFAULT 0,
    notes text NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_operators (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    name text NOT NULL,
    contact text NOT NULL DEFAULT '',
    phone text NOT NULL DEFAULT '',
    email text NOT NULL DEFAULT '',
    active boolean NOT NULL DEFAULT true,
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_services (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    name text NOT NULL,
    operator_id text NOT NULL,
    capacity integer NOT NULL CHECK (capacity >= 1),
    status text NOT NULL CHECK (status IN ('Active', 'Maintenance', 'Inactive')),
    service_type text NOT NULL,
    booking_mode text NOT NULL CHECK (booking_mode IN ('Scheduled', 'OnDemand')),
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_routes (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    origin text NOT NULL,
    destination text NOT NULL,
    meeting_point text NOT NULL,
    duration_minutes integer NOT NULL CHECK (duration_minutes >= 1),
    operator_id text NOT NULL,
    to_hotel boolean NOT NULL,
    active boolean NOT NULL,
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_templates (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    name text NOT NULL,
    route_id text NOT NULL,
    service_id text NOT NULL,
    start_date text NOT NULL,
    end_date text NOT NULL,
    weekdays smallint[] NOT NULL DEFAULT '{}'::smallint[],
    departure_times text[] NOT NULL DEFAULT '{}'::text[],
    excluded_dates text[] NOT NULL DEFAULT '{}'::text[],
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_day_notes (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    date_key text NOT NULL,
    tide text NOT NULL DEFAULT '',
    restricted text NOT NULL DEFAULT '',
    holiday text NOT NULL DEFAULT '',
    notes text NOT NULL DEFAULT '',
    PRIMARY KEY (property_id, date_key)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_trips (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    trip_date text NOT NULL,
    trip_time text NOT NULL,
    direction text NOT NULL,
    origin text NOT NULL,
    destination text NOT NULL,
    meeting_point text NOT NULL,
    duration_minutes integer NOT NULL,
    boarding_lead_minutes integer NOT NULL,
    turnaround_minutes integer NOT NULL,
    operating_notes text NOT NULL DEFAULT '',
    to_hotel boolean NOT NULL,
    service_id text NOT NULL,
    service_name text NOT NULL,
    operator_name text NOT NULL,
    capacity integer NOT NULL CHECK (capacity >= 1),
    status text NOT NULL,
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_trip_groups (
    property_id text NOT NULL,
    trip_id text NOT NULL,
    id text NOT NULL,
    sort_order integer NOT NULL,
    booking_id text,
    reference text NOT NULL,
    name text NOT NULL,
    adults integer NOT NULL,
    children integer NOT NULL,
    boarded boolean NOT NULL DEFAULT false,
    PRIMARY KEY (property_id, trip_id, id),
    FOREIGN KEY (property_id, trip_id)
      REFERENCES public.hotelx_transport_trips(property_id, id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_booking_legs (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    booking_reference text NOT NULL,
    direction text NOT NULL CHECK (direction IN ('arrival', 'departure')),
    service_id text NOT NULL,
    service_name text NOT NULL,
    service_type text NOT NULL,
    booking_mode text NOT NULL CHECK (booking_mode IN ('Scheduled', 'OnDemand')),
    operator_id text NOT NULL,
    operator_name text NOT NULL,
    travel_date text NOT NULL,
    travel_time text NOT NULL,
    pickup text NOT NULL,
    dropoff text NOT NULL,
    passengers integer NOT NULL CHECK (passengers >= 1),
    flight_no text NOT NULL DEFAULT '',
    vehicle text NOT NULL DEFAULT '',
    driver text NOT NULL DEFAULT '',
    remarks text NOT NULL DEFAULT '',
    trip_id text NOT NULL DEFAULT '',
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_location_master (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    code text NOT NULL,
    sort_order integer NOT NULL,
    description text NOT NULL,
    floor_plan_attachment text NOT NULL DEFAULT '',
    active boolean NOT NULL DEFAULT true,
    PRIMARY KEY (property_id, code)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_room_type_master (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    code text NOT NULL,
    sort_order integer NOT NULL,
    description text NOT NULL,
    property_type text NOT NULL,
    measure_type text NOT NULL,
    room_size integer NOT NULL DEFAULT 0,
    max_guest integer NOT NULL CHECK (max_guest >= 1),
    house_limit integer NOT NULL DEFAULT 0,
    housekeeping_points integer NOT NULL DEFAULT 0,
    total_room integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    PRIMARY KEY (property_id, code)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_room_master (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    room_no text NOT NULL,
    sort_order integer NOT NULL,
    room_type_code text NOT NULL,
    description text NOT NULL,
    location_code text NOT NULL,
    max_guest integer NOT NULL CHECK (max_guest >= 1),
    room_size integer NOT NULL DEFAULT 0,
    display_sequence integer NOT NULL,
    keycard_room_mapping text NOT NULL DEFAULT '',
    active boolean NOT NULL DEFAULT true,
    PRIMARY KEY (property_id, room_no),
    FOREIGN KEY (property_id, room_type_code) REFERENCES public.hotelx_room_type_master(property_id, code),
    FOREIGN KEY (property_id, location_code) REFERENCES public.hotelx_location_master(property_id, code)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_bookings (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    reference text NOT NULL,
    sort_order integer NOT NULL,
    guest text NOT NULL,
    arrival_date text NOT NULL,
    departure_date text NOT NULL,
    status text NOT NULL,
    assigned_rooms integer NOT NULL DEFAULT 0,
    checked_in_guests integer NOT NULL DEFAULT 0,
    guests integer NOT NULL,
    amount numeric(14,2) NOT NULL DEFAULT 0,
    highlight_dates boolean NOT NULL DEFAULT false,
    PRIMARY KEY (property_id, reference)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_booking_rooms (
    property_id text NOT NULL,
    booking_reference text NOT NULL,
    room_type_code text NOT NULL,
    sort_order integer NOT NULL,
    room_count integer NOT NULL CHECK (room_count >= 1),
    PRIMARY KEY (property_id, booking_reference, room_type_code),
    FOREIGN KEY (property_id, booking_reference) REFERENCES public.hotelx_bookings(property_id, reference) ON DELETE CASCADE,
    FOREIGN KEY (property_id, room_type_code) REFERENCES public.hotelx_room_type_master(property_id, code)
  )`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS group_name text NOT NULL DEFAULT ''`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT ''`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS account_name text NOT NULL DEFAULT ''`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS credit_limit numeric(14,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS print_rate boolean NOT NULL DEFAULT true`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS state_tax boolean NOT NULL DEFAULT true`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS tourism_tax boolean NOT NULL DEFAULT true`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT ''`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS sales_channel text NOT NULL DEFAULT 'Direct'`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'Booking'`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS segment text NOT NULL DEFAULT 'Leisure'`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS reference_no text NOT NULL DEFAULT ''`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS adults integer NOT NULL DEFAULT 1`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS children integer NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS infants integer NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS rate_code text NOT NULL DEFAULT 'BAR'`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS room_rate numeric(14,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS promo_code text NOT NULL DEFAULT ''`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS discount_per_night numeric(14,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS subtotal numeric(14,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS discount numeric(14,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS tax numeric(14,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS total numeric(14,2) NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_season_master (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    name text NOT NULL,
    color text NOT NULL DEFAULT '#ff9100',
    active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_season_calendar (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    calendar_date date NOT NULL,
    season_id text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, calendar_date),
    FOREIGN KEY (property_id, season_id)
      REFERENCES public.hotelx_season_master(property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_rate_element (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    name text NOT NULL,
    basis text NOT NULL,
    min_qty integer NOT NULL DEFAULT 0 CHECK (min_qty >= 0),
    max_qty integer NOT NULL DEFAULT 0 CHECK (max_qty >= min_qty),
    amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_rate_type (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    name text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_rate_setup (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    web boolean NOT NULL DEFAULT false,
    last_updated_on date,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, id),
    UNIQUE (property_id, code)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_rate_setup_validity (
    property_id text NOT NULL,
    rate_setup_id text NOT NULL,
    id text NOT NULL,
    sort_order integer NOT NULL,
    valid_from date NOT NULL,
    valid_to date NOT NULL,
    active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, rate_setup_id, id),
    FOREIGN KEY (property_id, rate_setup_id)
      REFERENCES public.hotelx_rate_setup(property_id, id) ON DELETE CASCADE,
    CHECK (valid_to >= valid_from)
  )`,
  `CREATE INDEX IF NOT EXISTS hotelx_season_calendar_season_idx
    ON public.hotelx_season_calendar(property_id, season_id, calendar_date)`,
  `CREATE INDEX IF NOT EXISTS hotelx_rate_element_name_idx
    ON public.hotelx_rate_element(property_id, name)`,
  `CREATE INDEX IF NOT EXISTS hotelx_rate_type_name_idx
    ON public.hotelx_rate_type(property_id, name)`,
  `CREATE INDEX IF NOT EXISTS hotelx_rate_setup_code_idx
    ON public.hotelx_rate_setup(property_id, code)`,
  `CREATE INDEX IF NOT EXISTS hotelx_rate_setup_validity_dates_idx
    ON public.hotelx_rate_setup_validity(property_id, rate_setup_id, valid_from, valid_to)`,
  `CREATE INDEX IF NOT EXISTS hotelx_room_master_type_idx
    ON public.hotelx_room_master(property_id, room_type_code, location_code)`,
  `CREATE INDEX IF NOT EXISTS hotelx_bookings_dates_idx
    ON public.hotelx_bookings(property_id, arrival_date, departure_date)`,
  `CREATE INDEX IF NOT EXISTS hotelx_transport_trips_date_idx
    ON public.hotelx_transport_trips(property_id, trip_date, trip_time)`,
  `CREATE INDEX IF NOT EXISTS hotelx_transport_groups_booking_idx
    ON public.hotelx_transport_trip_groups(property_id, booking_id)`,
  `CREATE INDEX IF NOT EXISTS hotelx_transport_legs_booking_idx
    ON public.hotelx_transport_booking_legs(property_id, booking_reference, travel_date)`,
  `CREATE OR REPLACE FUNCTION public.hotelx_transport_replace_rows(
    p_property_id text,
    p_state jsonb
  ) RETURNS void
  LANGUAGE plpgsql
  AS $$
  BEGIN
    DELETE FROM public.hotelx_rate_setup_validity WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_season_calendar WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_rate_element WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_rate_type WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_rate_setup WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_season_master WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_booking_rooms WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_bookings WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_room_master WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_room_type_master WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_location_master WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_trip_groups WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_booking_legs WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_trips WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_templates WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_day_notes WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_services WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_routes WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_operators WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_rules WHERE property_id = p_property_id;

    INSERT INTO public.hotelx_location_master (
      property_id, code, sort_order, description, floor_plan_attachment, active
    )
    SELECT p_property_id, item.value->>'code', item.ordinality::integer,
      COALESCE(item.value->>'description', ''), COALESCE(item.value->>'floorPlanAttachment', ''),
      COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{hotelMasters,locations}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_room_type_master (
      property_id, code, sort_order, description, property_type, measure_type,
      room_size, max_guest, house_limit, housekeeping_points, total_room, active
    )
    SELECT p_property_id, item.value->>'code', item.ordinality::integer,
      COALESCE(item.value->>'description', ''), COALESCE(item.value->>'propertyType', 'Room'),
      COALESCE(item.value->>'measureType', 'Square Metre'),
      COALESCE(NULLIF(item.value->>'roomSize', ''), '0')::integer,
      COALESCE(NULLIF(item.value->>'maxGuest', ''), '1')::integer,
      COALESCE(NULLIF(item.value->>'houseLimit', ''), '0')::integer,
      COALESCE(NULLIF(item.value->>'housekeepingPoints', ''), '0')::integer,
      COALESCE(NULLIF(item.value->>'totalRoom', ''), '0')::integer,
      COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{hotelMasters,roomTypes}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_room_master (
      property_id, room_no, sort_order, room_type_code, description, location_code,
      max_guest, room_size, display_sequence, keycard_room_mapping, active
    )
    SELECT p_property_id, item.value->>'roomNo', item.ordinality::integer,
      item.value->>'roomTypeCode', COALESCE(item.value->>'description', ''),
      item.value->>'locationCode', COALESCE(NULLIF(item.value->>'maxGuest', ''), '1')::integer,
      COALESCE(NULLIF(item.value->>'roomSize', ''), '0')::integer,
      COALESCE(NULLIF(item.value->>'displaySequence', ''), item.ordinality::text)::integer,
      COALESCE(item.value->>'keycardRoomMapping', ''), COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{hotelMasters,rooms}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_bookings (
      property_id, reference, sort_order, guest, arrival_date, departure_date, status,
      assigned_rooms, checked_in_guests, guests, amount, highlight_dates,
      group_name, phone, account_name, credit_limit, print_rate, state_tax, tourism_tax,
      email, sales_channel, source, segment, reference_no
    )
    SELECT p_property_id, item.value->>'reference', item.ordinality::integer,
      item.value->>'guest', item.value->>'arrival', item.value->>'departure',
      COALESCE(item.value->>'status', 'Booked'),
      COALESCE(NULLIF(item.value->>'assignedRooms', ''), '0')::integer,
      COALESCE(NULLIF(item.value->>'checkedInGuests', ''), '0')::integer,
      COALESCE(NULLIF(item.value->>'guests', ''), '1')::integer,
      COALESCE(NULLIF(item.value->>'amount', ''), '0')::numeric,
      COALESCE((item.value->>'highlightDates')::boolean, false),
      COALESCE(item.value->>'groupName', ''), COALESCE(item.value->>'phone', ''),
      COALESCE(item.value->>'accountName', ''), COALESCE(NULLIF(item.value->>'creditLimit', ''), '0')::numeric,
      COALESCE((item.value->>'printRate')::boolean, true), COALESCE((item.value->>'stateTax')::boolean, true),
      COALESCE((item.value->>'tourismTax')::boolean, true), COALESCE(item.value->>'email', ''),
      COALESCE(item.value->>'salesChannel', 'Direct'), COALESCE(item.value->>'source', 'Booking'),
      COALESCE(item.value->>'segment', 'Leisure'), COALESCE(item.value->>'referenceNo', '')
    FROM jsonb_array_elements(COALESCE(p_state->'bookings', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_booking_rooms (
      property_id, booking_reference, room_type_code, sort_order, room_count,
      adults, children, infants, rate_code, room_rate, promo_code, discount_per_night,
      subtotal, discount, tax, total
    )
    SELECT p_property_id, booking.value->>'reference', room.value->>'code',
      room.ordinality::integer, COALESCE(NULLIF(room.value->>'count', ''), '1')::integer,
      COALESCE(NULLIF(room.value->>'adults', ''), '1')::integer, COALESCE(NULLIF(room.value->>'children', ''), '0')::integer,
      COALESCE(NULLIF(room.value->>'infants', ''), '0')::integer, COALESCE(room.value->>'rateCode', 'BAR'),
      COALESCE(NULLIF(room.value->>'roomRate', ''), '0')::numeric, COALESCE(room.value->>'promoCode', ''),
      COALESCE(NULLIF(room.value->>'discountPerNight', ''), '0')::numeric, COALESCE(NULLIF(room.value->>'subtotal', ''), '0')::numeric,
      COALESCE(NULLIF(room.value->>'discount', ''), '0')::numeric, COALESCE(NULLIF(room.value->>'tax', ''), '0')::numeric,
      COALESCE(NULLIF(room.value->>'total', ''), '0')::numeric
    FROM jsonb_array_elements(COALESCE(p_state->'bookings', '[]'::jsonb)) AS booking(value)
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(booking.value->'rooms', '[]'::jsonb))
      WITH ORDINALITY AS room(value, ordinality);

    INSERT INTO public.hotelx_season_master (property_id, id, sort_order, name, color, active)
    SELECT p_property_id, item.value->>'id', item.ordinality::integer, item.value->>'name', COALESCE(item.value->>'color', '#ff9100'), COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{rateSetup,seasons}', '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_season_calendar (property_id, calendar_date, season_id)
    SELECT p_property_id, assignment.key::date, assignment.value #>> '{}'
    FROM jsonb_each(COALESCE(p_state #> '{rateSetup,calendar}', '{}'::jsonb)) AS assignment(key, value)
    WHERE COALESCE(assignment.value #>> '{}', '') <> '';

    INSERT INTO public.hotelx_rate_element (property_id, id, sort_order, name, basis, min_qty, max_qty, amount, active)
    SELECT p_property_id, item.value->>'id', item.ordinality::integer, item.value->>'name', item.value->>'basis', COALESCE(NULLIF(item.value->>'min', ''), '0')::integer, COALESCE(NULLIF(item.value->>'max', ''), '0')::integer, COALESCE(NULLIF(item.value->>'amount', ''), '0')::numeric, COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{rateSetup,elements}', '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_rate_type (property_id, id, sort_order, name, active)
    SELECT p_property_id, item.value->>'id', item.ordinality::integer, item.value->>'name', COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{rateSetup,rateTypes}', '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_rate_setup (property_id, id, sort_order, code, description, active, web, last_updated_on)
    SELECT p_property_id, item.value->>'id', item.ordinality::integer, item.value->>'code', item.value->>'description', COALESCE((item.value->>'active')::boolean, true), COALESCE((item.value->>'web')::boolean, false), CASE WHEN COALESCE(item.value->>'updated', '') ~ '^\d{2} [A-Za-z]{3} \d{4}$' THEN to_date(item.value->>'updated', 'DD Mon YYYY') ELSE NULL END
    FROM jsonb_array_elements(COALESCE(p_state #> '{rateSetup,ratePlans}', '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_rate_setup_validity (property_id, rate_setup_id, id, sort_order, valid_from, valid_to, active)
    SELECT p_property_id, item.value->>'rateSetupId', item.value->>'id', item.ordinality::integer, (item.value->>'from')::date, (item.value->>'to')::date, COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{rateSetup,validity}', '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_transport_rules (
      property_id, start_time, end_time, turnaround_minutes,
      boarding_lead_minutes, notes
    ) VALUES (
      p_property_id,
      COALESCE(p_state #>> '{setup,rules,start}', '07:00'),
      COALESCE(p_state #>> '{setup,rules,end}', '19:00'),
      COALESCE(NULLIF(p_state #>> '{setup,rules,turnaroundMinutes}', ''), '0')::integer,
      COALESCE(NULLIF(p_state #>> '{setup,rules,boardingLeadMinutes}', ''), '0')::integer,
      COALESCE(p_state #>> '{setup,rules,notes}', '')
    );

    INSERT INTO public.hotelx_transport_operators (
      property_id, id, sort_order, name, contact, phone, email, active
    )
    SELECT
      p_property_id,
      item.value->>'id',
      item.ordinality::integer,
      item.value->>'name',
      COALESCE(item.value->>'contact', ''),
      COALESCE(item.value->>'phone', ''),
      COALESCE(item.value->>'email', ''),
      COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{setup,operators}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_transport_services (
      property_id, id, sort_order, name, operator_id, capacity, status,
      service_type, booking_mode
    )
    SELECT
      p_property_id,
      item.value->>'id',
      item.ordinality::integer,
      item.value->>'name',
      item.value->>'operatorId',
      COALESCE(NULLIF(item.value->>'capacity', ''), '1')::integer,
      COALESCE(item.value->>'status', 'Active'),
      COALESCE(item.value->>'serviceType', 'Speedboat'),
      COALESCE(
        item.value->>'bookingMode',
        CASE
          WHEN COALESCE(item.value->>'serviceType', 'Speedboat') IN ('Speedboat', 'Shuttle')
            THEN 'Scheduled'
          ELSE 'OnDemand'
        END
      )
    FROM jsonb_array_elements(COALESCE(p_state #> '{setup,boats}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_transport_routes (
      property_id, id, sort_order, origin, destination, meeting_point,
      duration_minutes, operator_id, to_hotel, active
    )
    SELECT
      p_property_id,
      item.value->>'id',
      item.ordinality::integer,
      item.value->>'origin',
      item.value->>'destination',
      COALESCE(item.value->>'meetingPoint', ''),
      COALESCE(NULLIF(item.value->>'durationMinutes', ''), '1')::integer,
      item.value->>'operatorId',
      COALESCE((item.value->>'toHotel')::boolean, false),
      COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{setup,routes}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_transport_templates (
      property_id, id, sort_order, name, route_id, service_id,
      start_date, end_date, weekdays, departure_times, excluded_dates
    )
    SELECT
      p_property_id,
      item.value->>'id',
      item.ordinality::integer,
      item.value->>'name',
      item.value->>'routeId',
      item.value->>'boatId',
      item.value->>'startDate',
      item.value->>'endDate',
      ARRAY(
        SELECT weekday.value::smallint
        FROM jsonb_array_elements_text(COALESCE(item.value->'weekdays', '[]'::jsonb)) AS weekday(value)
      ),
      ARRAY(
        SELECT departure.value
        FROM jsonb_array_elements_text(COALESCE(item.value->'times', '[]'::jsonb)) AS departure(value)
      ),
      ARRAY(
        SELECT excluded.value
        FROM jsonb_array_elements_text(COALESCE(item.value->'excludedDates', '[]'::jsonb)) AS excluded(value)
      )
    FROM jsonb_array_elements(COALESCE(p_state->'templates', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_transport_day_notes (
      property_id, date_key, tide, restricted, holiday, notes
    )
    SELECT
      p_property_id,
      note.key,
      COALESCE(note.value->>'tide', ''),
      COALESCE(note.value->>'restricted', ''),
      COALESCE(note.value->>'holiday', ''),
      COALESCE(note.value->>'notes', '')
    FROM jsonb_each(COALESCE(p_state->'dayNotes', '{}'::jsonb)) AS note(key, value);

    INSERT INTO public.hotelx_transport_trips (
      property_id, id, sort_order, trip_date, trip_time, direction,
      origin, destination, meeting_point, duration_minutes,
      boarding_lead_minutes, turnaround_minutes, operating_notes,
      to_hotel, service_id, service_name, operator_name, capacity, status
    )
    SELECT
      p_property_id,
      trip.value->>'id',
      trip.ordinality::integer,
      trip.value->>'date',
      trip.value->>'time',
      trip.value->>'direction',
      trip.value->>'origin',
      trip.value->>'destination',
      COALESCE(trip.value->>'meetingPoint', ''),
      COALESCE(NULLIF(trip.value->>'durationMinutes', ''), '0')::integer,
      COALESCE(NULLIF(trip.value->>'boardingLeadMinutes', ''), '0')::integer,
      COALESCE(NULLIF(trip.value->>'turnaroundMinutes', ''), '0')::integer,
      COALESCE(trip.value->>'operatingNotes', ''),
      COALESCE((trip.value->>'toHotel')::boolean, false),
      COALESCE(trip.value->>'boatId', ''),
      COALESCE(trip.value->>'boat', ''),
      COALESCE(trip.value->>'operator', ''),
      COALESCE(NULLIF(trip.value->>'capacity', ''), '1')::integer,
      COALESCE(trip.value->>'status', 'Scheduled')
    FROM jsonb_array_elements(COALESCE(p_state->'trips', '[]'::jsonb))
      WITH ORDINALITY AS trip(value, ordinality);

    INSERT INTO public.hotelx_transport_trip_groups (
      property_id, trip_id, id, sort_order, booking_id, reference,
      name, adults, children, boarded
    )
    SELECT
      p_property_id,
      trip.value->>'id',
      group_row.value->>'id',
      group_row.ordinality::integer,
      NULLIF(group_row.value->>'bookingId', ''),
      COALESCE(group_row.value->>'reference', ''),
      COALESCE(group_row.value->>'name', ''),
      COALESCE(NULLIF(group_row.value->>'adults', ''), '0')::integer,
      COALESCE(NULLIF(group_row.value->>'children', ''), '0')::integer,
      COALESCE((group_row.value->>'boarded')::boolean, false)
    FROM jsonb_array_elements(COALESCE(p_state->'trips', '[]'::jsonb)) AS trip(value)
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(trip.value->'groups', '[]'::jsonb))
      WITH ORDINALITY AS group_row(value, ordinality);

    INSERT INTO public.hotelx_transport_booking_legs (
      property_id, id, sort_order, booking_reference, direction,
      service_id, service_name, service_type, booking_mode,
      operator_id, operator_name, travel_date, travel_time, pickup,
      dropoff, passengers, flight_no, vehicle, driver, remarks, trip_id
    )
    SELECT
      p_property_id,
      leg.value->>'id',
      leg.ordinality::integer,
      leg.value->>'bookingReference',
      leg.value->>'direction',
      leg.value->>'serviceId',
      leg.value->>'serviceName',
      COALESCE(leg.value->>'serviceType', 'Other'),
      COALESCE(leg.value->>'bookingMode', 'OnDemand'),
      COALESCE(leg.value->>'operatorId', ''),
      COALESCE(leg.value->>'operatorName', ''),
      COALESCE(leg.value->>'date', ''),
      COALESCE(leg.value->>'time', ''),
      COALESCE(leg.value->>'pickup', ''),
      COALESCE(leg.value->>'dropoff', ''),
      COALESCE(NULLIF(leg.value->>'passengers', ''), '1')::integer,
      COALESCE(leg.value->>'flightNo', ''),
      COALESCE(leg.value->>'vehicle', ''),
      COALESCE(leg.value->>'driver', ''),
      COALESCE(leg.value->>'remarks', ''),
      COALESCE(leg.value->>'tripId', '')
    FROM jsonb_array_elements(COALESCE(p_state->'bookingLegs', '[]'::jsonb))
      WITH ORDINALITY AS leg(value, ordinality);
  END;
  $$`,
  `CREATE OR REPLACE FUNCTION public.hotelx_transport_initialize(
    p_property_id text,
    p_revision integer,
    p_state jsonb
  ) RETURNS integer
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_revision integer;
  BEGIN
    INSERT INTO public.hotelx_transport_meta (id, schema_version, revision)
    VALUES (p_property_id, 2, GREATEST(COALESCE(p_revision, 1), 1))
    ON CONFLICT (id) DO NOTHING
    RETURNING revision INTO v_revision;

    IF v_revision IS NULL THEN
      RETURN NULL;
    END IF;

    PERFORM public.hotelx_transport_replace_rows(p_property_id, p_state);
    RETURN v_revision;
  END;
  $$`,
  `CREATE OR REPLACE FUNCTION public.hotelx_transport_save(
    p_property_id text,
    p_expected_revision integer,
    p_state jsonb
  ) RETURNS integer
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_revision integer;
  BEGIN
    UPDATE public.hotelx_transport_meta
    SET revision = revision + 1,
        schema_version = 2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_property_id
      AND revision = p_expected_revision
    RETURNING revision INTO v_revision;

    IF v_revision IS NULL THEN
      RETURN NULL;
    END IF;

    PERFORM public.hotelx_transport_replace_rows(p_property_id, p_state);
    RETURN v_revision;
  END;
  $$`,
  `CREATE OR REPLACE FUNCTION public.hotelx_transport_read(p_property_id text)
  RETURNS TABLE(revision integer, state jsonb)
  LANGUAGE sql
  STABLE
  AS $$
  SELECT
    meta.revision,
    jsonb_build_object(
      'hotelMasters', jsonb_build_object(
        'locations', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'code', location.code,
            'description', location.description,
            'floorPlanAttachment', location.floor_plan_attachment,
            'active', location.active
          ) ORDER BY location.sort_order)
          FROM public.hotelx_location_master AS location
          WHERE location.property_id = meta.id
        ), '[]'::jsonb),
        'roomTypes', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'code', room_type.code,
            'description', room_type.description,
            'propertyType', room_type.property_type,
            'measureType', room_type.measure_type,
            'roomSize', room_type.room_size,
            'maxGuest', room_type.max_guest,
            'houseLimit', room_type.house_limit,
            'housekeepingPoints', room_type.housekeeping_points,
            'totalRoom', room_type.total_room,
            'active', room_type.active
          ) ORDER BY room_type.sort_order)
          FROM public.hotelx_room_type_master AS room_type
          WHERE room_type.property_id = meta.id
        ), '[]'::jsonb),
        'rooms', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'roomNo', room.room_no,
            'roomTypeCode', room.room_type_code,
            'description', room.description,
            'locationCode', room.location_code,
            'maxGuest', room.max_guest,
            'roomSize', room.room_size,
            'displaySequence', room.display_sequence,
            'keycardRoomMapping', room.keycard_room_mapping,
            'active', room.active
          ) ORDER BY room.sort_order)
          FROM public.hotelx_room_master AS room
          WHERE room.property_id = meta.id
        ), '[]'::jsonb)
      ),
      'bookings', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'reference', booking.reference,
          'guest', booking.guest,
          'arrival', booking.arrival_date,
          'departure', booking.departure_date,
          'status', booking.status,
          'rooms', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'code', br.room_type_code, 'count', br.room_count, 'adults', br.adults, 'children', br.children, 'infants', br.infants,
              'rateCode', br.rate_code, 'roomRate', br.room_rate::double precision, 'promoCode', br.promo_code,
              'discountPerNight', br.discount_per_night::double precision, 'subtotal', br.subtotal::double precision,
              'discount', br.discount::double precision, 'tax', br.tax::double precision, 'total', br.total::double precision
            ) ORDER BY br.sort_order)
            FROM public.hotelx_booking_rooms AS br
            WHERE br.property_id = booking.property_id AND br.booking_reference = booking.reference
          ), '[]'::jsonb),
          'assignedRooms', booking.assigned_rooms,
          'checkedInGuests', booking.checked_in_guests,
          'guests', booking.guests,
          'amount', booking.amount::double precision,
          'highlightDates', booking.highlight_dates,
          'groupName', booking.group_name, 'phone', booking.phone, 'accountName', booking.account_name,
          'creditLimit', booking.credit_limit::double precision, 'printRate', booking.print_rate, 'stateTax', booking.state_tax,
          'tourismTax', booking.tourism_tax, 'email', booking.email, 'salesChannel', booking.sales_channel,
          'source', booking.source, 'segment', booking.segment, 'referenceNo', booking.reference_no
        ) ORDER BY booking.sort_order)
        FROM public.hotelx_bookings AS booking
        WHERE booking.property_id = meta.id
      ), '[]'::jsonb),
      'rateSetup', jsonb_build_object(
        'seasons', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'color', s.color, 'active', s.active) ORDER BY s.sort_order) FROM public.hotelx_season_master s WHERE s.property_id = meta.id), '[]'::jsonb),
        'calendar', COALESCE((SELECT jsonb_object_agg(to_char(c.calendar_date, 'YYYY-MM-DD'), c.season_id) FROM public.hotelx_season_calendar c WHERE c.property_id = meta.id), '{}'::jsonb),
        'elements', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'basis', e.basis, 'min', e.min_qty, 'max', e.max_qty, 'amount', e.amount::double precision, 'active', e.active) ORDER BY e.sort_order) FROM public.hotelx_rate_element e WHERE e.property_id = meta.id), '[]'::jsonb),
        'rateTypes', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'active', t.active) ORDER BY t.sort_order) FROM public.hotelx_rate_type t WHERE t.property_id = meta.id), '[]'::jsonb),
        'ratePlans', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'code', r.code, 'description', r.description, 'updated', COALESCE(to_char(r.last_updated_on, 'DD Mon YYYY'), ''), 'active', r.active, 'web', r.web) ORDER BY r.sort_order) FROM public.hotelx_rate_setup r WHERE r.property_id = meta.id), '[]'::jsonb),
        'validity', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', v.id, 'rateSetupId', v.rate_setup_id, 'from', to_char(v.valid_from, 'YYYY-MM-DD'), 'to', to_char(v.valid_to, 'YYYY-MM-DD'), 'active', v.active) ORDER BY v.sort_order) FROM public.hotelx_rate_setup_validity v WHERE v.property_id = meta.id), '[]'::jsonb)
      ),
      'setup', jsonb_build_object(
        'operators', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', op.id,
              'name', op.name,
              'contact', op.contact,
              'phone', op.phone,
              'email', op.email,
              'active', op.active
            ) ORDER BY op.sort_order
          )
          FROM public.hotelx_transport_operators AS op
          WHERE op.property_id = meta.id
        ), '[]'::jsonb),
        'boats', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', service.id,
              'name', service.name,
              'operatorId', service.operator_id,
              'capacity', service.capacity,
              'status', service.status,
              'serviceType', service.service_type,
              'bookingMode', service.booking_mode
            ) ORDER BY service.sort_order
          )
          FROM public.hotelx_transport_services AS service
          WHERE service.property_id = meta.id
        ), '[]'::jsonb),
        'routes', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', route.id,
              'origin', route.origin,
              'destination', route.destination,
              'meetingPoint', route.meeting_point,
              'durationMinutes', route.duration_minutes,
              'operatorId', route.operator_id,
              'toHotel', route.to_hotel,
              'active', route.active
            ) ORDER BY route.sort_order
          )
          FROM public.hotelx_transport_routes AS route
          WHERE route.property_id = meta.id
        ), '[]'::jsonb),
        'rules', COALESCE((
          SELECT jsonb_build_object(
            'start', rules.start_time,
            'end', rules.end_time,
            'turnaroundMinutes', rules.turnaround_minutes,
            'boardingLeadMinutes', rules.boarding_lead_minutes,
            'notes', rules.notes
          )
          FROM public.hotelx_transport_rules AS rules
          WHERE rules.property_id = meta.id
        ), '{}'::jsonb)
      ),
      'trips', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', trip.id,
            'date', trip.trip_date,
            'time', trip.trip_time,
            'direction', trip.direction,
            'origin', trip.origin,
            'destination', trip.destination,
            'meetingPoint', trip.meeting_point,
            'durationMinutes', trip.duration_minutes,
            'boardingLeadMinutes', trip.boarding_lead_minutes,
            'turnaroundMinutes', trip.turnaround_minutes,
            'operatingNotes', trip.operating_notes,
            'toHotel', trip.to_hotel,
            'boatId', trip.service_id,
            'boat', trip.service_name,
            'operator', trip.operator_name,
            'capacity', trip.capacity,
            'status', trip.status,
            'groups', COALESCE((
              SELECT jsonb_agg(
                jsonb_strip_nulls(jsonb_build_object(
                  'id', group_row.id,
                  'bookingId', group_row.booking_id,
                  'reference', group_row.reference,
                  'name', group_row.name,
                  'adults', group_row.adults,
                  'children', group_row.children,
                  'boarded', group_row.boarded
                )) ORDER BY group_row.sort_order
              )
              FROM public.hotelx_transport_trip_groups AS group_row
              WHERE group_row.property_id = trip.property_id
                AND group_row.trip_id = trip.id
            ), '[]'::jsonb)
          ) ORDER BY trip.sort_order
        )
        FROM public.hotelx_transport_trips AS trip
        WHERE trip.property_id = meta.id
      ), '[]'::jsonb),
      'templates', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', template.id,
            'name', template.name,
            'routeId', template.route_id,
            'boatId', template.service_id,
            'startDate', template.start_date,
            'endDate', template.end_date,
            'weekdays', to_jsonb(template.weekdays),
            'times', to_jsonb(template.departure_times),
            'excludedDates', to_jsonb(template.excluded_dates)
          ) ORDER BY template.sort_order
        )
        FROM public.hotelx_transport_templates AS template
        WHERE template.property_id = meta.id
      ), '[]'::jsonb),
      'dayNotes', COALESCE((
        SELECT jsonb_object_agg(
          note.date_key,
          jsonb_build_object(
            'tide', note.tide,
            'restricted', note.restricted,
            'holiday', note.holiday,
            'notes', note.notes
          )
        )
        FROM public.hotelx_transport_day_notes AS note
        WHERE note.property_id = meta.id
      ), '{}'::jsonb),
      'bookingLegs', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', leg.id,
            'bookingReference', leg.booking_reference,
            'direction', leg.direction,
            'serviceId', leg.service_id,
            'serviceName', leg.service_name,
            'serviceType', leg.service_type,
            'bookingMode', leg.booking_mode,
            'operatorId', leg.operator_id,
            'operatorName', leg.operator_name,
            'date', leg.travel_date,
            'time', leg.travel_time,
            'pickup', leg.pickup,
            'dropoff', leg.dropoff,
            'passengers', leg.passengers,
            'flightNo', leg.flight_no,
            'vehicle', leg.vehicle,
            'driver', leg.driver,
            'remarks', leg.remarks,
            'tripId', leg.trip_id
          ) ORDER BY leg.sort_order
        )
        FROM public.hotelx_transport_booking_legs AS leg
        WHERE leg.property_id = meta.id
      ), '[]'::jsonb)
    )
  FROM public.hotelx_transport_meta AS meta
  WHERE meta.id = p_property_id;
  $$`,
];

const readSql =
  '/* normalized-read */ SELECT revision::text, state::text FROM public.hotelx_transport_read($1)';
const legacyExistsSql =
  "/* normalized-legacy-exists */ SELECT COALESCE(to_regclass('public.hotelx_transport_state')::text, '')";
const legacyReadSql =
  '/* normalized-legacy-read */ SELECT revision::text, state::text FROM public.hotelx_transport_state WHERE id = $1';
const initializeSql =
  '/* normalized-initialize */ SELECT public.hotelx_transport_initialize($1, $2::integer, $3::jsonb)::text';
const bookingExtrasReadSql = `/* normalized-booking-extras-read */
SELECT
  booking.reference,
  booking.group_name,
  booking.phone,
  booking.account_name,
  booking.credit_limit::text,
  booking.print_rate::text,
  booking.state_tax::text,
  booking.tourism_tax::text,
  booking.email,
  booking.sales_channel,
  booking.source,
  booking.segment,
  booking.reference_no,
  COALESCE(room.room_type_code, ''),
  COALESCE(room.adults, 1)::text,
  COALESCE(room.children, 0)::text,
  COALESCE(room.infants, 0)::text,
  COALESCE(room.rate_code, 'BAR'),
  COALESCE(room.room_rate, 0)::text,
  COALESCE(room.promo_code, ''),
  COALESCE(room.discount_per_night, 0)::text,
  COALESCE(room.subtotal, 0)::text,
  COALESCE(room.discount, 0)::text,
  COALESCE(room.tax, 0)::text,
  COALESCE(room.total, 0)::text
FROM public.hotelx_bookings AS booking
LEFT JOIN public.hotelx_booking_rooms AS room
  ON room.property_id = booking.property_id
 AND room.booking_reference = booking.reference
WHERE booking.property_id = $1
ORDER BY booking.sort_order, room.sort_order`;
const saveSql =
  '/* normalized-save */ SELECT public.hotelx_transport_save($1, $2::integer, $3::jsonb)::text';

export type NormalizedTransportStorage = {
  read: (connection: string, id: string) => Promise<string[] | null>;
  readOrInitialize: (
    connection: string,
    id: string,
    seed: TransportState,
  ) => Promise<string[]>;
  save: (
    connection: string,
    id: string,
    expectedRevision: number,
    state: TransportState,
  ) => Promise<number | null>;
};

export function createNormalizedTransportStorage(
  query: Query,
): NormalizedTransportStorage {
  let ready: Promise<void> | null = null;

  const ensure = async (connection: string) => {
    if (!ready) {
      // Workers Free permits 50 subrequests, including redirects. Sending these
      // 56 statements separately exhausts that budget before the first read.
      // One PostgreSQL block keeps setup atomic and uses one HTTP query.
      const statements = schemaStatements;
      ready = query(
        connection,
        `DO $hotelx_schema$ BEGIN
          PERFORM pg_advisory_xact_lock(hashtext('hotelx-transport-schema'));
          ${statements.join(';\n')};
        END; $hotelx_schema$`,
        [],
      )
        .then(() => {})
        .catch((error) => {
          ready = null;
          throw error;
        });
    }
    await ready;
  };

  const read = async (connection: string, id: string) => {
    await ensure(connection);
    const rows = await query(connection, readSql, [id]);
    const row = rows[0] ?? null;
    if (!row) return null;

    const extras = await query(connection, bookingExtrasReadSql, [id]);
    if (!extras.length) return row;

    const state = JSON.parse(row[1]) as TransportState;
    const bookings = new Map(state.bookings.map((booking) => [booking.reference, booking]));
    const numeric = (value: string | undefined) => {
      const parsed = Number(value ?? '0');
      return Number.isFinite(parsed) ? parsed : 0;
    };
    for (const values of extras) {
      const booking = bookings.get(values[0]);
      if (!booking) continue;
      booking.groupName = values[1] ?? '';
      booking.phone = values[2] ?? '';
      booking.accountName = values[3] ?? '';
      booking.creditLimit = numeric(values[4]);
      booking.printRate = values[5] === 'true';
      booking.stateTax = values[6] === 'true';
      booking.tourismTax = values[7] === 'true';
      booking.email = values[8] ?? '';
      booking.salesChannel = values[9] ?? 'Direct';
      booking.source = values[10] ?? 'Booking';
      booking.segment = values[11] ?? 'Leisure';
      booking.referenceNo = values[12] ?? '';

      const roomCode = values[13];
      if (!roomCode) continue;
      const room = booking.rooms.find((item) => item.code === roomCode);
      if (!room) continue;
      room.adults = numeric(values[14]);
      room.children = numeric(values[15]);
      room.infants = numeric(values[16]);
      room.rateCode = values[17] ?? 'BAR';
      room.roomRate = numeric(values[18]);
      room.promoCode = values[19] ?? '';
      room.discountPerNight = numeric(values[20]);
      room.subtotal = numeric(values[21]);
      room.discount = numeric(values[22]);
      room.tax = numeric(values[23]);
      room.total = numeric(values[24]);
    }
    return [row[0], JSON.stringify(state)];
  };

  const readLegacy = async (connection: string, id: string) => {
    const exists = await query(connection, legacyExistsSql, []);
    if (!exists[0]?.[0]) return null;
    const rows = await query(connection, legacyReadSql, [id]);
    return rows[0] ?? null;
  };

  return {
    read,
    async readOrInitialize(connection, id, seed) {
      const current = await read(connection, id);
      if (current) {
        const raw = JSON.parse(current[1]) as Partial<TransportState>;
        const hasMasters = Boolean(
          raw.hotelMasters &&
          Array.isArray(raw.hotelMasters.locations) &&
          Array.isArray(raw.hotelMasters.roomTypes) &&
          raw.hotelMasters.roomTypes.length &&
          Array.isArray(raw.hotelMasters.rooms) &&
          raw.hotelMasters.rooms.length,
        );
        const hasBookings = Array.isArray(raw.bookings) && raw.bookings.length > 0;
        const hasRateSetup = Boolean(raw.rateSetup && Array.isArray(raw.rateSetup.seasons) && raw.rateSetup.seasons.length && Array.isArray(raw.rateSetup.elements) && raw.rateSetup.elements.length && Array.isArray(raw.rateSetup.rateTypes) && raw.rateSetup.rateTypes.length && Array.isArray(raw.rateSetup.ratePlans) && raw.rateSetup.ratePlans.length && Array.isArray(raw.rateSetup.validity));
        if (!hasMasters || !hasBookings || !hasRateSetup) {
          const merged: TransportState = {
            ...seed,
            ...raw,
            hotelMasters: hasMasters ? raw.hotelMasters! : seed.hotelMasters,
            bookings: hasBookings ? raw.bookings! : seed.bookings,
            rateSetup: hasRateSetup ? raw.rateSetup! : seed.rateSetup,
          } as TransportState;
          const upgraded = await query(connection, saveSql, [id, current[0], JSON.stringify(merged)]);
          const revision = Number(upgraded[0]?.[0]);
          if (Number.isSafeInteger(revision) && revision >= 1)
            return [String(revision), JSON.stringify(merged)];
        }
        return current;
      }

      const legacy = await readLegacy(connection, id);
      const revision = legacy?.[0] ?? '1';
      const state = legacy?.[1] ?? JSON.stringify(seed);
      await query(connection, initializeSql, [id, revision, state]);

      const initialized = await read(connection, id);
      if (!initialized)
        throw new ApiError(
          'STORAGE_INIT',
          'Could not initialize normalized transport storage. Try again.',
          503,
        );
      return initialized;
    },
    async save(connection, id, expectedRevision, state) {
      await ensure(connection);
      const rows = await query(connection, saveSql, [
        id,
        String(expectedRevision),
        JSON.stringify(state),
      ]);
      const revision = Number(rows[0]?.[0]);
      return Number.isSafeInteger(revision) && revision >= 1 ? revision : null;
    },
  };
}
