-- Add store_id linkage to services for direct store-based queries
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS store_id uuid;

-- Backfill store_id by mapping tailor_profile.user_id -> stores.user_id
UPDATE public.services s
SET store_id = st.id
FROM public.tailor_profiles tp
JOIN public.stores st ON st.user_id = tp.user_id
WHERE s.tailor_profile_id = tp.id
  AND s.store_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_services_store_id ON public.services(store_id);

-- RLS: allow public to view active services of approved stores via store_id
DROP POLICY IF EXISTS "Public can view services of approved stores" ON public.services;
CREATE POLICY "Public can view services of approved stores"
ON public.services
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND store_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = services.store_id AND s.store_status = 'approved'
  )
);