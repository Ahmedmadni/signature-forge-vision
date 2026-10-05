import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UsageStatus {
  pages_used: number;
  daily_limit: number;
  remaining: number;
  unlimited: boolean;
  plan: string;
}

export const DAILY_FREE_PAGES = 3;

export async function fetchUsage(): Promise<UsageStatus> {
  const { data, error } = await supabase.rpc("get_usage_status" as never);
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as UsageStatus | undefined;
  return (
    row ?? {
      pages_used: 0,
      daily_limit: DAILY_FREE_PAGES,
      remaining: DAILY_FREE_PAGES,
      unlimited: false,
      plan: "free",
    }
  );
}

export function useUsage() {
  return useQuery({ queryKey: ["usage"], queryFn: fetchUsage, staleTime: 15_000 });
}

export interface ConsumeResult {
  allowed: boolean;
  pages_used: number;
  daily_limit: number;
  remaining: number;
  unlimited: boolean;
}

/** يستهلك عدد الصفحات من الحصة اليومية. يعيد allowed=false عند تجاوز الحد. */
export async function consumePages(pages: number): Promise<ConsumeResult> {
  const { data, error } = await supabase.rpc("consume_signing_pages" as never, {
    p_pages: pages,
  } as never);
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as ConsumeResult;
  return row;
}

export function useInvalidateUsage() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["usage"] });
}
