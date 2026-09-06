from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'Missing expected snippet in {path}: {old[:160]!r}')
    text = text.replace(old, new, count)
    p.write_text(text)

# Booking domain: retain edit/contact/rate details while preserving old bookings.
replace(
    'lib/bookings.ts',
    "export type BookingStatus = (typeof bookingStatuses)[number];\nexport type Booking = {\n",
    "export type BookingStatus = (typeof bookingStatuses)[number];\nexport type BookingRoom = {\n  code: string;\n  count: number;\n  adults?: number;\n  children?: number;\n  infants?: number;\n  rateCode?: string;\n  roomRate?: number;\n  promoCode?: string;\n  discountPerNight?: number;\n  subtotal?: number;\n  discount?: number;\n  tax?: number;\n  total?: number;\n};\nexport type Booking = {\n",
)
replace(
    'lib/bookings.ts',
    "  rooms: { code: string; count: number }[];\n  assignedRooms: number;\n",
    "  rooms: BookingRoom[];\n  assignedRooms: number;\n",
)
replace(
    'lib/bookings.ts',
    "  amount: number;\n  highlightDates?: boolean;\n};\n",
    "  amount: number;\n  highlightDates?: boolean;\n  groupName?: string;\n  phone?: string;\n  accountName?: string;\n  creditLimit?: number;\n  printRate?: boolean;\n  stateTax?: boolean;\n  tourismTax?: boolean;\n  email?: string;\n  salesChannel?: string;\n  source?: string;\n  segment?: string;\n  referenceNo?: string;\n};\n",
)

# New booking now retains all fields needed by Edit Booking.
replace(
    'components/booking-create.tsx',
    """    const bookBy = String(form.get('bookBy') ?? '').trim();\n    const guests = roomLines.reduce(\n""",
    """    const bookBy = String(form.get('bookBy') ?? '').trim();\n    const groupName = groupEnabled ? String(form.get('groupName') ?? '').trim() : '';\n    const phone = String(form.get('phone') ?? '').trim();\n    const accountName = String(form.get('accountName') ?? '').trim();\n    const email = String(form.get('email') ?? '').trim();\n    const referenceNo = String(form.get('referenceNo') ?? '').trim();\n    const guests = roomLines.reduce(\n""",
)
replace(
    'components/booking-create.tsx',
    """        rooms: roomLines.map((line) => ({ code: line.code, count: line.count })),\n        assignedRooms: 0,\n        checkedInGuests: 0,\n        guests,\n        amount: bookingTotal,\n""",
    """        rooms: roomLines.map(({ id: _id, ...line }) => line),\n        assignedRooms: 0,\n        checkedInGuests: 0,\n        guests,\n        amount: bookingTotal,\n        groupName,\n        phone,\n        accountName,\n        creditLimit: 0,\n        printRate,\n        stateTax,\n        tourismTax,\n        email,\n        salesChannel,\n        source,\n        segment,\n        referenceNo,\n""",
)

