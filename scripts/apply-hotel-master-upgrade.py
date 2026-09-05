from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match in {path}, found {count}')
    p.write_text(s.replace(old, new, 1))


# Fix ReactNode typing in the new master screen.
p = Path('components/hotel-master-files.tsx')
s = p.read_text().replace(
    "import { useMemo, useState } from 'react';",
    "import { useMemo, useState, type ReactNode } from 'react';",
).replace('children: React.ReactNode;', 'children: ReactNode;')
p.write_text(s)

# State/domain wiring.
replace_once(
    'lib/transport-state.ts',
    "import { sampleBookings } from './bookings';",
    "import type { Booking } from './bookings';\nimport {\n  initialBookings,\n  initialHotelMasters,\n  type HotelLocation,\n  type HotelMasters,\n  type HotelRoom,\n  type HotelRoomType,\n} from './hotel-masters';",
    'hotel master imports',
)
replace_once(
    'lib/transport-state.ts',
    """export type TransportState = {
  setup: TransportSetup;
  trips: Trip[];
  templates: ScheduleTemplate[];
  dayNotes: Record<string, DayNote>;
  bookingLegs: BookingTransportLeg[];
};""",
    """export type TransportState = {
  setup: TransportSetup;
  trips: Trip[];
  templates: ScheduleTemplate[];
  dayNotes: Record<string, DayNote>;
  bookingLegs: BookingTransportLeg[];
  hotelMasters: HotelMasters;
  bookings: Booking[];
};""",
    'state shape',
)
replace_once(
    'lib/transport-state.ts',
    """  | {
      type: 'transfers';
      bookingReference: string;
      selection: BookingTransferSelection;
    };""",
    """  | { type: 'hotelLocationSave'; value: HotelLocation }
  | { type: 'hotelRoomTypeSave'; value: HotelRoomType }
  | { type: 'hotelRoomSave'; value: HotelRoom }
  | { type: 'bookingCreate'; value: Booking }
  | {
      type: 'transfers';
      bookingReference: string;
      selection: BookingTransferSelection;
    };""",
    'action types',
)
replace_once(
    'lib/transport-state.ts',
    """    dayNotes: initialDayNotes,
    bookingLegs: [],
  });""",
    """    dayNotes: initialDayNotes,
    bookingLegs: [],
    hotelMasters: initialHotelMasters,
    bookings: initialBookings,
  });""",
    'initial state',
)
replace_once(
    'lib/transport-state.ts',
    """export function normalizeTransportState(state: TransportState): TransportState {
  return {""",
    """export function normalizeTransportState(state: TransportState): TransportState {
  const hotelMasters =
    state.hotelMasters &&
    Array.isArray(state.hotelMasters.locations) &&
    Array.isArray(state.hotelMasters.roomTypes) &&
    Array.isArray(state.hotelMasters.rooms) &&
    state.hotelMasters.roomTypes.length
      ? state.hotelMasters
      : structuredClone(initialHotelMasters);
  const bookings =
    Array.isArray(state.bookings) && state.bookings.length
      ? state.bookings
      : structuredClone(initialBookings);
  return {""",
    'normalize prelude',
)
replace_once(
    'lib/transport-state.ts',
    """    bookingLegs: Array.isArray(state.bookingLegs) ? state.bookingLegs : [],
  };""",
    """    bookingLegs: Array.isArray(state.bookingLegs) ? state.bookingLegs : [],
    hotelMasters,
    bookings,
  };""",
    'normalize masters',
)

marker = "    case 'bookingTransportAdd': {"
p = Path('lib/transport-state.ts')
s = p.read_text()
if s.count(marker) != 1:
    raise SystemExit('booking transport action marker not found once')
