REVOKE ALL ON FUNCTION public.get_usage_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_signing_pages(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_usage_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_signing_pages(integer) TO authenticated, service_role;