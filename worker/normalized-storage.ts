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
    DELETE FROM public.hotelx_transport_trip_groups WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_booking_legs WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_trips WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_templates WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_day_notes WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_services WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_routes WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_operators WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_rules WHERE property_id = p_property_id;

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
      ready = (async () => {
        for (const sql of schemaStatements) await query(connection, sql, []);
      })().catch((error) => {
        ready = null;
        throw error;
      });
    }
    await ready;
  };

  const read = async (connection: string, id: string) => {
    await ensure(connection);
    const rows = await query(connection, readSql, [id]);
    return rows[0] ?? null;
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
      if (current) return current;

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