# Booking reducer supports create + update and preserves room-rate/contact metadata.
replace(
    'lib/transport-state.ts',
    "  | { type: 'bookingCreate'; value: Booking }\n  | { type: 'rateSetup'; value: RateSetupData }\n",
    "  | { type: 'bookingCreate'; value: Booking }\n  | { type: 'bookingUpdate'; value: Booking }\n  | { type: 'rateSetup'; value: RateSetupData }\n",
)
replace(
    'lib/transport-state.ts',
    """        const count = number(room.count, 'number of rooms', 1, master.totalRoom || 1);\n        return { code, count };\n      });\n""",
    """        const count = number(room.count, 'number of rooms', 1, master.totalRoom || 1);\n        const finite = (value: unknown, fallback = 0) =>\n          typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;\n        return {\n          code,\n          count,\n          adults: typeof room.adults === 'number' ? number(room.adults, 'number of adults', 1, 1000) : undefined,\n          children: typeof room.children === 'number' ? number(room.children, 'number of children', 0, 1000) : undefined,\n          infants: typeof room.infants === 'number' ? number(room.infants, 'number of infants', 0, 1000) : undefined,\n          rateCode: typeof room.rateCode === 'string' ? room.rateCode.slice(0, 40) : undefined,\n          roomRate: finite(room.roomRate),\n          promoCode: typeof room.promoCode === 'string' ? room.promoCode.slice(0, 40) : undefined,\n          discountPerNight: finite(room.discountPerNight),\n          subtotal: finite(room.subtotal),\n          discount: finite(room.discount),\n          tax: finite(room.tax),\n          total: finite(room.total),\n        };\n      });\n""",
)
replace(
    'lib/transport-state.ts',
    """        guests,\n        amount: v.amount,\n      };\n      return { ...normalized, bookings: [value, ...normalized.bookings] };\n    }\n    case 'rateSetup': {\n""",
    """        guests,\n        amount: v.amount,\n        groupName: typeof v.groupName === 'string' ? v.groupName.slice(0, 160) : '',\n        phone: typeof v.phone === 'string' ? v.phone.slice(0, 80) : '',\n        accountName: typeof v.accountName === 'string' ? v.accountName.slice(0, 160) : '',\n        creditLimit: typeof v.creditLimit === 'number' && Number.isFinite(v.creditLimit) && v.creditLimit >= 0 ? v.creditLimit : 0,\n        printRate: typeof v.printRate === 'boolean' ? v.printRate : true,\n        stateTax: typeof v.stateTax === 'boolean' ? v.stateTax : true,\n        tourismTax: typeof v.tourismTax === 'boolean' ? v.tourismTax : true,\n        email: typeof v.email === 'string' ? v.email.slice(0, 200) : '',\n        salesChannel: typeof v.salesChannel === 'string' ? v.salesChannel.slice(0, 80) : 'Direct',\n        source: typeof v.source === 'string' ? v.source.slice(0, 80) : 'Booking',\n        segment: typeof v.segment === 'string' ? v.segment.slice(0, 80) : 'Leisure',\n        referenceNo: typeof v.referenceNo === 'string' ? v.referenceNo.slice(0, 100) : '',\n      };\n      return { ...normalized, bookings: [value, ...normalized.bookings] };\n    }\n    case 'bookingUpdate': {\n      const normalized = normalizeTransportState(state);\n      const v = object(action.value);\n      const reference = text(v.reference, 'booking reference', true, 30).trim().toUpperCase();\n      const existing = normalized.bookings.find((item) => item.reference === reference);\n      if (!existing) throw new Error('This booking no longer exists.');\n      const arrival = text(v.arrival, 'arrival date', true, 10);\n      const departureDate = text(v.departure, 'departure date', true, 10);\n      if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(arrival) || !/^\\d{4}-\\d{2}-\\d{2}$/.test(departureDate) || departureDate <= arrival)\n        throw new Error('Departure date must be after the arrival date.');\n      const bookingRooms = list(v.rooms, 10).map((entry) => {\n        const room = object(entry);\n        const code = text(room.code, 'room type', true, 20).trim().toUpperCase();\n        const master = normalized.hotelMasters.roomTypes.find((item) => item.code === code && item.active);\n        if (!master) throw new Error(`Room Type ${code} is not active in Hotel Settings.`);\n        const count = number(room.count, 'number of rooms', 1, master.totalRoom || 1);\n        const finite = (value: unknown, fallback = 0) =>\n          typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;\n        const adults = typeof room.adults === 'number' ? number(room.adults, 'number of adults', 1, 1000) : undefined;\n        const children = typeof room.children === 'number' ? number(room.children, 'number of children', 0, 1000) : undefined;\n        const infants = typeof room.infants === 'number' ? number(room.infants, 'number of infants', 0, 1000) : undefined;\n        if ((adults ?? 1) + (children ?? 0) + (infants ?? 0) > master.maxGuest * count)\n          throw new Error(`Maximum guest capacity for ${count} ${code} room(s) is ${master.maxGuest * count}.`);\n        return {\n          code, count, adults, children, infants,\n          rateCode: typeof room.rateCode === 'string' ? room.rateCode.slice(0, 40) : undefined,\n          roomRate: finite(room.roomRate),\n          promoCode: typeof room.promoCode === 'string' ? room.promoCode.slice(0, 40) : undefined,\n          discountPerNight: finite(room.discountPerNight),\n          subtotal: finite(room.subtotal), discount: finite(room.discount), tax: finite(room.tax), total: finite(room.total),\n        };\n      });\n      const guests = number(v.guests, 'number of guests', 1, 1000);\n      const guestCapacity = bookingRooms.reduce((total, item) => {\n        const master = normalized.hotelMasters.roomTypes.find((type) => type.code === item.code)!;\n        return total + master.maxGuest * item.count;\n      }, 0);\n      if (guests > guestCapacity) throw new Error(`Maximum guest capacity for the selected room(s) is ${guestCapacity}.`);\n      if (typeof v.amount !== 'number' || !Number.isFinite(v.amount) || v.amount < 0 || v.amount > 100000000)\n        throw new Error('Enter a valid booking amount.');\n      const value: Booking = {\n        ...existing,\n        reference,\n        guest: text(v.guest, 'guest name', true, 160).trim(),\n        arrival,\n        departure: departureDate,\n        rooms: bookingRooms,\n        guests,\n        amount: v.amount,\n        groupName: typeof v.groupName === 'string' ? v.groupName.slice(0, 160) : '',\n        phone: typeof v.phone === 'string' ? v.phone.slice(0, 80) : '',\n        accountName: typeof v.accountName === 'string' ? v.accountName.slice(0, 160) : '',\n        creditLimit: typeof v.creditLimit === 'number' && Number.isFinite(v.creditLimit) && v.creditLimit >= 0 ? v.creditLimit : 0,\n        printRate: typeof v.printRate === 'boolean' ? v.printRate : true,\n        stateTax: typeof v.stateTax === 'boolean' ? v.stateTax : true,\n        tourismTax: typeof v.tourismTax === 'boolean' ? v.tourismTax : true,\n        email: typeof v.email === 'string' ? v.email.slice(0, 200) : '',\n        salesChannel: typeof v.salesChannel === 'string' ? v.salesChannel.slice(0, 80) : 'Direct',\n        source: typeof v.source === 'string' ? v.source.slice(0, 80) : 'Booking',\n        segment: typeof v.segment === 'string' ? v.segment.slice(0, 80) : 'Leisure',\n        referenceNo: typeof v.referenceNo === 'string' ? v.referenceNo.slice(0, 100) : '',\n      };\n      return { ...normalized, bookings: normalized.bookings.map((item) => item.reference === reference ? value : item) };\n    }\n    case 'rateSetup': {\n""",
)

