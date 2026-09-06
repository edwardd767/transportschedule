from pathlib import Path

path = Path('worker/normalized-storage.ts')
text = path.read_text()

old = """const saveSql =
  '/* normalized-save */ SELECT public.hotelx_transport_save($1, $2::integer, $3::jsonb)::text';
"""
new = r"""const bookingExtrasReadSql = `/* normalized-booking-extras-read */
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
const saveSql = `/* normalized-save */
WITH saved AS (
  SELECT public.hotelx_transport_save($1, $2::integer, $3::jsonb) AS revision
),
booking_items AS (
  SELECT item.value
  FROM jsonb_array_elements(COALESCE($3::jsonb->'bookings', '[]'::jsonb)) AS item(value)
),
updated_bookings AS (
  UPDATE public.hotelx_bookings AS booking
  SET group_name = COALESCE(item.value->>'groupName', ''),
      phone = COALESCE(item.value->>'phone', ''),
      account_name = COALESCE(item.value->>'accountName', ''),
      credit_limit = COALESCE(NULLIF(item.value->>'creditLimit', ''), '0')::numeric,
      print_rate = COALESCE((item.value->>'printRate')::boolean, true),
      state_tax = COALESCE((item.value->>'stateTax')::boolean, true),
      tourism_tax = COALESCE((item.value->>'tourismTax')::boolean, true),
      email = COALESCE(item.value->>'email', ''),
      sales_channel = COALESCE(item.value->>'salesChannel', 'Direct'),
      source = COALESCE(item.value->>'source', 'Booking'),
      segment = COALESCE(item.value->>'segment', 'Leisure'),
      reference_no = COALESCE(item.value->>'referenceNo', '')
  FROM booking_items AS item, saved
  WHERE saved.revision IS NOT NULL
    AND booking.property_id = $1
    AND booking.reference = item.value->>'reference'
  RETURNING booking.reference
),
room_items AS (
  SELECT booking.value->>'reference' AS booking_reference, room.value
  FROM jsonb_array_elements(COALESCE($3::jsonb->'bookings', '[]'::jsonb)) AS booking(value)
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(booking.value->'rooms', '[]'::jsonb)) AS room(value)
),
updated_rooms AS (
  UPDATE public.hotelx_booking_rooms AS booking_room
  SET adults = COALESCE(NULLIF(item.value->>'adults', ''), '1')::integer,
      children = COALESCE(NULLIF(item.value->>'children', ''), '0')::integer,
      infants = COALESCE(NULLIF(item.value->>'infants', ''), '0')::integer,
      rate_code = COALESCE(item.value->>'rateCode', 'BAR'),
      room_rate = COALESCE(NULLIF(item.value->>'roomRate', ''), '0')::numeric,
      promo_code = COALESCE(item.value->>'promoCode', ''),
      discount_per_night = COALESCE(NULLIF(item.value->>'discountPerNight', ''), '0')::numeric,
      subtotal = COALESCE(NULLIF(item.value->>'subtotal', ''), '0')::numeric,
      discount = COALESCE(NULLIF(item.value->>'discount', ''), '0')::numeric,
      tax = COALESCE(NULLIF(item.value->>'tax', ''), '0')::numeric,
      total = COALESCE(NULLIF(item.value->>'total', ''), '0')::numeric
  FROM room_items AS item, saved
  WHERE saved.revision IS NOT NULL
    AND booking_room.property_id = $1
    AND booking_room.booking_reference = item.booking_reference
    AND booking_room.room_type_code = item.value->>'code'
  RETURNING booking_room.room_type_code
)
SELECT revision::text FROM saved`;
"""
if old not in text:
    raise SystemExit('saveSql marker not found')
text = text.replace(old, new, 1)

old = """        for (const sql of schemaStatements) await query(connection, sql, []);
"""
new = """        for (const sql of schemaStatements) {
          // These two large functions are maintained by the existing Neon schema.
          // Re-sending them on every Worker cold start can fail after incremental
          // booking schema upgrades and make the private link appear unavailable.
          if (
            sql.startsWith('CREATE OR REPLACE FUNCTION public.hotelx_transport_replace_rows') ||
            sql.startsWith('CREATE OR REPLACE FUNCTION public.hotelx_transport_read')
          )
            continue;
          await query(connection, sql, []);
        }
"""
if old not in text:
    raise SystemExit('ensure loop marker not found')
text = text.replace(old, new, 1)

old = """  const read = async (connection: string, id: string) => {
    await ensure(connection);
    const rows = await query(connection, readSql, [id]);
    return rows[0] ?? null;
  };
"""
new = """  const read = async (connection: string, id: string) => {
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
"""
if old not in text:
    raise SystemExit('read marker not found')
text = text.replace(old, new, 1)
path.write_text(text)

# Worker mock: the new enrichment query returns no extra rows because the mock
# already stores the full JSON state directly.
test = Path('scripts/test-transport-worker.mjs')
t = test.read_text()
marker = """  if (sql.includes('/* normalized-read */')) {
"""
replacement = """  if (sql.includes('/* normalized-booking-extras-read */')) return [];
  if (sql.includes('/* normalized-read */')) {
"""
if marker not in t:
    raise SystemExit('worker test read marker not found')
t = t.replace(marker, replacement, 1)
test.write_text(t)
