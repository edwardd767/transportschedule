from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str):
    p = Path(path)
    s = p.read_text()
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match in {path}, found {count}')
    p.write_text(s.replace(old, new, 1))

# Booking domain: retain guests as the calculated total for backward compatibility,
# while saving Adult / Child / Infant separately.
replace_once(
    'lib/bookings.ts',
    "  checkedInGuests: number;\n  guests: number;\n  amount: number;",
    "  checkedInGuests: number;\n  adults?: number;\n  children?: number;\n  infants?: number;\n  guests: number;\n  amount: number;",
    'booking occupancy fields',
)

# Booking creation form and submitted values.
replace_once(
    'components/bookings.tsx',
    "    const roomCountValue = Number(form.get('roomCount'));\n    const guests = Number(form.get('guests'));\n    const amount = Number(form.get('amount'));",
    "    const roomCountValue = Number(form.get('roomCount'));\n    const adults = Number(form.get('adults'));\n    const children = Number(form.get('children'));\n    const infants = Number(form.get('infants'));\n    const guests = adults + children + infants;\n    const amount = Number(form.get('amount'));",
    'booking form values',
)
replace_once(
    'components/bookings.tsx',
    "        checkedInGuests: 0,\n        guests,\n        amount,",
    "        checkedInGuests: 0,\n        adults,\n        children,\n        infants,\n        guests,\n        amount,",
    'booking created occupancy',
)
replace_once(
    'components/bookings.tsx',
    "            <div className=\"two-col\">\n              <label>No. of rooms<input type=\"number\" name=\"roomCount\" min=\"1\" defaultValue=\"1\" required /></label>\n              <label>No. of guests<input type=\"number\" name=\"guests\" min=\"1\" defaultValue=\"1\" required /></label>\n            </div>\n            <label>Booking amount (RM)<input type=\"number\" name=\"amount\" min=\"0\" step=\"0.01\" defaultValue=\"0\" required /></label>",
    "            <label>No. of rooms<input type=\"number\" name=\"roomCount\" min=\"1\" defaultValue=\"1\" required /></label>\n            <div\n              className=\"booking-guest-counts\"\n              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}\n            >\n              <label>No. of Adult<input type=\"number\" name=\"adults\" min=\"1\" defaultValue=\"1\" required /></label>\n              <label>No. of Child<input type=\"number\" name=\"children\" min=\"0\" defaultValue=\"0\" required /></label>\n              <label>No. of Infant<input type=\"number\" name=\"infants\" min=\"0\" defaultValue=\"0\" required /></label>\n            </div>\n            <label>Booking amount (RM)<input type=\"number\" name=\"amount\" min=\"0\" step=\"0.01\" defaultValue=\"0\" required /></label>",
    'booking occupancy inputs',
)

# Normalize legacy bookings (which only have guests) to Adult/Child/Infant.
replace_once(
    'lib/transport-state.ts',
    "  const bookings =\n    Array.isArray(state.bookings) && state.bookings.length\n      ? state.bookings\n      : structuredClone(initialBookings);",
    "  const bookingSource =\n    Array.isArray(state.bookings) && state.bookings.length\n      ? state.bookings\n      : structuredClone(initialBookings);\n  const bookings = bookingSource.map((booking) => {\n    const adults =\n      Number.isSafeInteger(booking.adults) && Number(booking.adults) >= 1\n        ? Number(booking.adults)\n        : Math.max(1, Number(booking.guests) || 1);\n    const children =\n      Number.isSafeInteger(booking.children) && Number(booking.children) >= 0\n        ? Number(booking.children)\n        : 0;\n    const infants =\n      Number.isSafeInteger(booking.infants) && Number(booking.infants) >= 0\n        ? Number(booking.infants)\n        : 0;\n    return {\n      ...booking,\n      adults,\n      children,\n      infants,\n      guests: adults + children + infants,\n    };\n  });",
    'normalize booking occupancy',
)
replace_once(
    'lib/transport-state.ts',
    "      const guests = number(v.guests, 'number of guests', 1, 1000);\n      const guestCapacity = bookingRooms.reduce((total, item) => {",
    "      const adults =\n        typeof v.adults === 'number'\n          ? number(v.adults, 'number of adults', 1, 1000)\n          : number(v.guests, 'number of adults', 1, 1000);\n      const children =\n        typeof v.children === 'number'\n          ? number(v.children, 'number of children', 0, 1000)\n          : 0;\n      const infants =\n        typeof v.infants === 'number'\n          ? number(v.infants, 'number of infants', 0, 1000)\n          : 0;\n      const guests = adults + children + infants;\n      if (guests > 1000) throw new Error('The booking supports up to 1,000 guests.');\n      const guestCapacity = bookingRooms.reduce((total, item) => {",
    'validate booking occupancy',
)
replace_once(
    'lib/transport-state.ts',
    "        checkedInGuests: 0,\n        guests,\n        amount: v.amount,",
    "        checkedInGuests: 0,\n        adults,\n        children,\n        infants,\n        guests,\n        amount: v.amount,",
    'save booking occupancy',
)

