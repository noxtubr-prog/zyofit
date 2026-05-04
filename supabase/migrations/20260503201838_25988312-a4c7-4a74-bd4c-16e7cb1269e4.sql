-- Trigger-only / internal helpers: nobody outside the database needs to call these
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_wallet_for_tailor() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_order_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_account_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_tailor_profile_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_store_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_withdrawal_amount() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_user_roles_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_order_created_credit_wallet() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_order_delivered_release() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_tailor_wallet(uuid, uuid, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_pending_to_available(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_user_activity(uuid, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Admin-only RPCs: revoke from anon (function still self-checks admin for authenticated)
REVOKE ALL ON FUNCTION public.admin_set_account_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_shipment(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_shipment_status(uuid, text) FROM PUBLIC, anon;

-- User-action RPCs: signed-in only
REVOKE ALL ON FUNCTION public.become_tailor() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tailor_mark_ready_for_shipment(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tailor_generate_pickup_otp(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_delivery_with_otp(uuid, text) FROM PUBLIC, anon;

-- has_role is used by RLS policies — keep callable by everyone (already SECURITY DEFINER + STABLE)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;