master_cases = r"""    case 'hotelLocationSave': {
      const normalized = normalizeTransportState(state);
      const v = object(action.value);
      const value: HotelLocation = {
        code: text(v.code, 'location code', true, 20).trim().toUpperCase(),
        description: text(v.description, 'location description', true, 120).trim(),
        floorPlanAttachment: text(v.floorPlanAttachment, 'floor plan attachment', false, 255).trim(),
        active: boolean(v.active),
      };
      const exists = normalized.hotelMasters.locations.some((item) => item.code === value.code);
      return {
        ...normalized,
        hotelMasters: {
          ...normalized.hotelMasters,
          locations: exists
            ? normalized.hotelMasters.locations.map((item) => item.code === value.code ? value : item)
            : [...normalized.hotelMasters.locations, value],
        },
      };
    }
    case 'hotelRoomTypeSave': {
      const normalized = normalizeTransportState(state);
      const v = object(action.value);
      const code = text(v.code, 'room type code', true, 20).trim().toUpperCase();
      const value: HotelRoomType = {
        code,
        description: text(v.description, 'room type description', true, 120).trim(),
        propertyType: text(v.propertyType, 'property type', true, 60).trim(),
        measureType: text(v.measureType, 'measure type', true, 60).trim(),
        roomSize: number(v.roomSize, 'room size', 0, 100000),
        maxGuest: number(v.maxGuest, 'max guest', 1, 50),
        houseLimit: number(v.houseLimit, 'house limit', 0, 50),
        housekeepingPoints: number(v.housekeepingPoints, 'housekeeping points', 0, 10000),
        totalRoom: normalized.hotelMasters.rooms.filter((room) => room.roomTypeCode === code).length,
        active: boolean(v.active),
      };
      const exists = normalized.hotelMasters.roomTypes.some((item) => item.code === code);
      return {
        ...normalized,
        hotelMasters: {
          ...normalized.hotelMasters,
          roomTypes: exists
            ? normalized.hotelMasters.roomTypes.map((item) => item.code === code ? value : item)
            : [...normalized.hotelMasters.roomTypes, value],
          rooms: normalized.hotelMasters.rooms.map((room) =>
            room.roomTypeCode === code
              ? { ...room, maxGuest: value.maxGuest, roomSize: value.roomSize }
              : room,
          ),
        },
      };
    }
    case 'hotelRoomSave': {
      const normalized = normalizeTransportState(state);
      const v = object(action.value);
      const roomNo = text(v.roomNo, 'room number', true, 30).trim().toUpperCase();
      const roomTypeCode = text(v.roomTypeCode, 'room type', true, 20).trim().toUpperCase();
      const locationCode = text(v.locationCode, 'location', true, 20).trim().toUpperCase();
      const roomType = normalized.hotelMasters.roomTypes.find((item) => item.code === roomTypeCode && item.active);
      if (!roomType) throw new Error('Choose an active Room Type from Hotel Settings.');
      if (!normalized.hotelMasters.locations.some((item) => item.code === locationCode && item.active))
        throw new Error('Choose an active Location from Hotel Settings.');
      const value: HotelRoom = {
        roomNo,
        roomTypeCode,
        description: text(v.description, 'room description', true, 120).trim(),
        locationCode,
        maxGuest: roomType.maxGuest,
        roomSize: roomType.roomSize,
        displaySequence: number(v.displaySequence, 'display sequence', 1, 100000),
        keycardRoomMapping: text(v.keycardRoomMapping, 'keycard room mapping', false, 100).trim(),
        active: boolean(v.active),
      };
      const exists = normalized.hotelMasters.rooms.some((item) => item.roomNo === roomNo);
      const rooms = exists
        ? normalized.hotelMasters.rooms.map((item) => item.roomNo === roomNo ? value : item)
        : [...normalized.hotelMasters.rooms, value];
      const roomTypes = normalized.hotelMasters.roomTypes.map((type) => ({
        ...type,
        totalRoom: rooms.filter((room) => room.roomTypeCode === type.code).length,
      }));
      return { ...normalized, hotelMasters: { ...normalized.hotelMasters, rooms, roomTypes } };
    }
    case 'bookingCreate': {
      const normalized = normalizeTransportState(state);
      const v = object(action.value);
      const reference = text(v.reference, 'booking reference', true, 30).trim().toUpperCase();
      if (normalized.bookings.some((item) => item.reference === reference))
        throw new Error('This booking reference already exists.');
      const arrival = text(v.arrival, 'arrival date', true, 10);
      const departureDate = text(v.departure, 'departure date', true, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(arrival) || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate) || departureDate <= arrival)
        throw new Error('Departure date must be after the arrival date.');
      const bookingRooms = list(v.rooms, 10).map((entry) => {
        const room = object(entry);
        const code = text(room.code, 'room type', true, 20).trim().toUpperCase();
        const master = normalized.hotelMasters.roomTypes.find((item) => item.code === code && item.active);
        if (!master) throw new Error(`Room Type ${code} is not active in Hotel Settings.`);
        const count = number(room.count, 'number of rooms', 1, master.totalRoom || 1);
        return { code, count };
      });
      const guests = number(v.guests, 'number of guests', 1, 1000);
      const guestCapacity = bookingRooms.reduce((total, item) => {
        const master = normalized.hotelMasters.roomTypes.find((type) => type.code === item.code)!;
        return total + master.maxGuest * item.count;
      }, 0);
      if (guests > guestCapacity)
        throw new Error(`Maximum guest capacity for the selected room(s) is ${guestCapacity}.`);
      if (typeof v.amount !== 'number' || !Number.isFinite(v.amount) || v.amount < 0 || v.amount > 100000000)
        throw new Error('Enter a valid booking amount.');
      const value: Booking = {
        reference,
        guest: text(v.guest, 'guest name', true, 160).trim(),
        arrival,
        departure: departureDate,
        status: 'Booked',
        rooms: bookingRooms,
        assignedRooms: 0,
        checkedInGuests: 0,
        guests,
        amount: v.amount,
      };
      return { ...normalized, bookings: [value, ...normalized.bookings] };
    }
"""
s = s.replace(marker, master_cases + marker, 1)
s = s.replace('const booking = sampleBookings.find(', 'const booking = normalizeTransportState(state).bookings.find(')
p.write_text(s)

