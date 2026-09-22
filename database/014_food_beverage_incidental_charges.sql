-- Create incidental charges under the Food and Beverages department from the
-- existing Rate Elements, so the Rate Element dropdown can select them.
--
-- Additive and idempotent: nothing existing is updated or deleted, and
-- re-running only inserts the charges that are still missing.
--
-- Run in DBeaver, then reload the app before saving anything.

-- 1. Preview what will be created.
SELECT d.department_name, e.name AS title, e.amount
FROM public.hotelx_department AS d
JOIN public.hotelx_rate_element AS e
  ON e.property_id = d.property_id
WHERE d.department_name ILIKE '%Food and Beverage%'
  AND e.active
  AND NOT EXISTS (
    SELECT 1
    FROM public.hotelx_incidentalcharges AS c
    WHERE c.property_id = d.property_id
      AND c.department_id = d.department_id
      AND lower(c.title) = lower(e.name)
  )
ORDER BY e.name;

-- 2. Create them. tax_scheme is NOT NULL, so 'None' is used as a neutral
--    default - adjust per your tax rules afterwards if needed.
INSERT INTO public.hotelx_incidentalcharges
  (property_id, department_id, charge_id, title, amount, tax_scheme)
SELECT d.property_id, d.department_id, gen_random_uuid()::text, e.name, e.amount, 'None'
FROM public.hotelx_department AS d
JOIN public.hotelx_rate_element AS e
  ON e.property_id = d.property_id
WHERE d.department_name ILIKE '%Food and Beverage%'
  AND e.active
  AND NOT EXISTS (
    SELECT 1
    FROM public.hotelx_incidentalcharges AS c
    WHERE c.property_id = d.property_id
      AND c.department_id = d.department_id
      AND lower(c.title) = lower(e.name)
  );

-- 3. Verify.
SELECT d.department_name, count(c.charge_id) AS charges
FROM public.hotelx_department AS d
LEFT JOIN public.hotelx_incidentalcharges AS c
  ON c.property_id = d.property_id
 AND c.department_id = d.department_id
GROUP BY d.department_name
ORDER BY d.department_name;
