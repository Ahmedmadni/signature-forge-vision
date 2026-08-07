import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoredSignature {
  id: string;
  name: string;
  type: "drawn" | "typed" | "uploaded" | "ai";
  data_url: string | null;
  is_default: boolean;
  created_at: string;
}

export function useSignatures() {
  return useQuery({
    queryKey: ["signatures"],
    queryFn: async () => {
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
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("يجب تسجيل الدخول");

  if (input.makeDefault !== false) {
    await supabase.from("signatures").update({ is_default: false }).eq("owner_id", userId);
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
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("يجب تسجيل الدخول");
  await supabase.from("signatures").update({ is_default: false }).eq("owner_id", userId);
  const { error } = await supabase.from("signatures").update({ is_default: true }).eq("id", id);
  if (error) throw error;
}

export async function deleteSignature(id: string) {
  const { error } = await supabase.from("signatures").delete().eq("id", id);
  if (error) throw error;
}

export function useInvalidateSignatures() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["signatures"] });
}