# Main page navigation and master screens.
p = Path('app/page.tsx')
s = p.read_text()
s = s.replace(
    "import { HotelSettingsMenu } from '@/components/hotel-settings-menu';",
    "import { HotelSettingsMenu } from '@/components/hotel-settings-menu';\nimport { HotelMasterFiles } from '@/components/hotel-master-files';",
)
s = s.replace("import { sampleBookings, type Booking } from '@/lib/bookings';", "import type { Booking } from '@/lib/bookings';")
s = s.replace(
    "    'schedule' | 'setup' | 'hotelsettings' | 'booking' | 'frontdesk' | 'reporting'",
    "    | 'schedule'\n    | 'setup'\n    | 'hotelsettings'\n    | 'location'\n    | 'roomtype'\n    | 'room'\n    | 'booking'\n    | 'frontdesk'\n    | 'reporting'",
)
s = s.replace(
    "  const activeBooking =\n    sampleBookings.find((booking) => booking.reference === bookingReference) ??\n    null;\n  const { setup, trips, templates, bookingLegs } = store.state;",
    "  const { setup, trips, templates, bookingLegs, hotelMasters, bookings } = store.state;\n  const activeBooking =\n    bookings.find((booking) => booking.reference === bookingReference) ?? null;",
)
s = s.replace(
    "className={view === 'setup' || view === 'hotelsettings' ? 'active' : ''}",
    "className={['setup', 'hotelsettings', 'location', 'roomtype', 'room'].includes(view) ? 'active' : ''}",
)
s = s.replace(
    "aria-current={view === 'setup' || view === 'hotelsettings' ? 'page' : undefined}",
    "aria-current={['setup', 'hotelsettings', 'location', 'roomtype', 'room'].includes(view) ? 'page' : undefined}",
)
s = s.replace(
    """            ) : view === 'hotelsettings' ? (
              <span>Hotel Settings</span>
            ) : (""",
    """            ) : view === 'hotelsettings' ? (
              <span>Hotel Settings</span>
            ) : ['location', 'roomtype', 'room'].includes(view) ? (
              <>
                Hotel Settings <ChevronRight size={14} />{' '}
                {view === 'location' ? 'Location' : view === 'roomtype' ? 'Room Type' : 'Room'}
              </>
            ) : (""",
)
old = """          <Bookings
            booking={activeBooking}
            onSelect={(booking) => setBookingReference(booking.reference)}"""
new = """          <Bookings
            bookings={bookings}
            roomTypes={hotelMasters.roomTypes}
            booking={activeBooking}
            onCreate={async (booking) => {
              await store.run({ type: 'bookingCreate', value: booking });
              setBookingReference(booking.reference);
            }}
            onSelect={(booking) => setBookingReference(booking.reference)}"""
