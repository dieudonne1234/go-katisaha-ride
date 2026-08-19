REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.my_agency_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_booking(bigint, bigint[], text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pay_booking(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(bigint, bigint[], text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_booking(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;