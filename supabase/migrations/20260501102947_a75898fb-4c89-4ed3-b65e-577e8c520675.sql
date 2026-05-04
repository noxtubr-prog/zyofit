-- 1) Account status on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('active','suspended'));

-- Prevent users from changing their own account_status. Only admins via RPC.
CREATE OR REPLACE FUNCTION public.protect_profile_account_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_status IS DISTINCT FROM OLD.account_status
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change account_status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_account_status ON public.profiles;
CREATE TRIGGER trg_protect_profile_account_status
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_account_status();

-- 2) Login activity log
CREATE TABLE IF NOT EXISTS public.login_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT,
  event TEXT NOT NULL CHECK (event IN ('login_success','login_failed','logout','password_reset_requested','otp_sent','otp_verified','otp_failed','suspended','reactivated')),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_activity_user ON public.login_activity(user_id, created_at DESC);

ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own activity" ON public.login_activity;
CREATE POLICY "Users view own activity" ON public.login_activity
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins view all activity" ON public.login_activity;
CREATE POLICY "Admins view all activity" ON public.login_activity
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Inserts only via SECURITY DEFINER RPC; no direct insert policy.

CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id UUID,
  p_email TEXT,
  p_event TEXT,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_event NOT IN ('login_success','login_failed','logout','password_reset_requested','otp_sent','otp_verified','otp_failed','suspended','reactivated') THEN
    RAISE EXCEPTION 'Invalid event';
  END IF;
  INSERT INTO public.login_activity (user_id, email, event, ip_address, user_agent, metadata)
  VALUES (COALESCE(p_user_id, auth.uid()), p_email, p_event, p_ip, p_user_agent, p_metadata);
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_user_activity(UUID,TEXT,TEXT,TEXT,TEXT,JSONB) TO authenticated, anon;

-- 3) Phone OTPs (separate from delivery_otps which is order-scoped)
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login','password_reset')),
  attempts INT NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON public.phone_otps(phone, created_at DESC);
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
-- No client policies; only edge functions (service role) read/write.

-- 4) DB-backed auth rate limits (used by edge functions)
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  bucket TEXT NOT NULL,           -- e.g. 'login:email', 'otp_send:phone', 'otp_verify:phone'
  key TEXT NOT NULL,              -- email/phone/IP
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_lookup ON public.auth_rate_limits(bucket, key, attempted_at DESC);
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
-- No client policies; only edge functions write.

-- Helper: count attempts in window + record one
CREATE OR REPLACE FUNCTION public.check_and_record_rate_limit(
  p_bucket TEXT,
  p_key TEXT,
  p_window_seconds INT,
  p_max_attempts INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INT;
BEGIN
  DELETE FROM public.auth_rate_limits
  WHERE attempted_at < now() - INTERVAL '1 day';

  SELECT COUNT(*) INTO v_count FROM public.auth_rate_limits
  WHERE bucket = p_bucket AND key = p_key
    AND attempted_at > now() - (p_window_seconds || ' seconds')::interval;

  IF v_count >= p_max_attempts THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.auth_rate_limits (bucket, key) VALUES (p_bucket, p_key);
  RETURN TRUE;
END;
$$;
-- Restricted: only service role calls this from edge functions.
REVOKE ALL ON FUNCTION public.check_and_record_rate_limit(TEXT,TEXT,INT,INT) FROM PUBLIC, anon, authenticated;

-- 5) Admin RPC: suspend / reactivate
CREATE OR REPLACE FUNCTION public.admin_set_account_status(
  p_user_id UUID,
  p_status TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admins only';
  END IF;
  IF p_status NOT IN ('active','suspended') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE public.profiles SET account_status = p_status, updated_at = now() WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  INSERT INTO public.login_activity (user_id, event, metadata)
  VALUES (p_user_id, CASE WHEN p_status = 'suspended' THEN 'suspended' ELSE 'reactivated' END,
          jsonb_build_object('by_admin', auth.uid()));
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(UUID,TEXT) TO authenticated;