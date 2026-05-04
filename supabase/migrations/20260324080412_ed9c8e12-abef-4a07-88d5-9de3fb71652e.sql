
-- Add store_status column to tailor_profiles
ALTER TABLE public.tailor_profiles 
ADD COLUMN IF NOT EXISTS store_status text NOT NULL DEFAULT 'pending';

-- Migrate existing data: approved stores get 'approved', others stay 'pending'
UPDATE public.tailor_profiles SET store_status = 'approved' WHERE is_approved = true;
UPDATE public.tailor_profiles SET store_status = 'pending' WHERE is_approved = false;