# PostgreSQL normalized booking table: add the three columns without deleting existing data.
replace_once(
    'worker/normalized-storage.ts',
    "    checked_in_guests integer NOT NULL DEFAULT 0,\n    guests integer NOT NULL,\n    amount numeric(14,2) NOT NULL DEFAULT 0,",
    "    checked_in_guests integer NOT NULL DEFAULT 0,\n    adult_count integer NOT NULL DEFAULT 1 CHECK (adult_count >= 1),\n    child_count integer NOT NULL DEFAULT 0 CHECK (child_count >= 0),\n    infant_count integer NOT NULL DEFAULT 0 CHECK (infant_count >= 0),\n    guests integer NOT NULL,\n    amount numeric(14,2) NOT NULL DEFAULT 0,",
    'booking table occupancy columns',
)
replace_once(
    'worker/normalized-storage.ts',
    "  `CREATE TABLE IF NOT EXISTS public.hotelx_booking_rooms (",
    "  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS adult_count integer NOT NULL DEFAULT 1`,\n  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS child_count integer NOT NULL DEFAULT 0`,\n  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS infant_count integer NOT NULL DEFAULT 0`,\n  `CREATE TABLE IF NOT EXISTS public.hotelx_booking_rooms (",
    'booking table alter statements',
)
replace_once(
    'worker/normalized-storage.ts',
    "      assigned_rooms, checked_in_guests, guests, amount, highlight_dates\n    )\n    SELECT p_property_id, item.value->>'reference', item.ordinality::integer,",
    "      assigned_rooms, checked_in_guests, adult_count, child_count, infant_count, guests, amount, highlight_dates\n    )\n    SELECT p_property_id, item.value->>'reference', item.ordinality::integer,",
    'booking insert columns',
)
replace_once(
    'worker/normalized-storage.ts',
    "      COALESCE(NULLIF(item.value->>'checkedInGuests', ''), '0')::integer,\n      COALESCE(NULLIF(item.value->>'guests', ''), '1')::integer,\n      COALESCE(NULLIF(item.value->>'amount', ''), '0')::numeric,",
    "      COALESCE(NULLIF(item.value->>'checkedInGuests', ''), '0')::integer,\n      COALESCE(NULLIF(item.value->>'adults', ''), NULLIF(item.value->>'guests', ''), '1')::integer,\n      COALESCE(NULLIF(item.value->>'children', ''), '0')::integer,\n      COALESCE(NULLIF(item.value->>'infants', ''), '0')::integer,\n      COALESCE(NULLIF(item.value->>'guests', ''), '1')::integer,\n      COALESCE(NULLIF(item.value->>'amount', ''), '0')::numeric,",
    'booking insert occupancy values',
)
replace_once(
    'worker/normalized-storage.ts',
    "          'checkedInGuests', booking.checked_in_guests,\n          'guests', booking.guests,\n          'amount', booking.amount::double precision,",
    "          'checkedInGuests', booking.checked_in_guests,\n          'adults', booking.adult_count,\n          'children', booking.child_count,\n          'infants', booking.infant_count,\n          'guests', booking.guests,\n          'amount', booking.amount::double precision,",
    'booking read occupancy values',
)

# Worker diagnostics version for easy Cloudflare verification.
replace_once(
    'worker/index.ts',
    "            apiVersion: 4,\n            diagnosticsVersion: 4,",
    "            apiVersion: 5,\n            diagnosticsVersion: 5,",
    'worker api version',
)
replace_once(
    'worker/index.ts',
    "            hotelMasterSchemaVersion: 1,\n            privateLinkConfigured:",
    "            hotelMasterSchemaVersion: 1,\n            bookingOccupancySchemaVersion: 1,\n            privateLinkConfigured:",
    'worker booking schema version',
)

print('Booking Adult / Child / Infant upgrade applied.')
