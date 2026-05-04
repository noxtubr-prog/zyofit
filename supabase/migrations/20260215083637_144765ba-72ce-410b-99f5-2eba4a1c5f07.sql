
-- Create measurements table
CREATE TABLE public.measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  chest NUMERIC,
  waist NUMERIC,
  hip NUMERIC,
  length NUMERIC,
  shoulder NUMERIC,
  sleeve_length NUMERIC,
  unit TEXT NOT NULL DEFAULT 'inches' CHECK (unit IN ('inches', 'cm')),
  measurement_file_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can insert own measurements"
  ON public.measurements FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can view own measurements"
  ON public.measurements FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Tailors can view measurements for their orders"
  ON public.measurements FOR SELECT
  USING (order_id IN (
    SELECT id FROM public.orders
    WHERE tailor_profile_id IN (
      SELECT id FROM public.tailor_profiles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Admins can view all measurements"
  ON public.measurements FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add measurement_id to orders
ALTER TABLE public.orders ADD COLUMN measurement_id UUID REFERENCES public.measurements(id);

-- Storage bucket for measurement files
INSERT INTO storage.buckets (id, name, public) VALUES ('measurement-files', 'measurement-files', false);

CREATE POLICY "Users can upload own measurement files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'measurement-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own measurement files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'measurement-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all measurement files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'measurement-files' AND has_role(auth.uid(), 'admin'::app_role));

-- Drop FK constraint on tailor_profiles.user_id so we can seed demo data
ALTER TABLE public.tailor_profiles DROP CONSTRAINT IF EXISTS tailor_profiles_user_id_fkey;
