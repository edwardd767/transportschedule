CREATE TABLE IF NOT EXISTS public.hotelx_sales_channel (
  property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
  department_id text NOT NULL,
  sales_channel_id text NOT NULL,
  sort_order integer NOT NULL,
  sales_channel_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (property_id, department_id, sales_channel_id),
  FOREIGN KEY (property_id, department_id)
    REFERENCES public.hotelx_department(property_id, department_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS hotelx_sales_channel_department_idx
  ON public.hotelx_sales_channel(property_id, department_id, sort_order);

