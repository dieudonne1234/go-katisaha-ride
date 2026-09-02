REVOKE EXECUTE ON FUNCTION public.create_booking(bigint, bigint[], text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pay_booking(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_agency_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;