if old not in s:
    raise SystemExit('Bookings render marker not found')
s = s.replace(old, new, 1)
old = """            <HotelSettingsMenu onOpenTransportSetup={() => setView('setup')} />
          </div>
        ) : view === 'setup' ? ("""
new = """            <HotelSettingsMenu
              onOpenLocation={() => setView('location')}
              onOpenRoomType={() => setView('roomtype')}
              onOpenRoom={() => setView('room')}
              onOpenTransportSetup={() => setView('setup')}
            />
          </div>
        ) : ['location', 'roomtype', 'room'].includes(view) ? (
          <div className="settings-scroll hotel-master-scroll" key={view}>
            <HotelMasterFiles
              kind={view === 'location' ? 'location' : view === 'roomtype' ? 'roomType' : 'room'}
              masters={hotelMasters}
              onSaveLocation={async (value) => {
                await store.run({ type: 'hotelLocationSave', value });
              }}
              onSaveRoomType={async (value) => {
                await store.run({ type: 'hotelRoomTypeSave', value });
              }}
              onSaveRoom={async (value) => {
                await store.run({ type: 'hotelRoomSave', value });
              }}
              onBack={() => setView('hotelsettings')}
              onNotice={setNotice}
            />
          </div>
        ) : view === 'setup' ? ("""
if old not in s:
    raise SystemExit('Hotel Settings render marker not found')
s = s.replace(old, new, 1)
p.write_text(s)

# Normalized database tables.
p = Path('worker/normalized-storage.ts')
s = p.read_text()
marker = "  `CREATE INDEX IF NOT EXISTS hotelx_transport_trips_date_idx"
if s.count(marker) != 1:
    raise SystemExit('schema index marker not found')
tables = r"""  `CREATE TABLE IF NOT EXISTS public.hotelx_location_master (
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
  `CREATE INDEX IF NOT EXISTS hotelx_room_master_type_idx
    ON public.hotelx_room_master(property_id, room_type_code, location_code)`,
  `CREATE INDEX IF NOT EXISTS hotelx_bookings_dates_idx
    ON public.hotelx_bookings(property_id, arrival_date, departure_date)`,
"""
s = s.replace(marker, tables + marker, 1)

begin = """  BEGIN
    DELETE FROM public.hotelx_transport_trip_groups WHERE property_id = p_property_id;"""
replacement = """  BEGIN
    DELETE FROM public.hotelx_booking_rooms WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_bookings WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_room_master WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_room_type_master WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_location_master WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_trip_groups WHERE property_id = p_property_id;"""
if s.count(begin) != 1:
    raise SystemExit('replace rows begin marker not found')
s = s.replace(begin, replacement, 1)

insert_marker = """    INSERT INTO public.hotelx_transport_rules (
      property_id, start_time, end_time, turnaround_minutes,"""
if s.count(insert_marker) != 1:
    raise SystemExit('transport rules insert marker not found')
master_insert = r"""    INSERT INTO public.hotelx_location_master (
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
      assigned_rooms, checked_in_guests, guests, amount, highlight_dates
    )
    SELECT p_property_id, item.value->>'reference', item.ordinality::integer,
      item.value->>'guest', item.value->>'arrival', item.value->>'departure',
      COALESCE(item.value->>'status', 'Booked'),
      COALESCE(NULLIF(item.value->>'assignedRooms', ''), '0')::integer,
      COALESCE(NULLIF(item.value->>'checkedInGuests', ''), '0')::integer,
      COALESCE(NULLIF(item.value->>'guests', ''), '1')::integer,
      COALESCE(NULLIF(item.value->>'amount', ''), '0')::numeric,
      COALESCE((item.value->>'highlightDates')::boolean, false)
    FROM jsonb_array_elements(COALESCE(p_state->'bookings', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_booking_rooms (
      property_id, booking_reference, room_type_code, sort_order, room_count
    )
    SELECT p_property_id, booking.value->>'reference', room.value->>'code',
      room.ordinality::integer, COALESCE(NULLIF(room.value->>'count', ''), '1')::integer
    FROM jsonb_array_elements(COALESCE(p_state->'bookings', '[]'::jsonb)) AS booking(value)
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(booking.value->'rooms', '[]'::jsonb))
      WITH ORDINALITY AS room(value, ordinality);

"""
s = s.replace(insert_marker, master_insert + insert_marker, 1)

