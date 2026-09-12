CREATE TABLE IF NOT EXISTS public.hotelx_reason (
  "propertyId" text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
  "departmentId" uuid NOT NULL,
  "Code" text NOT NULL,
  "Description" text NOT NULL,
  createddate timestamptz NOT NULL DEFAULT now(),
  auditdate timestamptz,
  PRIMARY KEY ("propertyId", "departmentId", "Code"),
  FOREIGN KEY ("propertyId", "departmentId")
    REFERENCES public.hotelx_department(property_id, department_id)
    ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION public.hotelx_reason_set_timestamps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.createddate := OLD.createddate;
  IF NEW."Description" IS DISTINCT FROM OLD."Description" THEN
    NEW.auditdate := now();
  ELSE
    NEW.auditdate := OLD.auditdate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hotelx_reason_timestamps ON public.hotelx_reason;
CREATE TRIGGER trg_hotelx_reason_timestamps
BEFORE UPDATE ON public.hotelx_reason
FOR EACH ROW EXECUTE FUNCTION public.hotelx_reason_set_timestamps();

CREATE OR REPLACE FUNCTION public.hotelx_sync_reasons_from_department()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  item jsonb;
  idx integer;
  v_code text;
  v_description text;
  v_raw text;
  v_obj jsonb;
  v_codes text[] := ARRAY[]::text[];
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  FOR item, idx IN
    SELECT value, ordinality::integer
    FROM jsonb_array_elements(COALESCE(NEW.reasons, '[]'::jsonb)) WITH ORDINALITY
  LOOP
    v_code := NULL;
    v_description := '';

    IF jsonb_typeof(item) = 'object' THEN
      v_code := NULLIF(BTRIM(COALESCE(item->>'code', item->>'Code', item->>'c', '')), '');
      v_description := BTRIM(COALESCE(item->>'description', item->>'Description', item->>'d', ''));
    ELSE
      v_raw := item #>> '{}';
      BEGIN
        v_obj := v_raw::jsonb;
        IF jsonb_typeof(v_obj) = 'object' THEN
          v_code := NULLIF(BTRIM(COALESCE(v_obj->>'code', v_obj->>'Code', v_obj->>'c', '')), '');
          v_description := BTRIM(COALESCE(v_obj->>'description', v_obj->>'Description', v_obj->>'d', ''));
        ELSE
          v_description := BTRIM(v_raw);
        END IF;
      EXCEPTION WHEN others THEN
        v_description := BTRIM(v_raw);
      END;
    END IF;

    IF v_description = '' THEN
      CONTINUE;
    END IF;

    IF v_code IS NULL THEN
      v_code := 'R' || LPAD(idx::text, 3, '0');
    END IF;

    v_codes := array_append(v_codes, v_code);

    INSERT INTO public.hotelx_reason ("propertyId", "departmentId", "Code", "Description")
    VALUES (NEW.property_id, NEW.department_id, v_code, v_description)
    ON CONFLICT ("propertyId", "departmentId", "Code") DO UPDATE
      SET "Description" = EXCLUDED."Description"
      WHERE public.hotelx_reason."Description" IS DISTINCT FROM EXCLUDED."Description";
  END LOOP;

  DELETE FROM public.hotelx_reason
  WHERE "propertyId" = NEW.property_id
    AND "departmentId" = NEW.department_id
    AND NOT ("Code" = ANY(v_codes));

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.hotelx_sync_department_from_reasons()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_property_id text;
  v_department_id uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_property_id := OLD."propertyId";
    v_department_id := OLD."departmentId";
  ELSE
    v_property_id := NEW."propertyId";
    v_department_id := NEW."departmentId";
  END IF;

  UPDATE public.hotelx_department d
  SET reasons = COALESCE((
    SELECT jsonb_agg(
      CASE
        WHEN r.auditdate IS NULL THEN jsonb_build_object('c', r."Code", 'd', r."Description")
        ELSE jsonb_build_object('c', r."Code", 'd', r."Description", 't', to_char(r.auditdate, 'YYYY-MM-DD'))
      END
      ORDER BY r.createddate, r."Code"
    )
    FROM public.hotelx_reason r
    WHERE r."propertyId" = v_property_id
      AND r."departmentId" = v_department_id
  ), '[]'::jsonb)
  WHERE d.property_id = v_property_id
    AND d.department_id = v_department_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_hotelx_department_sync_reasons ON public.hotelx_department;
CREATE TRIGGER trg_hotelx_department_sync_reasons
AFTER INSERT OR UPDATE OF reasons ON public.hotelx_department
FOR EACH ROW EXECUTE FUNCTION public.hotelx_sync_reasons_from_department();

DROP TRIGGER IF EXISTS trg_hotelx_reason_sync_department ON public.hotelx_reason;
CREATE TRIGGER trg_hotelx_reason_sync_department
AFTER INSERT OR DELETE OR UPDATE ON public.hotelx_reason
FOR EACH ROW EXECUTE FUNCTION public.hotelx_sync_department_from_reasons();
