-- Consolidate order statuses to canonical set: placed, stitching, ready, shipped, delivered (+ cancelled)

-- 1) Migrate existing legacy values
UPDATE public.orders SET status = 'stitching' WHERE status = 'measurements';
UPDATE public.orders SET status = 'ready' WHERE status = 'ready_for_shipment';
UPDATE public.orders SET status = 'shipped' WHERE status IN ('out_for_delivery', 'awaiting_confirmation');
UPDATE public.orders SET status = 'delivered' WHERE status = 'delivered_confirmed';

-- 2) Replace the CHECK constraint with the canonical list
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY['placed','stitching','ready','shipped','delivered','cancelled']::text[]));

-- 3) Update tailor_mark_ready_for_shipment to set 'ready'
CREATE OR REPLACE FUNCTION public.tailor_mark_ready_for_shipment(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user UUID := auth.uid(); v_owner UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT tp.user_id INTO v_owner
  FROM public.orders o
  JOIN public.tailor_profiles tp ON tp.id = o.tailor_profile_id
  WHERE o.id = p_order_id;
  IF v_owner IS NULL OR v_owner <> v_user THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE public.orders
    SET status = 'ready',
        ready_for_shipment_at = now(),
        updated_at = now()
    WHERE id = p_order_id AND status IN ('placed','stitching');
  IF NOT FOUND THEN RAISE EXCEPTION 'Order is not in a stitching state'; END IF;
END;
$function$;

-- 4) Update admin_create_shipment to accept 'ready' and set 'shipped'
CREATE OR REPLACE FUNCTION public.admin_create_shipment(p_order_id uuid, p_courier_name text DEFAULT 'ZyloFit Express'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_id UUID; v_tracking TEXT; v_status TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT status INTO v_status FROM public.orders WHERE id = p_order_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_status <> 'ready' THEN RAISE EXCEPTION 'Order is not ready for shipment (current: %)', v_status; END IF;

  v_tracking := 'ZF' || TO_CHAR(now(),'YYMMDD') || UPPER(SUBSTRING(MD5(p_order_id::text || now()::text) FROM 1 FOR 6));

  INSERT INTO public.shipments (order_id, courier_name, tracking_id, tracking_url, shipment_status, estimated_delivery)
  VALUES (p_order_id, p_courier_name, v_tracking, 'https://track.zylofit.com/' || v_tracking, 'created', (now() + INTERVAL '5 days')::date)
  ON CONFLICT (order_id) DO UPDATE SET courier_name = EXCLUDED.courier_name, updated_at = now()
  RETURNING id INTO v_id;

  UPDATE public.orders SET status = 'shipped', updated_at = now() WHERE id = p_order_id;
  RETURN v_id;
END;
$function$;

-- 5) Update admin_update_shipment_status: keep order status as 'shipped' through transit; set 'delivered' only after OTP confirm
CREATE OR REPLACE FUNCTION public.admin_update_shipment_status(p_shipment_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_order UUID; v_otp TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF p_status NOT IN ('created','picked_up','in_transit','out_for_delivery','delivered','failed') THEN
    RAISE EXCEPTION 'Invalid shipment status';
  END IF;

  UPDATE public.shipments SET shipment_status = p_status, updated_at = now()
  WHERE id = p_shipment_id RETURNING order_id INTO v_order;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Shipment not found'; END IF;

  -- When courier marks delivered, generate OTP for the customer to confirm. Order stays 'shipped' until confirmed.
  IF p_status = 'delivered' THEN
    v_otp := LPAD((FLOOR(RANDOM() * 1000000))::INT::TEXT, 6, '0');
    INSERT INTO public.delivery_otps (order_id, otp_code, purpose) VALUES (v_order, v_otp, 'delivery');
  END IF;
END;
$function$;

-- 6) Update confirm_delivery_with_otp to set canonical 'delivered'
CREATE OR REPLACE FUNCTION public.confirm_delivery_with_otp(p_order_id uuid, p_otp text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  UPDATE public.orders SET status = 'delivered', delivered_confirmed_at = now(), updated_at = now()
  WHERE id = p_order_id;
END;
$function$;

-- 7) Update on_order_delivered_release trigger to use canonical 'delivered'
CREATE OR REPLACE FUNCTION public.on_order_delivered_release()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    -- Credit wallet if not already credited (new escrow flow)
    IF NOT EXISTS (SELECT 1 FROM public.wallet_transactions WHERE order_id = NEW.id AND type = 'credit_pending') THEN
      IF NEW.tailor_profile_id IS NOT NULL AND NEW.total_amount > 0 THEN
        PERFORM public.credit_tailor_wallet(NEW.id, NEW.tailor_profile_id, NEW.total_amount, 0.10);
      END IF;
    END IF;
    PERFORM public.release_pending_to_available(NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'wallet release failed for order %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;