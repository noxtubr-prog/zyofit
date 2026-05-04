
-- Update handle_new_user to assign role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  selected_role app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Check if role was passed in metadata during signup
  BEGIN
    selected_role := (NEW.raw_user_meta_data->>'role')::app_role;
  EXCEPTION WHEN OTHERS THEN
    selected_role := 'customer'::app_role;
  END;

  IF selected_role IS NULL THEN
    selected_role := 'customer'::app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role);

  RETURN NEW;
END;
$$;

-- Allow unauthenticated users to view approved tailor profiles
CREATE POLICY "Public can view approved tailors"
ON public.tailor_profiles
FOR SELECT
TO anon
USING (is_approved = true);

-- Allow unauthenticated users to view active services
-- (existing policy uses 'public' role which covers both, but let's ensure anon access)
CREATE POLICY "Anon can view active services"
ON public.services
FOR SELECT
TO anon
USING (is_active = true);
