import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * A failed token refresh must never lock guests behind an infinite login
 * spinner. All document tools can run without a Supabase session.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let gotAuthEvent = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      gotAuthEvent = true;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active || gotAuthEvent) return;
        if (error) {
          setUser(null);
          return;
        }
        setUser(data.session?.user ?? null);
      })
      .catch(() => {
        if (active && !gotAuthEvent) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
