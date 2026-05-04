-- Create single source of truth for tailor stores
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  shop_name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image TEXT,
  store_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ensure only allowed statuses are stored
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'stores_store_status_check'
  ) THEN
    ALTER TABLE public.stores
      ADD CONSTRAINT stores_store_status_check
      CHECK (store_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Policies for public browsing and secure management
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stores' AND policyname = 'Public can view approved stores'
  ) THEN
    CREATE POLICY "Public can view approved stores"
    ON public.stores
    FOR SELECT
    TO public
    USING (store_status = 'approved');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stores' AND policyname = 'Tailors can view own store'
  ) THEN
    CREATE POLICY "Tailors can view own store"
    ON public.stores
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stores' AND policyname = 'Tailors can insert own store'
  ) THEN
    CREATE POLICY "Tailors can insert own store"
    ON public.stores
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'tailor'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stores' AND policyname = 'Tailors can update own store'
  ) THEN
    CREATE POLICY "Tailors can update own store"
    ON public.stores
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stores' AND policyname = 'Admins can view all stores'
  ) THEN
    CREATE POLICY "Admins can view all stores"
    ON public.stores
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stores' AND policyname = 'Admins can update stores'
  ) THEN
    CREATE POLICY "Admins can update stores"
    ON public.stores
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Backfill from the legacy table into the unified stores table
INSERT INTO public.stores (id, user_id, shop_name, location, description, image, store_status, created_at)
SELECT
  tp.id,
  tp.user_id,
  tp.shop_name,
  COALESCE(tp.location, ''),
  COALESCE(tp.description, ''),
  tp.image_url,
  COALESCE(NULLIF(tp.store_status, ''), CASE WHEN tp.is_approved THEN 'approved' ELSE 'pending' END),
  tp.created_at
FROM public.tailor_profiles tp
ON CONFLICT (id) DO UPDATE
SET
  user_id = EXCLUDED.user_id,
  shop_name = EXCLUDED.shop_name,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  image = EXCLUDED.image,
  store_status = EXCLUDED.store_status,
  created_at = EXCLUDED.created_at;

-- Keep one-to-one shape by syncing duplicate user ids to latest row
WITH ranked AS (
  SELECT id, user_id,
         row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.stores
)
DELETE FROM public.stores s
USING ranked r
WHERE s.id = r.id AND r.rn > 1;