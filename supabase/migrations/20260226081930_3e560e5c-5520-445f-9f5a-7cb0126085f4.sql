
-- Helper function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tailor Wallets
CREATE TABLE public.tailor_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_profile_id UUID NOT NULL REFERENCES public.tailor_profiles(id) ON DELETE CASCADE,
  available_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tailor_profile_id)
);

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.tailor_wallets(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  type TEXT NOT NULL CHECK (type IN ('credit_pending','credit_available','withdrawal','commission','refund')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.tailor_wallets(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid')),
  admin_note TEXT,
  payout_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tailor_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tailors can view own wallet" ON public.tailor_wallets FOR SELECT TO authenticated
USING (tailor_profile_id IN (SELECT id FROM public.tailor_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all wallets" ON public.tailor_wallets FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update wallets" ON public.tailor_wallets FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert wallets" ON public.tailor_wallets FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tailors can view own transactions" ON public.wallet_transactions FOR SELECT TO authenticated
USING (wallet_id IN (SELECT tw.id FROM public.tailor_wallets tw JOIN public.tailor_profiles tp ON tw.tailor_profile_id = tp.id WHERE tp.user_id = auth.uid()));
CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert transactions" ON public.wallet_transactions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tailors can view own withdrawals" ON public.withdrawal_requests FOR SELECT TO authenticated
USING (wallet_id IN (SELECT tw.id FROM public.tailor_wallets tw JOIN public.tailor_profiles tp ON tw.tailor_profile_id = tp.id WHERE tp.user_id = auth.uid()));
CREATE POLICY "Tailors can create withdrawals" ON public.withdrawal_requests FOR INSERT TO authenticated
WITH CHECK (wallet_id IN (SELECT tw.id FROM public.tailor_wallets tw JOIN public.tailor_profiles tp ON tw.tailor_profile_id = tp.id WHERE tp.user_id = auth.uid()));
CREATE POLICY "Admins can view all withdrawals" ON public.withdrawal_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update withdrawals" ON public.withdrawal_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.create_wallet_for_tailor() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tailor_wallets (tailor_profile_id) VALUES (NEW.id) ON CONFLICT (tailor_profile_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_create_wallet_for_tailor AFTER INSERT ON public.tailor_profiles FOR EACH ROW EXECUTE FUNCTION public.create_wallet_for_tailor();

INSERT INTO public.tailor_wallets (tailor_profile_id) SELECT id FROM public.tailor_profiles ON CONFLICT (tailor_profile_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.credit_tailor_wallet(p_order_id UUID, p_tailor_profile_id UUID, p_total_amount NUMERIC, p_commission_rate NUMERIC DEFAULT 0.10) RETURNS void AS $$
DECLARE v_wallet_id UUID; v_commission NUMERIC; v_tailor_amount NUMERIC;
BEGIN
  v_commission := ROUND(p_total_amount * p_commission_rate, 2);
  v_tailor_amount := p_total_amount - v_commission;
  SELECT id INTO v_wallet_id FROM public.tailor_wallets WHERE tailor_profile_id = p_tailor_profile_id;
  IF v_wallet_id IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  UPDATE public.tailor_wallets SET pending_balance = pending_balance + v_tailor_amount, total_earned = total_earned + v_tailor_amount, updated_at = now() WHERE id = v_wallet_id;
  INSERT INTO public.wallet_transactions (wallet_id, order_id, type, amount, description) VALUES (v_wallet_id, p_order_id, 'credit_pending', v_tailor_amount, 'Order payment (after ' || (p_commission_rate * 100)::int || '% commission)');
  INSERT INTO public.wallet_transactions (wallet_id, order_id, type, amount, description) VALUES (v_wallet_id, p_order_id, 'commission', v_commission, 'Platform commission');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.release_pending_to_available(p_order_id UUID) RETURNS void AS $$
DECLARE v_wallet_id UUID; v_pending_amount NUMERIC;
BEGIN
  SELECT wt.wallet_id, wt.amount INTO v_wallet_id, v_pending_amount FROM public.wallet_transactions wt WHERE wt.order_id = p_order_id AND wt.type = 'credit_pending' LIMIT 1;
  IF v_wallet_id IS NULL THEN RETURN; END IF;
  UPDATE public.tailor_wallets SET pending_balance = pending_balance - v_pending_amount, available_balance = available_balance + v_pending_amount, updated_at = now() WHERE id = v_wallet_id;
  INSERT INTO public.wallet_transactions (wallet_id, order_id, type, amount, description) VALUES (v_wallet_id, p_order_id, 'credit_available', v_pending_amount, 'Funds released after delivery');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_tailor_wallets_updated_at BEFORE UPDATE ON public.tailor_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
