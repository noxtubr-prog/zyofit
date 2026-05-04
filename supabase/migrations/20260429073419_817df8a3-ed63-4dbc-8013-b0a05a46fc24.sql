
-- 1. Extend orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT NOT NULL DEFAULT 'shipping',
  ADD COLUMN IF NOT EXISTS ready_for_shipment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_confirmed_at TIMESTAMPTZ;

-- 2. Shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE,
  courier_name TEXT NOT NULL DEFAULT 'ZyloFit Express',
  tracking_id TEXT NOT NULL,
  tracking_url TEXT,
  shipment_status TEXT NOT NULL DEFAULT 'created',
  estimated_delivery DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own shipments" ON public.shipments
FOR SELECT TO authenticated
USING (order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid()));

CREATE POLICY "Tailors view their shipments" ON public.shipments
FOR SELECT TO authenticated
USING (order_id IN (
  SELECT o.id FROM public.orders o
  JOIN public.tailor_profiles tp ON tp.id = o.tailor_profile_id
  WHERE tp.user_id = auth.uid()
));

CREATE POLICY "Admins manage shipments" ON public.shipments
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER shipments_updated_at
BEFORE UPDATE ON public.shipments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Delivery OTPs table
CREATE TABLE IF NOT EXISTS public.delivery_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'delivery',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_otps_order ON public.delivery_otps(order_id) WHERE used_at IS NULL;

ALTER TABLE public.delivery_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own active OTP" ON public.delivery_otps
FOR SELECT TO authenticated
USING (order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid()));