# Booking details can enter/leave Edit Booking and save changes.
replace(
    'components/bookings.tsx',
    "import { BookingCreate } from '@/components/booking-create';\n",
    "import { BookingCreate } from '@/components/booking-create';\nimport { BookingEdit } from '@/components/booking-edit';\n",
)
replace(
    'components/bookings.tsx',
    """  onCreate,\n  transportSummary,\n}: {\n""",
    """  onCreate,\n  onUpdate,\n  editing,\n  onEditingChange,\n  transportSummary,\n}: {\n""",
)
replace(
    'components/bookings.tsx',
    """  onNotice: (message: string) => void;\n  onCreate: (booking: Booking) => Promise<void>;\n  transportSummary?: string;\n""",
    """  onNotice: (message: string) => void;\n  onCreate: (booking: Booking) => Promise<void>;\n  onUpdate: (booking: Booking) => Promise<void>;\n  editing: boolean;\n  onEditingChange: (editing: boolean) => void;\n  transportSummary?: string;\n""",
)
replace(
    'components/bookings.tsx',
    """    const sections = [\n""",
    """    if (editing) {\n      return (\n        <section className=\"booking-workspace booking-edit-workspace\" aria-label=\"Edit booking\">\n          <h1 className=\"sr-only\" tabIndex={-1} ref={headingRef}>Edit booking {booking.reference} — {booking.guest}</h1>\n          <div className=\"booking-detail-summary booking-edit-summary\">\n            <div className=\"booking-detail-top\">\n              <div className=\"booking-stay\"><strong>{stayDates(booking)}</strong><BookingOccupancy booking={booking} /></div>\n              <strong className=\"booking-amount\">{bookingAmount(booking)}</strong>\n            </div>\n            <div className=\"booking-detail-bottom\"><span>{booking.reference} <span className=\"booking-divider\">|</span> {booking.guest}</span></div>\n          </div>\n          <BookingEdit booking={booking} roomTypes={roomTypes} onCancel={() => onEditingChange(false)} onNotice={onNotice} onUpdate={async (value) => { await onUpdate(value); onEditingChange(false); }} />\n        </section>\n      );\n    }\n    const sections = [\n""",
)
replace(
    'components/bookings.tsx',
    """                section.title === 'Transport'\n                  ? onOpenTransport(booking)\n                  : onNotice(`${section.title} is shown for reference. Editing this booking section is not included yet.`)\n""",
    """                section.title === 'Transport'\n                  ? onOpenTransport(booking)\n                  : section.title === 'Booking Info'\n                    ? onEditingChange(true)\n                    : onNotice(`${section.title} is shown for reference. Editing this booking section is not included yet.`)\n""",
)