read_marker = """    jsonb_build_object(
      'setup', jsonb_build_object("""
if s.count(read_marker) != 1:
    raise SystemExit('read json marker not found')
master_read = r"""    jsonb_build_object(
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
            SELECT jsonb_agg(jsonb_build_object('code', br.room_type_code, 'count', br.room_count) ORDER BY br.sort_order)
            FROM public.hotelx_booking_rooms AS br
            WHERE br.property_id = booking.property_id AND br.booking_reference = booking.reference
          ), '[]'::jsonb),
          'assignedRooms', booking.assigned_rooms,
          'checkedInGuests', booking.checked_in_guests,
          'guests', booking.guests,
          'amount', booking.amount::double precision,
          'highlightDates', booking.highlight_dates
        ) ORDER BY booking.sort_order)
        FROM public.hotelx_bookings AS booking
        WHERE booking.property_id = meta.id
      ), '[]'::jsonb),
      'setup', jsonb_build_object("""
s = s.replace(read_marker, master_read, 1)

old = """      const current = await read(connection, id);
      if (current) return current;"""
new = """      const current = await read(connection, id);
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
        if (!hasMasters || !hasBookings) {
          const merged: TransportState = {
            ...seed,
            ...raw,
            hotelMasters: hasMasters ? raw.hotelMasters! : seed.hotelMasters,
            bookings: hasBookings ? raw.bookings! : seed.bookings,
          } as TransportState;
          const upgraded = await query(connection, saveSql, [id, current[0], JSON.stringify(merged)]);
          const revision = Number(upgraded[0]?.[0]);
          if (Number.isSafeInteger(revision) && revision >= 1)
            return [String(revision), JSON.stringify(merged)];
        }
        return current;
      }"""
if s.count(old) != 1:
    raise SystemExit('readOrInitialize current marker not found')
s = s.replace(old, new, 1)
p.write_text(s)

# Worker diagnostics.
p = Path('worker/index.ts')
s = p.read_text()
s = s.replace('apiVersion: 3,', 'apiVersion: 4,', 1)
s = s.replace('diagnosticsVersion: 3,', 'diagnosticsVersion: 4,', 1)
s = s.replace('storageSchemaVersion: 2,', 'storageSchemaVersion: 2,\n            hotelMasterSchemaVersion: 1,', 1)
p.write_text(s)

p = Path('scripts/test-transport-worker.mjs')
s = p.read_text().replace("assert.equal((await call('/health')).data.apiVersion, 3);", "assert.equal((await call('/health')).data.apiVersion, 4);")
s = s.replace("assert.equal(health.data.diagnosticsVersion, 3);", "assert.equal(health.data.diagnosticsVersion, 4);")
s = s.replace("assert.equal((await call('/health')).data.storageSchemaVersion, 2);", "assert.equal((await call('/health')).data.storageSchemaVersion, 2);\nassert.equal((await call('/health')).data.hotelMasterSchemaVersion, 1);")
p.write_text(s)