CREATE POLICY "Tailors view pickup OTPs for their orders" ON public.delivery_otps
FOR SELECT TO authenticated
USING (
  purpose = 'pickup' AND order_id IN (
    SELECT o.id FROM public.orders o
    JOIN public.tailor_profiles tp ON tp.id = o.tailor_profile_id
    WHERE tp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins view all OTPs" ON public.delivery_otps
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Update wallet credit trigger: only credit on 'delivered_confirmed'
CREATE OR REPLACE FUNCTION public.on_order_delivered_release()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- New flow: credit + release happens together when delivery is confirmed via OTP
  IF NEW.status = 'delivered_confirmed' AND (OLD.status IS DISTINCT FROM 'delivered_confirmed') THEN
    -- If wallet wasn't credited yet (new orders), credit now and immediately release
    IF NOT EXISTS (SELECT 1 FROM public.wallet_transactions WHERE order_id = NEW.id AND type = 'credit_pending') THEN
      IF NEW.tailor_profile_id IS NOT NULL AND NEW.total_amount > 0 THEN
        PERFORM public.credit_tailor_wallet(NEW.id, NEW.tailor_profile_id, NEW.total_amount, 0.10);
      END IF;
    END IF;
    PERFORM public.release_pending_to_available(NEW.id);
  END IF;

  -- Backward compat: legacy orders still using plain 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    PERFORM public.release_pending_to_available(NEW.id);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'wallet release failed for order %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 5. Stop crediting wallet on order creation for new escrow flow
-- We disable the on-INSERT credit so money stays in "platform escrow" until delivery confirmation.
DROP TRIGGER IF EXISTS trg_orders_credit_wallet ON public.orders;

-- 6. Tailor: mark ready for shipment
CREATE OR REPLACE FUNCTION public.tailor_mark_ready_for_shipment(p_order_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid(); v_owner UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT tp.user_id INTO v_owner
  FROM public.orders o
  JOIN public.tailor_profiles tp ON tp.id = o.tailor_profile_id
  WHERE o.id = p_order_id;
  IF v_owner IS NULL OR v_owner <> v_user THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE public.orders
    SET status = 'ready_for_shipment',
        ready_for_shipment_at = now(),
        updated_at = now()
    WHERE id = p_order_id AND status IN ('placed','measurements','stitching','ready');
  IF NOT FOUND THEN RAISE EXCEPTION 'Order is not in a stitching state'; END IF;
END;
$$;

-- 7. Admin: create shipment (mock logistics)
CREATE OR REPLACE FUNCTION public.admin_create_shipment(p_order_id UUID, p_courier_name TEXT DEFAULT 'ZyloFit Express')
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_tracking TEXT; v_status TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT status INTO v_status FROM public.orders WHERE id = p_order_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_status NOT IN ('ready_for_shipment','ready') THEN RAISE EXCEPTION 'Order is not ready for shipment (current: %)', v_status; END IF;

  v_tracking := 'ZF' || TO_CHAR(now(),'YYMMDD') || UPPER(SUBSTRING(MD5(p_order_id::text || now()::text) FROM 1 FOR 6));

  INSERT INTO public.shipments (order_id, courier_name, tracking_id, tracking_url, shipment_status, estimated_delivery)
  VALUES (p_order_id, p_courier_name, v_tracking, 'https://track.zylofit.com/' || v_tracking, 'created', (now() + INTERVAL '5 days')::date)
  ON CONFLICT (order_id) DO UPDATE SET courier_name = EXCLUDED.courier_name, updated_at = now()
  RETURNING id INTO v_id;

  UPDATE public.orders SET status = 'shipped', updated_at = now() WHERE id = p_order_id;
  RETURN v_id;
END;
$$;

-- 8. Admin: update shipment status (delivered triggers OTP generation)
CREATE OR REPLACE FUNCTION public.admin_update_shipment_status(p_shipment_id UUID, p_status TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order UUID; v_otp TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF p_status NOT IN ('created','picked_up','in_transit','out_for_delivery','delivered','failed') THEN
    RAISE EXCEPTION 'Invalid shipment status';
  END IF;

  UPDATE public.shipments SET shipment_status = p_status, updated_at = now()
  WHERE id = p_shipment_id RETURNING order_id INTO v_order;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Shipment not found'; END IF;

  IF p_status = 'out_for_delivery' THEN
    UPDATE public.orders SET status = 'out_for_delivery', updated_at = now() WHERE id = v_order;
  ELSIF p_status = 'delivered' THEN
    -- Mark order as awaiting customer OTP confirmation, generate OTP
    UPDATE public.orders SET status = 'awaiting_confirmation', updated_at = now() WHERE id = v_order;
    v_otp := LPAD((FLOOR(RANDOM() * 1000000))::INT::TEXT, 6, '0');
    INSERT INTO public.delivery_otps (order_id, otp_code, purpose) VALUES (v_order, v_otp, 'delivery');
  END IF;
END;
$$;

-- 9. Customer: confirm delivery with OTP
CREATE OR REPLACE FUNCTION public.confirm_delivery_with_otp(p_order_id UUID, p_otp TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid(); v_customer UUID; v_otp_id UUID; v_stored TEXT; v_attempts INT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT customer_id INTO v_customer FROM public.orders WHERE id = p_order_id;
  IF v_customer IS NULL OR v_customer <> v_user THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT id, otp_code, attempts INTO v_otp_id, v_stored, v_attempts
  FROM public.delivery_otps
  WHERE order_id = p_order_id AND used_at IS NULL AND expires_at > now()
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF v_otp_id IS NULL THEN RAISE EXCEPTION 'No active OTP for this order'; END IF;
  IF v_attempts >= 5 THEN RAISE EXCEPTION 'Too many attempts. Contact support.'; END IF;

  IF v_stored <> p_otp THEN
    UPDATE public.delivery_otps SET attempts = attempts + 1 WHERE id = v_otp_id;
    RAISE EXCEPTION 'Incorrect OTP';
  END IF;

  UPDATE public.delivery_otps SET used_at = now() WHERE id = v_otp_id;
  UPDATE public.orders SET status = 'delivered_confirmed', delivered_confirmed_at = now(), updated_at = now()
  WHERE id = p_order_id;
END;
$$;

-- 10. Tailor: generate OTP for self-pickup
CREATE OR REPLACE FUNCTION public.tailor_generate_pickup_otp(p_order_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid(); v_owner UUID; v_mode TEXT; v_otp TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT tp.user_id, o.delivery_mode INTO v_owner, v_mode
  FROM public.orders o JOIN public.tailor_profiles tp ON tp.id = o.tailor_profile_id
  WHERE o.id = p_order_id;
  IF v_owner IS NULL OR v_owner <> v_user THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_mode <> 'pickup' THEN RAISE EXCEPTION 'This order is not a self-pickup'; END IF;

  -- Invalidate any prior pickup OTPs
  UPDATE public.delivery_otps SET used_at = now()
  WHERE order_id = p_order_id AND purpose = 'pickup' AND used_at IS NULL;

  v_otp := LPAD((FLOOR(RANDOM() * 1000000))::INT::TEXT, 6, '0');
  INSERT INTO public.delivery_otps (order_id, otp_code, purpose) VALUES (p_order_id, v_otp, 'pickup');
  UPDATE public.orders SET status = 'awaiting_confirmation', updated_at = now() WHERE id = p_order_id;
  RETURN v_otp;
END;
$$;

-- 11. Permissions
REVOKE EXECUTE ON FUNCTION public.tailor_mark_ready_for_shipment(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_create_shipment(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_shipment_status(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_delivery_with_otp(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tailor_generate_pickup_otp(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tailor_mark_ready_for_shipment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_shipment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_shipment_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_delivery_with_otp(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tailor_generate_pickup_otp(UUID) TO authenticated;

-- 12. Realtime
ALTER TABLE public.shipments REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_otps REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_otps;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