# App-level edit state controls breadcrumb/back behavior and persistence action.
replace(
    'app/page.tsx',
    "  const [bookingReference, setBookingReference] = useState<string | null>(null);\n",
    "  const [bookingReference, setBookingReference] = useState<string | null>(null);\n  const [bookingEditing, setBookingEditing] = useState(false);\n",
)
replace(
    'app/page.tsx',
    """                onClick={() => setBookingReference(null)}\n""",
    """                onClick={() => bookingEditing ? setBookingEditing(false) : setBookingReference(null)}\n""",
)
replace(
    'app/page.tsx',
    """              <span>{activeBooking ? '... / Booking' : 'Booking'}</span>\n""",
    """              <span>{activeBooking ? (bookingEditing ? '... / Edit' : '... / Booking') : 'Booking'}</span>\n""",
)
replace(
    'app/page.tsx',
    """            onCreate={async (booking) => {\n              await store.run({ type: 'bookingCreate', value: booking });\n              setBookingReference(booking.reference);\n            }}\n            onSelect={(booking) => setBookingReference(booking.reference)}\n            onNotice={setNotice}\n""",
    """            onCreate={async (booking) => {\n              await store.run({ type: 'bookingCreate', value: booking });\n              setBookingEditing(false);\n              setBookingReference(booking.reference);\n            }}\n            onUpdate={async (booking) => { await store.run({ type: 'bookingUpdate', value: booking }); }}\n            editing={bookingEditing}\n            onEditingChange={setBookingEditing}\n            onSelect={(booking) => { setBookingEditing(false); setBookingReference(booking.reference); }}\n            onNotice={setNotice}\n""",
)

