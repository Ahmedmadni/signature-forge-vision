import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

/** رفع ملف إلى التخزين وإنشاء سجل مستند */
export async function uploadDocument(file: File): Promise<DocumentRow> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("يجب تسجيل الدخول");
  const userId = userData.user.id;

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const id = crypto.randomUUID();
  const path = `${userId}/${id}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("documents")
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (upErr) throw new Error(upErr.message);

  const { data: row, error: insErr } = await supabase
    .from("documents")
    .insert({
      id,
      owner_id: userId,
      title: file.name.replace(/\.[^.]+$/, ""),
      file_type: ext,
      file_path: path,
      status: "draft",
      size_bytes: file.size,
    })
    .select()
    .maybeSingle();
  if (insErr) throw new Error(insErr.message);
  if (!row) throw new Error("تعذّر إنشاء المستند");
  return row;
}

/** الحصول على رابط موقّع لعرض الملف */
export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, expiresIn);
  if (error || !data) throw new Error(error?.message || "تعذّر إنشاء الرابط");
  return data.signedUrl;
}

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) setError(error.message);
    else setDocuments(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { documents, loading, error, refresh };
}

export function useDocument(id: string) {
  const [document, setDocument] = useState<DocumentRow | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (!data) {
        setError("المستند غير موجود");
        setLoading(false);
        return;
      }
      setDocument(data);
      try {
        const url = data.file_path
          ? await getSignedUrl(data.file_path)
          : "/sample-contract.pdf";
        if (!cancelled) setSrc(url);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "خطأ في الرابط");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { document, src, loading, error };
}
