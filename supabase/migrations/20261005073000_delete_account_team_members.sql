-- Ensure self-service account deletion also removes team membership rows
-- that would otherwise retain the user's email after auth.users is deleted.
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
  user_email text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT email
    INTO user_email
    FROM auth.users
   WHERE id = uid;

  IF user_email IS NULL THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  -- team_members.user_id uses ON DELETE SET NULL and the row stores an email.
  -- Delete both accepted membership and pending/invited rows for this address
  -- so account deletion does not leave personally identifiable email behind.
  DELETE FROM public.team_members
   WHERE user_id = uid
      OR lower(email) = lower(user_email);

  DELETE FROM auth.users
   WHERE id = uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_own_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

COMMENT ON FUNCTION public.delete_own_account()
IS 'Permanently deletes the current authenticated user and removes retained team membership email rows; never accepts a target user id.';
