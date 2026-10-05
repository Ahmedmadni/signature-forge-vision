-- Harden usage quota semantics and abuse boundaries.
ALTER TABLE public.usage_days
  DROP CONSTRAINT IF EXISTS usage_days_pages_used_nonnegative,
  ADD CONSTRAINT usage_days_pages_used_nonnegative CHECK (pages_used >= 0);

CREATE OR REPLACE FUNCTION public.get_usage_status()
RETURNS TABLE (pages_used integer, daily_limit integer, remaining integer, unlimited boolean, plan text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  used integer := 0;
  lim integer := 3;
  unl boolean := false;
  pl text := 'free';
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT
    e.plan,
    (
      e.plan <> 'free'
      AND e.status = 'active'
      AND (e.expires_at IS NULL OR e.expires_at > now())
    )
  INTO pl, unl
  FROM public.entitlements e
  WHERE e.user_id = uid;

  pl := COALESCE(pl, 'free');
  unl := COALESCE(unl, false);

  SELECT u.pages_used INTO used
  FROM public.usage_days u
  WHERE u.user_id = uid
    AND u.day = (now() AT TIME ZONE 'utc')::date;

  used := COALESCE(used, 0);

  RETURN QUERY
  SELECT used, lim, GREATEST(lim - used, 0), unl, pl;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_signing_pages(p_pages integer)
RETURNS TABLE (allowed boolean, pages_used integer, daily_limit integer, remaining integer, unlimited boolean)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  used integer := 0;
  lim integer := 3;
  unl boolean := false;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_pages IS NULL OR p_pages < 1 OR p_pages > 10000 THEN
    RAISE EXCEPTION 'Invalid page count';
  END IF;

  SELECT (
    e.plan <> 'free'
    AND e.status = 'active'
    AND (e.expires_at IS NULL OR e.expires_at > now())
  )
  INTO unl
  FROM public.entitlements e
  WHERE e.user_id = uid;

  unl := COALESCE(unl, false);

  INSERT INTO public.usage_days (user_id, day, pages_used)
  VALUES (uid, (now() AT TIME ZONE 'utc')::date, 0)
  ON CONFLICT (user_id, day) DO NOTHING;

  SELECT u.pages_used INTO used
  FROM public.usage_days u
  WHERE u.user_id = uid
    AND u.day = (now() AT TIME ZONE 'utc')::date
  FOR UPDATE;

  IF NOT unl AND (used::bigint + p_pages::bigint) > lim THEN
    RETURN QUERY
    SELECT false, used, lim, GREATEST(lim - used, 0), unl;
    RETURN;
  END IF;

  UPDATE public.usage_days
  SET pages_used = pages_used + p_pages,
      updated_at = now()
  WHERE user_id = uid
    AND day = (now() AT TIME ZONE 'utc')::date
  RETURNING public.usage_days.pages_used INTO used;

  RETURN QUERY
  SELECT true, used, lim, GREATEST(lim - used, 0), unl;
END;
$$;

REVOKE ALL ON FUNCTION public.get_usage_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_signing_pages(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_usage_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_signing_pages(integer) TO authenticated;
