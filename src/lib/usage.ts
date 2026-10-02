import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { validateUsagePageCount } from "./usage-policy";

export interface UsageStatus {
  pages_used: number;
  daily_limit: number;
  remaining: number;
  unlimited: boolean;
  plan: string;
}

export const DAILY_FREE_PAGES = 3;
const GUEST_USAGE_KEY = "waqqi:guest-usage:v1";

function today(): string {
  // UTC is intentional: stable across timezone changes within a session.
  return new Date().toISOString().slice(0, 10);
}

export function readGuestUsage(): UsageStatus {
  let used = 0;
  if (typeof localStorage !== "undefined") {
    try {
      const parsed = JSON.parse(localStorage.getItem(GUEST_USAGE_KEY) ?? "{}");
      if (parsed?.day === today() && Number.isSafeInteger(parsed.count)) {
        used = Math.max(0, parsed.count);
      }
    } catch {
      // A corrupt guest counter must not crash local document signing.
    }
  }
  return {
    pages_used: used,
    daily_limit: DAILY_FREE_PAGES,
    remaining: Math.max(0, DAILY_FREE_PAGES - used),
    unlimited: false,
    plan: "guest",
  };
}

/** Local guest limits are UX safeguards, not tamper-resistant billing enforcement. */
export function consumeGuestPages(pages: number): ConsumeResult {
  const requested = validateUsagePageCount(pages);
  const current = readGuestUsage();
  const allowed = requested <= current.remaining;
  const nextUsed = allowed ? current.pages_used + requested : current.pages_used;
  if (allowed) {
    if (typeof localStorage === "undefined") throw new Error("التخزين المحلي غير متاح لحفظ حصة الضيف");
    localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify({ day: today(), count: nextUsed }));
  }
  return {
    allowed,
    pages_used: nextUsed,
    daily_limit: DAILY_FREE_PAGES,
    remaining: Math.max(0, DAILY_FREE_PAGES - nextUsed),
    unlimited: false,
  };
}

async function hasSession(): Promise<boolean> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return Boolean(data.session?.user);
}

export async function fetchUsage(): Promise<UsageStatus> {
  if (!await hasSession()) return readGuestUsage();
  const { data, error } = await supabase.rpc("get_usage_status" as never);
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as UsageStatus | undefined;
  return row ?? {
    pages_used: 0,
    daily_limit: DAILY_FREE_PAGES,
    remaining: DAILY_FREE_PAGES,
    unlimited: false,
    plan: "free",
  };
}

export function useUsage() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["usage", user?.id ?? "guest"],
    queryFn: fetchUsage,
    enabled: !loading,
    staleTime: 15_000,
  });
}

export interface ConsumeResult {
  allowed: boolean;
  pages_used: number;
  daily_limit: number;
  remaining: number;
  unlimited: boolean;
}

/** Signed-in quotas remain server-side; guest quotas are local for this device. */
export async function consumePages(pages: number): Promise<ConsumeResult> {
  const pPages = validateUsagePageCount(pages);
  if (!await hasSession()) return consumeGuestPages(pPages);
  const { data, error } = await supabase.rpc("consume_signing_pages" as never, {
    p_pages: pPages,
  } as never);
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as ConsumeResult | undefined;
  if (!row) throw new Error("لم يرجع الخادم نتيجة حصة التوقيع");
  return row;
}

export function useInvalidateUsage() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["usage"] });
}