# Persist edit/contact/room-rate columns in normalized storage. Existing DBs are migrated safely.
replace(
    'worker/normalized-storage.ts',
    """  `CREATE TABLE IF NOT EXISTS public.hotelx_season_master (\n""",
    """  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS group_name text NOT NULL DEFAULT ''`,\n  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT ''`,\n  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS account_name text NOT NULL DEFAULT ''`,\n  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS credit_limit numeric(14,2) NOT NULL DEFAULT 0`,\n  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS print_rate boolean NOT NULL DEFAULT true`,\n  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS state_tax boolean NOT NULL DEFAULT true`,\n  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS tourism_tax boolean NOT NULL DEFAULT true`,\n  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT ''`,\n  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS sales_channel text NOT NULL DEFAULT 'Direct'`,\n  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'Booking'`,\n  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS segment text NOT NULL DEFAULT 'Leisure'`,\n  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS reference_no text NOT NULL DEFAULT ''`,\n  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS adults integer NOT NULL DEFAULT 1`,\n  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS children integer NOT NULL DEFAULT 0`,\n  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS infants integer NOT NULL DEFAULT 0`,\n  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS rate_code text NOT NULL DEFAULT 'BAR'`,\n  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS room_rate numeric(14,2) NOT NULL DEFAULT 0`,\n  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS promo_code text NOT NULL DEFAULT ''`,\n  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS discount_per_night numeric(14,2) NOT NULL DEFAULT 0`,\n  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS subtotal numeric(14,2) NOT NULL DEFAULT 0`,\n  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS discount numeric(14,2) NOT NULL DEFAULT 0`,\n  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS tax numeric(14,2) NOT NULL DEFAULT 0`,\n  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS total numeric(14,2) NOT NULL DEFAULT 0`,\n  `CREATE TABLE IF NOT EXISTS public.hotelx_season_master (\n""",
)
replace(
    'worker/normalized-storage.ts',
    """      property_id, reference, sort_order, guest, arrival_date, departure_date, status,\n      assigned_rooms, checked_in_guests, guests, amount, highlight_dates\n    )\n""",
    """      property_id, reference, sort_order, guest, arrival_date, departure_date, status,\n      assigned_rooms, checked_in_guests, guests, amount, highlight_dates,\n      group_name, phone, account_name, credit_limit, print_rate, state_tax, tourism_tax,\n      email, sales_channel, source, segment, reference_no\n    )\n""",
)
replace(
    'worker/normalized-storage.ts',
    """      COALESCE(NULLIF(item.value->>'amount', ''), '0')::numeric,\n      COALESCE((item.value->>'highlightDates')::boolean, false)\n""",
    """      COALESCE(NULLIF(item.value->>'amount', ''), '0')::numeric,\n      COALESCE((item.value->>'highlightDates')::boolean, false),\n      COALESCE(item.value->>'groupName', ''), COALESCE(item.value->>'phone', ''),\n      COALESCE(item.value->>'accountName', ''), COALESCE(NULLIF(item.value->>'creditLimit', ''), '0')::numeric,\n      COALESCE((item.value->>'printRate')::boolean, true), COALESCE((item.value->>'stateTax')::boolean, true),\n      COALESCE((item.value->>'tourismTax')::boolean, true), COALESCE(item.value->>'email', ''),\n      COALESCE(item.value->>'salesChannel', 'Direct'), COALESCE(item.value->>'source', 'Booking'),\n      COALESCE(item.value->>'segment', 'Leisure'), COALESCE(item.value->>'referenceNo', '')\n""",
)
replace(
    'worker/normalized-storage.ts',
    """      property_id, booking_reference, room_type_code, sort_order, room_count\n    )\n    SELECT p_property_id, booking.value->>'reference', room.value->>'code',\n      room.ordinality::integer, COALESCE(NULLIF(room.value->>'count', ''), '1')::integer\n""",
    """      property_id, booking_reference, room_type_code, sort_order, room_count,\n      adults, children, infants, rate_code, room_rate, promo_code, discount_per_night,\n      subtotal, discount, tax, total\n    )\n    SELECT p_property_id, booking.value->>'reference', room.value->>'code',\n      room.ordinality::integer, COALESCE(NULLIF(room.value->>'count', ''), '1')::integer,\n      COALESCE(NULLIF(room.value->>'adults', ''), '1')::integer, COALESCE(NULLIF(room.value->>'children', ''), '0')::integer,\n      COALESCE(NULLIF(room.value->>'infants', ''), '0')::integer, COALESCE(room.value->>'rateCode', 'BAR'),\n      COALESCE(NULLIF(room.value->>'roomRate', ''), '0')::numeric, COALESCE(room.value->>'promoCode', ''),\n      COALESCE(NULLIF(room.value->>'discountPerNight', ''), '0')::numeric, COALESCE(NULLIF(room.value->>'subtotal', ''), '0')::numeric,\n      COALESCE(NULLIF(room.value->>'discount', ''), '0')::numeric, COALESCE(NULLIF(room.value->>'tax', ''), '0')::numeric,\n      COALESCE(NULLIF(room.value->>'total', ''), '0')::numeric\n""",
)
replace(
    'worker/normalized-storage.ts',
    """            SELECT jsonb_agg(jsonb_build_object('code', br.room_type_code, 'count', br.room_count) ORDER BY br.sort_order)\n""",
    """            SELECT jsonb_agg(jsonb_build_object(\n              'code', br.room_type_code, 'count', br.room_count, 'adults', br.adults, 'children', br.children, 'infants', br.infants,\n              'rateCode', br.rate_code, 'roomRate', br.room_rate::double precision, 'promoCode', br.promo_code,\n              'discountPerNight', br.discount_per_night::double precision, 'subtotal', br.subtotal::double precision,\n              'discount', br.discount::double precision, 'tax', br.tax::double precision, 'total', br.total::double precision\n            ) ORDER BY br.sort_order)\n""",
)
replace(
    'worker/normalized-storage.ts',
    """          'amount', booking.amount::double precision,\n          'highlightDates', booking.highlight_dates\n""",
    """          'amount', booking.amount::double precision,\n          'highlightDates', booking.highlight_dates,\n          'groupName', booking.group_name, 'phone', booking.phone, 'accountName', booking.account_name,\n          'creditLimit', booking.credit_limit::double precision, 'printRate', booking.print_rate, 'stateTax', booking.state_tax,\n          'tourismTax', booking.tourism_tax, 'email', booking.email, 'salesChannel', booking.sales_channel,\n          'source', booking.source, 'segment', booking.segment, 'referenceNo', booking.reference_no\n""",
)

