CREATE TABLE IF NOT EXISTS public.usage_days (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  pages_used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

GRANT SELECT ON public.usage_days TO authenticated;
GRANT ALL ON public.usage_days TO service_role;
ALTER TABLE public.usage_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own usage" ON public.usage_days FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'inactive',
  provider text,
  external_ref text,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.entitlements TO authenticated;
GRANT ALL ON public.entitlements TO service_role;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own entitlement" ON public.entitlements FOR SELECT TO authenticated USING (auth.uid() = user_id);

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

  SELECT e.plan, (e.status = 'active' AND (e.expires_at IS NULL OR e.expires_at > now()))
    INTO pl, unl
  FROM public.entitlements e WHERE e.user_id = uid;

  pl := COALESCE(pl, 'free');
  unl := COALESCE(unl, false);

  SELECT u.pages_used INTO used
  FROM public.usage_days u
  WHERE u.user_id = uid AND u.day = (now() AT TIME ZONE 'utc')::date;

  used := COALESCE(used, 0);

  RETURN QUERY SELECT used, lim, GREATEST(lim - used, 0), unl, pl;
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
  IF p_pages IS NULL OR p_pages < 1 THEN
    RAISE EXCEPTION 'Invalid page count';
  END IF;

  SELECT (e.status = 'active' AND (e.expires_at IS NULL OR e.expires_at > now()))
    INTO unl
  FROM public.entitlements e WHERE e.user_id = uid;
  unl := COALESCE(unl, false);

  INSERT INTO public.usage_days (user_id, day, pages_used)
  VALUES (uid, (now() AT TIME ZONE 'utc')::date, 0)
  ON CONFLICT (user_id, day) DO NOTHING;

  SELECT u.pages_used INTO used
  FROM public.usage_days u
  WHERE u.user_id = uid AND u.day = (now() AT TIME ZONE 'utc')::date
  FOR UPDATE;

  IF NOT unl AND used + p_pages > lim THEN
    RETURN QUERY SELECT false, used, lim, GREATEST(lim - used, 0), unl;
    RETURN;
  END IF;

  UPDATE public.usage_days
     SET pages_used = pages_used + p_pages, updated_at = now()
   WHERE user_id = uid AND day = (now() AT TIME ZONE 'utc')::date
  RETURNING public.usage_days.pages_used INTO used;

  RETURN QUERY SELECT true, used, lim, GREATEST(lim - used, 0), unl;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_usage_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_signing_pages(integer) TO authenticated;