# Styling.
p = Path('app/globals.css')
s = p.read_text()
if '/* HotelX Location, Room Type and Room master files */' not in s:
    s += r'''

/* HotelX Location, Room Type and Room master files */
.hotel-master-scroll { overflow:auto; padding:10px 8px 90px; }
.master-page { width:100%; min-height:100%; }
.master-list-head { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 20px; border:1px solid #e5e5e7; border-radius:8px 8px 0 0; background:#fff; }
.master-list-head h1 { margin:0; font-size:20px; color:#222; }
.master-list-head p { margin:4px 0 0; color:#747984; font-size:13px; }
.master-list { border:1px solid #e5e5e7; border-top:0; border-radius:0 0 8px 8px; background:#fff; overflow:auto; max-height:calc(100vh - 315px); }
.master-list-row { width:100%; min-height:54px; display:grid; align-items:center; gap:12px; padding:8px 16px; border:0; border-bottom:1px solid #ececef; background:#fff; color:#4f5969; text-align:left; font-size:13px; }
.master-list-row:hover:not(.master-list-header) { background:#fff9f1; }
.master-list-row strong { color:#303640; }
.master-list-header { position:sticky; top:0; z-index:2; min-height:40px; background:#f7f7f8; color:#747984; font-weight:650; }
.location-row { grid-template-columns:100px minmax(180px,1.5fr) minmax(180px,1fr) 100px 22px; }
.roomtype-row { grid-template-columns:90px minmax(220px,1.7fr) 100px 100px 110px 22px; }
.room-row { grid-template-columns:90px 100px minmax(180px,1.4fr) 100px 90px 100px 22px; min-width:850px; }
.master-status { display:inline-flex; width:max-content; padding:4px 9px; border-radius:5px; background:#f1f1f2; color:#777; }
.master-status.active { background:#e5f6ee; color:#19845a; }
.master-page-back { margin-top:12px; }
.master-detail-toolbar { min-height:48px; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; padding:0 10px; border-bottom:1px solid #e5e5e6; }
.master-detail-toolbar > strong { font-size:13px; color:#555; }
.master-back,.master-edit { display:inline-flex; align-items:center; gap:5px; border:0; background:transparent; color:#444; font-weight:600; }
.master-back { justify-self:start; }
.master-edit { justify-self:end; }
.master-detail-card { margin:12px 0 78px; border:1px solid #e4e4e6; border-radius:7px; background:#fff; box-shadow:0 2px 8px #0000000f; overflow:hidden; }
.master-section-label { padding:16px 20px; background:#fff7eb; color:#ef8d00; font-size:18px; font-weight:700; }
.master-form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:30px 18px; padding:28px 22px 36px; }
.master-field { min-width:0; display:flex; flex-direction:column; gap:6px; color:#858a94; font-size:14px; }
.master-field-wide { grid-column:1 / -1; }
.master-field input,.master-field select { width:100%; min-height:38px; padding:4px 0; border:0; border-bottom:1px solid #aaa; outline:0; background:transparent; color:#111; font:inherit; font-size:18px; }
.master-field input[readonly] { color:#8a8f98; }
.master-field select { appearance:auto; }
.master-subtitle { padding-top:10px; padding-bottom:4px; border-bottom:1px solid #aaa; color:#878c94; font-size:20px; }
.master-upload { display:flex; align-items:center; justify-content:space-between; gap:14px; min-height:64px; padding:8px 2px 12px; border-bottom:1px solid #aaa; color:#777; }
.master-upload > div { display:flex; flex-direction:column; gap:4px; }
.master-upload strong { font-size:14px; font-weight:500; }
.master-upload small { color:#9a9da4; }
.master-upload-button { width:42px; height:42px; display:grid; place-items:center; cursor:pointer; }
.master-upload-button input { display:none; }
.master-attachment { width:max-content; max-width:260px; display:flex; align-items:center; gap:10px; padding:10px; border:1px solid #ddd; border-radius:5px; color:#777; }
.master-save-bar { position:sticky; bottom:0; z-index:5; display:flex; justify-content:center; padding:12px; border-top:1px solid #e4e4e6; background:#fff; box-shadow:0 -3px 10px #00000010; }
.master-save-bar .primary-button { min-width:160px; justify-content:center; }
.master-save-bar .primary-button:disabled { background:#ddd; color:#999; }
.booking-create-dialog { width:min(560px,calc(100vw - 24px)) !important; max-width:560px !important; }
.booking-create-dialog .dialog-form { display:flex; flex-direction:column; gap:14px; }
.booking-create-dialog .dialog-form > label,.booking-create-dialog .two-col > label { display:flex; flex-direction:column; gap:6px; color:#60666f; font-size:13px; }
.booking-create-dialog input { min-height:38px; padding:7px 9px; border:1px solid #dedee2; border-radius:6px; background:#fff; color:#222; }
.booking-create-dialog .two-col { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
@media (max-width:760px) {
  .master-form-grid { grid-template-columns:1fr; padding:20px 14px 30px; gap:20px; }
  .master-field-wide { grid-column:auto; }
  .location-row { grid-template-columns:70px 1fr 22px; }
  .location-row > :nth-child(3),.location-row > :nth-child(4) { display:none; }
  .roomtype-row { grid-template-columns:70px 1fr 70px 22px; }
  .roomtype-row > :nth-child(4),.roomtype-row > :nth-child(5) { display:none; }
  .booking-create-dialog .two-col { grid-template-columns:1fr; }
}
'''
p.write_text(s)