# Screen styling: HotelX edit layout + compact/mobile-safe footer.
css = Path('app/globals.css')
text = css.read_text()
marker = '/* HotelX Booking Edit screen */'
if marker not in text:
    text += r'''

/* HotelX Booking Edit screen */
.booking-edit-workspace { min-height:0; }
.booking-edit-summary { flex:0 0 auto; }
.booking-edit-page { flex:1; min-height:0; overflow:hidden; }
.booking-edit-scroll { height:100%; overflow-y:auto; overscroll-behavior:contain; padding:10px 6px 78px; }
.booking-edit-room-section { margin-bottom:8px; }
.booking-edit-room-table { background:#fff; padding:0 12px 8px; }
.booking-edit-room-head,.booking-edit-room-row { display:grid; grid-template-columns:120px 1fr 1fr 1fr 52px 52px; align-items:center; gap:10px; }
.booking-edit-room-head { min-height:34px; border-bottom:1px solid #222; font-size:12px; font-weight:650; color:#5f6268; }
.booking-edit-room-row { min-height:70px; border-bottom:1px solid #ececec; font-size:12px; }
.booking-edit-room-row > span { min-width:0; display:flex; flex-direction:column; gap:4px; }
.booking-edit-room-row small { display:block; color:#6f737a; font-size:10px; }
.booking-edit-room-row > span:first-child small { color:#f28b00; white-space:nowrap; }
.booking-edit-room-row b { color:#171717; }
.booking-edit-room-row button { width:34px; height:34px; display:grid; place-items:center; border:0; background:transparent; color:#333; }
.booking-edit-room-row button:last-child { color:#777; }
.booking-edit-room-total { display:flex; justify-content:space-between; align-items:center; min-height:36px; border-top:1px solid #222; font-size:12px; }
.booking-edit-error { margin:8px 12px; }
.booking-edit-actions { position:sticky; bottom:-78px; z-index:8; margin:12px -6px -78px; padding:9px 18px; display:flex; justify-content:flex-end; gap:14px; border-top:1px solid #ddd; background:#fff; box-shadow:0 -2px 9px #00000012; }
.booking-edit-cancel,.booking-edit-confirm { min-width:128px; min-height:38px; border:0; border-radius:5px; font-size:13px; font-weight:650; }
.booking-edit-cancel { background:#ff9228; color:#fff; }
.booking-edit-confirm { background:#ff9228; color:#fff; }
.booking-edit-confirm:disabled { background:#dedede; color:#aaa; }
@media (max-width:760px) {
  .booking-edit-scroll { padding:7px 3px 74px; }
  .booking-edit-room-table { overflow-x:auto; padding-inline:8px; }
  .booking-edit-room-head,.booking-edit-room-row { min-width:620px; grid-template-columns:112px 110px 135px 105px 42px 42px; }
  .booking-edit-room-row { min-height:64px; }
  .booking-edit-actions { position:fixed; left:6px; right:6px; bottom:calc(6px + env(safe-area-inset-bottom)); margin:0; padding:7px 8px; gap:8px; }
  .booking-edit-cancel,.booking-edit-confirm { flex:1; min-width:0; min-height:40px; }
}
'''
    css.write_text(text)
