import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";

export interface StoredSignature {
  id: string;
  name: string;
  type: "drawn" | "typed" | "uploaded" | "ai";
  data_url: string | null;
  is_default: boolean;
  created_at: string;
}

const GUEST_KEY = "waqqi:guest-signatures:v1";
const GUEST_LIMIT = 8;

export function getGuestSignatures(): StoredSignature[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StoredSignature =>
      !!item && typeof item === "object" &&
      typeof item.id === "string" && typeof item.name === "string" &&
      typeof item.data_url === "string" && item.data_url.startsWith("data:image/") &&
      typeof item.is_default === "boolean",
    ).slice(0, GUEST_LIMIT);
  } catch {
    return [];
  }
}

function putGuestSignatures(items: StoredSignature[]): void {
  if (typeof localStorage === "undefined") throw new Error("التخزين المحلي غير متاح على هذا الجهاز");
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(items.slice(0, GUEST_LIMIT)));
  } catch {
    throw new Error("لم تتوفر مساحة كافية لحفظ التوقيع. احذف توقيعًا قديمًا أو صغّر الصورة.");
  }
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  const { data: verified, error } = await supabase.auth.getUser();
  if (error) throw error;
  return verified.user?.id ?? null;
}

export function useSignatures() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["signatures", user?.id ?? "guest"],
    enabled: !loading,
    queryFn: async () => {
      if (!user) return getGuestSignatures();
      const { data, error } = await supabase
        .from("signatures")
        .select("id,name,type,data_url,is_default,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StoredSignature[];
    },
  });
}

export function useDefaultSignature() {
  const q = useSignatures();
  const list = q.data ?? [];
  return { ...q, signature: list.find((s) => s.is_default) ?? list[0] ?? null };
}

export async function saveSignature(input: {
  dataUrl: string;
  name: string;
  type: StoredSignature["type"];
  makeDefault?: boolean;
}) {
  const userId = await currentUserId();
  if (!userId) {
    const current = getGuestSignatures();
    const isDefault = input.makeDefault !== false || !current.length;
    const record: StoredSignature = {
      id: crypto.randomUUID(),
      name: input.name,
      type: input.type,
      data_url: input.dataUrl,
      is_default: isDefault,
      created_at: new Date().toISOString(),
    };
    const rest = current.map((s) => ({ ...s, is_default: isDefault ? false : s.is_default }));
    putGuestSignatures([record, ...rest]);
    return record.id;
  }

  if (input.makeDefault !== false) {
    const { error: resetError } = await supabase
      .from("signatures").update({ is_default: false }).eq("owner_id", userId);
    if (resetError) throw resetError;
  }

  const { data, error } = await supabase
    .from("signatures")
    .insert({
      owner_id: userId,
      name: input.name,
      type: input.type,
      data_url: input.dataUrl,
      is_default: input.makeDefault !== false,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function setDefaultSignature(id: string) {
  const userId = await currentUserId();
  if (!userId) {
    const items = getGuestSignatures();
    if (!items.some((s) => s.id === id)) return;
    putGuestSignatures(items.map((s) => ({ ...s, is_default: s.id === id })));
    return;
  }
  const { error: resetError } = await supabase
    .from("signatures").update({ is_default: false }).eq("owner_id", userId);
  if (resetError) throw resetError;
  const { error } = await supabase.from("signatures")
    .update({ is_default: true }).eq("id", id).eq("owner_id", userId);
  if (error) throw error;
}

export async function deleteSignature(id: string) {
  const userId = await currentUserId();
  if (!userId) {
    const items = getGuestSignatures().filter((s) => s.id !== id);
    if (items.length && !items.some((s) => s.is_default)) items[0].is_default = true;
    putGuestSignatures(items);
    return;
  }
  const { error } = await supabase.from("signatures")
    .delete().eq("id", id).eq("owner_id", userId);
  if (error) throw error;
}

export function useInvalidateSignatures() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["signatures"] });
}
