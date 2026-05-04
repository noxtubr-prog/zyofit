-- 1) Block tailors from editing privileged fields on their own tailor_profiles row
CREATE OR REPLACE FUNCTION public.protect_tailor_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    RAISE EXCEPTION 'Only admins can change is_approved';
  END IF;
  IF NEW.store_status IS DISTINCT FROM OLD.store_status THEN
    RAISE EXCEPTION 'Only admins can change store_status';
  END IF;
  IF NEW.rating IS DISTINCT FROM OLD.rating THEN
    RAISE EXCEPTION 'Only admins can change rating';
  END IF;
  IF NEW.review_count IS DISTINCT FROM OLD.review_count THEN
    RAISE EXCEPTION 'Only admins can change review_count';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_tailor_profile_fields_trg ON public.tailor_profiles;
CREATE TRIGGER protect_tailor_profile_fields_trg
BEFORE UPDATE ON public.tailor_profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_tailor_profile_fields();

-- Same protection for the stores table (store_status must be admin-only)
CREATE OR REPLACE FUNCTION public.protect_store_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.store_status IS DISTINCT FROM OLD.store_status THEN
    RAISE EXCEPTION 'Only admins can change store_status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_store_status_trg ON public.stores;
CREATE TRIGGER protect_store_status_trg
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.protect_store_status();

-- 2) Withdrawal requests: validate amount <= available_balance and > 0
CREATE OR REPLACE FUNCTION public.validate_withdrawal_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available numeric;
BEGIN
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be greater than zero';
  END IF;

  SELECT available_balance INTO v_available
  FROM public.tailor_wallets
  WHERE id = NEW.wallet_id;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF NEW.amount > v_available THEN
    RAISE EXCEPTION 'Requested amount exceeds available balance (₹%)', v_available;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_withdrawal_amount_trg ON public.withdrawal_requests;
CREATE TRIGGER validate_withdrawal_amount_trg
BEFORE INSERT ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_withdrawal_amount();

-- 3) Block self-promotion to admin via user_roles inserts/updates
-- Only the existing handle_new_user trigger and become_tailor RPC (both SECURITY DEFINER)
-- can bypass this when needed; explicit user-initiated inserts of 'admin' are blocked.
CREATE OR REPLACE FUNCTION public.guard_user_roles_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if the caller is already an admin
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Allow service-role / no-auth contexts (signup trigger, edge functions) ONLY for non-admin roles
  IF NEW.role = 'admin'::app_role THEN
    RAISE EXCEPTION 'admin role can only be granted by an existing admin';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_user_roles_admin_trg ON public.user_roles;
CREATE TRIGGER guard_user_roles_admin_trg
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_user_roles_admin();

-- 4) Storage: explicit owner-only UPDATE/DELETE on measurement-files
DROP POLICY IF EXISTS "Owners can update own measurement files" ON storage.objects;
CREATE POLICY "Owners can update own measurement files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'measurement-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'measurement-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Owners can delete own measurement files" ON storage.objects;
CREATE POLICY "Owners can delete own measurement files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'measurement-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);