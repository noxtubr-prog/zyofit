
-- Make tailor_profile_id nullable on orders for demo/mock data compatibility
ALTER TABLE public.orders ALTER COLUMN tailor_profile_id DROP NOT NULL;

-- Add tailor_name to orders for display without requiring FK
ALTER TABLE public.orders ADD COLUMN tailor_name TEXT;

-- Allow anonymous users to browse services (public storefront)
DROP POLICY IF EXISTS "Anyone can view services of approved tailors" ON public.services;
CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING (is_active = true);
