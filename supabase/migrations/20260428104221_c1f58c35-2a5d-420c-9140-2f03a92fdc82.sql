-- ============================================================
-- 1. Bank details table (tailor payout info)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tailor_bank_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_profile_id UUID NOT NULL UNIQUE,
  account_holder_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tailor_bank_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tailors can view own bank details"
  ON public.tailor_bank_details FOR SELECT
  TO authenticated
  USING (tailor_profile_id IN (
    SELECT id FROM public.tailor_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Tailors can insert own bank details"
  ON public.tailor_bank_details FOR INSERT
  TO authenticated
  WITH CHECK (tailor_profile_id IN (
    SELECT id FROM public.tailor_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Tailors can update own bank details"
  ON public.tailor_bank_details FOR UPDATE
  TO authenticated
  USING (tailor_profile_id IN (
    SELECT id FROM public.tailor_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (tailor_profile_id IN (
    SELECT id FROM public.tailor_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all bank details"
  ON public.tailor_bank_details FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_tailor_bank_details_updated_at
  BEFORE UPDATE ON public.tailor_bank_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 2. Auto-credit wallet (pending) when order is created
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_order_created_credit_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tailor_profile_id IS NOT NULL AND NEW.total_amount > 0 THEN
    PERFORM public.credit_tailor_wallet(
      NEW.id,
      NEW.tailor_profile_id,
      NEW.total_amount,
      0.10
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block order creation if wallet credit fails; just log
  RAISE WARNING 'credit_tailor_wallet failed for order %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_credit_wallet ON public.orders;
CREATE TRIGGER trg_orders_credit_wallet
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.on_order_created_credit_wallet();

-- ============================================================
-- 3. Auto-release pending->available on delivery
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_order_delivered_release()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    PERFORM public.release_pending_to_available(NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'release_pending_to_available failed for order %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_release_on_delivered ON public.orders;
CREATE TRIGGER trg_orders_release_on_delivered
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.on_order_delivered_release();

-- ============================================================
-- 4. Secure withdrawal request: deduct from available immediately
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_wallet_id UUID,
  p_amount NUMERIC
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_owner UUID;
  v_available NUMERIC;
  v_pending_exists BOOLEAN;
  v_request_id UUID;
  v_has_bank BOOLEAN;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount < 500 THEN RAISE EXCEPTION 'Minimum withdrawal is ₹500'; END IF;

  SELECT tp.user_id, tw.available_balance
    INTO v_owner, v_available
  FROM public.tailor_wallets tw
  JOIN public.tailor_profiles tp ON tp.id = tw.tailor_profile_id
  WHERE tw.id = p_wallet_id
  FOR UPDATE;

  IF v_owner IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF v_owner <> v_user THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_amount > v_available THEN RAISE EXCEPTION 'Amount exceeds available balance (₹%)', v_available; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.tailor_bank_details tbd
    JOIN public.tailor_profiles tp ON tp.id = tbd.tailor_profile_id
    WHERE tp.user_id = v_user
  ) INTO v_has_bank;
  IF NOT v_has_bank THEN RAISE EXCEPTION 'Please save your bank details before withdrawing'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.withdrawal_requests
    WHERE wallet_id = p_wallet_id AND status IN ('pending','approved')
  ) INTO v_pending_exists;
  IF v_pending_exists THEN RAISE EXCEPTION 'You already have a withdrawal in progress'; END IF;

  -- Reserve funds now
  UPDATE public.tailor_wallets
    SET available_balance = available_balance - p_amount,
        updated_at = now()
    WHERE id = p_wallet_id;

  INSERT INTO public.withdrawal_requests (wallet_id, amount, status)
  VALUES (p_wallet_id, p_amount, 'pending')
  RETURNING id INTO v_request_id;

  INSERT INTO public.wallet_transactions (wallet_id, order_id, type, amount, description)
  VALUES (p_wallet_id, NULL, 'withdrawal_requested', p_amount,
          'Withdrawal request submitted (reserved from available)');

  RETURN v_request_id;
END;
$$;

-- ============================================================
-- 5. Admin: approve a withdrawal (keep funds reserved, status=approved)
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  p_request_id UUID,
  p_note TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can approve withdrawals';
  END IF;

  UPDATE public.withdrawal_requests
    SET status = 'approved',
        admin_note = COALESCE(p_note, admin_note),
        updated_at = now()
    WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or not pending'; END IF;
END;
$$;

-- ============================================================
-- 6. Admin: reject a withdrawal (refund available)
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_withdrawal(
  p_request_id UUID,
  p_note TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet UUID;
  v_amount NUMERIC;
  v_status TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can reject withdrawals';
  END IF;

  SELECT wallet_id, amount, status INTO v_wallet, v_amount, v_status
  FROM public.withdrawal_requests WHERE id = p_request_id FOR UPDATE;

  IF v_wallet IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'Cannot reject (current status: %)', v_status; END IF;

  UPDATE public.tailor_wallets
    SET available_balance = available_balance + v_amount, updated_at = now()
    WHERE id = v_wallet;

  UPDATE public.withdrawal_requests
    SET status = 'rejected',
        admin_note = COALESCE(p_note, admin_note),
        updated_at = now()
    WHERE id = p_request_id;

  INSERT INTO public.wallet_transactions (wallet_id, order_id, type, amount, description)
  VALUES (v_wallet, NULL, 'withdrawal_refunded', v_amount,
          'Withdrawal rejected — refunded to available');
END;
$$;

-- ============================================================
-- 7. Admin: mark approved withdrawal as paid
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_withdrawal_paid(
  p_request_id UUID,
  p_payout_reference TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet UUID;
  v_amount NUMERIC;
  v_status TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can mark withdrawals paid';
  END IF;

  SELECT wallet_id, amount, status INTO v_wallet, v_amount, v_status
  FROM public.withdrawal_requests WHERE id = p_request_id FOR UPDATE;

  IF v_wallet IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_status <> 'approved' THEN RAISE EXCEPTION 'Only approved requests can be marked paid'; END IF;

  UPDATE public.tailor_wallets
    SET total_withdrawn = total_withdrawn + v_amount, updated_at = now()
    WHERE id = v_wallet;

  UPDATE public.withdrawal_requests
    SET status = 'paid',
        payout_reference = COALESCE(p_payout_reference, payout_reference),
        updated_at = now()
    WHERE id = p_request_id;

  INSERT INTO public.wallet_transactions (wallet_id, order_id, type, amount, description)
  VALUES (v_wallet, NULL, 'withdrawal', v_amount,
          'Withdrawal paid out' || COALESCE(' (ref: ' || p_payout_reference || ')', ''));
END;
$$;

-- ============================================================
-- 8. Enable realtime
-- ============================================================
ALTER TABLE public.tailor_wallets REPLICA IDENTITY FULL;
ALTER TABLE public.wallet_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.withdrawal_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tailor_wallets; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;