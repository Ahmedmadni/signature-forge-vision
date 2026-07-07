import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

// ---- التحقق من المدخلات ----
const fieldSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  page: z.number().int().positive(),
  xPct: z.number(),
  yPct: z.number(),
  wPct: z.number(),
  hPct: z.number(),
  rotation: z.number(),
  opacity: z.number(),
  value: z.string().optional(),
  checked: z.boolean().optional(),
  metadata: z.custom<Json>().optional(),
});

export type PersistedField = z.infer<typeof fieldSchema>;

function rowToField(r: Record<string, unknown>): PersistedField & { version: number } {
  return {
    id: r.id as string,
    type: r.field_type as string,
    page: r.page_number as number,
    xPct: r.x_pct as number,
    yPct: r.y_pct as number,
    wPct: r.w_pct as number,
    hPct: r.h_pct as number,
    rotation: r.rotation as number,
    opacity: r.opacity as number,
    value: (r.value as string) ?? undefined,
    checked: (r.checked as boolean) ?? undefined,
    metadata: (r.metadata as Json) ?? {},
    version: r.version as number,
  };
}

// ---- تحميل مستند وحقوله ----
export const loadDocumentFields = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documentId: string }) =>
    z.object({ documentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("document_fields")
      .select("*")
      .eq("document_id", data.documentId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { fields: (rows ?? []).map(rowToField) };
  });

// ---- مزامنة الحقول (إدراج/تحديث/حذف) مع سجل الإصدارات ----
export const syncDocumentFields = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documentId: string; fields: PersistedField[] }) =>
    z
      .object({ documentId: z.string().uuid(), fields: z.array(fieldSchema) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { documentId, fields } = data;

    // تأكيد ملكية المستند
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id")
      .eq("id", documentId)
      .maybeSingle();
    if (docErr) throw new Error(docErr.message);
    if (!doc) throw new Error("Document not found");

    const { data: existingRows, error: exErr } = await supabase
      .from("document_fields")
      .select("*")
      .eq("document_id", documentId);
    if (exErr) throw new Error(exErr.message);

    const existing = new Map((existingRows ?? []).map((r) => [r.id as string, r]));
    const incomingIds = new Set(fields.map((f) => f.id));

    const versionRows: {
      field_id: string;
      document_id: string;
      version: number;
      snapshot: Json;
      changed_by: string;
    }[] = [];

    for (const f of fields) {
      const prev = existing.get(f.id);
      const base = {
        document_id: documentId,
        page_number: f.page,
        field_type: f.type,
        x_pct: f.xPct,
        y_pct: f.yPct,
        w_pct: f.wPct,
        h_pct: f.hPct,
        rotation: f.rotation,
        opacity: f.opacity,
        value: f.value ?? null,
        checked: f.checked ?? null,
        metadata: f.metadata ?? {},
      };

      if (!prev) {
        const { error } = await supabase
          .from("document_fields")
          .insert({ id: f.id, version: 1, ...base });
        if (error) throw new Error(error.message);
        versionRows.push({
          field_id: f.id,
          document_id: documentId,
          version: 1,
          snapshot: base,
          changed_by: userId,
        });
      } else {
        const changed =
          prev.page_number !== f.page ||
          prev.x_pct !== f.xPct ||
          prev.y_pct !== f.yPct ||
          prev.w_pct !== f.wPct ||
          prev.h_pct !== f.hPct ||
          prev.rotation !== f.rotation ||
          prev.opacity !== f.opacity ||
          (prev.value ?? null) !== (f.value ?? null) ||
          (prev.checked ?? null) !== (f.checked ?? null);
        if (changed) {
          const nextVersion = (prev.version as number) + 1;
          const { error } = await supabase
            .from("document_fields")
            .update({ ...base, version: nextVersion })
            .eq("id", f.id);
          if (error) throw new Error(error.message);
          versionRows.push({
            field_id: f.id,
            document_id: documentId,
            version: nextVersion,
            snapshot: base,
            changed_by: userId,
          });
        }
      }
    }

    // حذف الحقول المفقودة
    const toDelete = [...existing.keys()].filter((id) => !incomingIds.has(id));
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from("document_fields")
        .delete()
        .in("id", toDelete);
      if (error) throw new Error(error.message);
    }

    if (versionRows.length > 0) {
      await supabase.from("field_versions").insert(versionRows);
    }

    const { data: fresh, error: freshErr } = await supabase
      .from("document_fields")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: true });
    if (freshErr) throw new Error(freshErr.message);

    return { fields: (fresh ?? []).map(rowToField), savedAt: new Date().toISOString() };
  });

// ---- لقطة إصدار للمستند ----
export const createDocumentVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documentId: string; label?: string; modifiedCount?: number }) =>
    z
      .object({
        documentId: z.string().uuid(),
        label: z.string().max(120).optional(),
        modifiedCount: z.number().int().nonnegative().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("document_fields")
      .select("*")
      .eq("document_id", data.documentId);
    if (error) throw new Error(error.message);

    const { data: last } = await supabase
      .from("document_versions")
      .select("version_number")
      .eq("document_id", data.documentId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNumber = (last?.version_number ?? 0) + 1;

    const { data: inserted, error: insErr } = await supabase
      .from("document_versions")
      .insert({
        document_id: data.documentId,
        version_number: nextNumber,
        label: data.label ?? null,
        fields_snapshot: rows ?? [],
        modified_count: data.modifiedCount ?? (rows?.length ?? 0),
        created_by: userId,
      })
      .select()
      .maybeSingle();
    if (insErr) throw new Error(insErr.message);
    return { version: inserted };
  });

export const listDocumentVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documentId: string }) =>
    z.object({ documentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("document_versions")
      .select("id, version_number, label, modified_count, created_by, created_at")
      .eq("document_id", data.documentId)
      .order("version_number", { ascending: false });
    if (error) throw new Error(error.message);
    return { versions: rows ?? [] };
  });

// ---- استعادة إصدار سابق ----
export const restoreDocumentVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documentId: string; versionId: string }) =>
    z
      .object({ documentId: z.string().uuid(), versionId: z.string().uuid() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: version, error } = await supabase
      .from("document_versions")
      .select("fields_snapshot")
      .eq("id", data.versionId)
      .eq("document_id", data.documentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!version) throw new Error("Version not found");

    const snapshot = (version.fields_snapshot as Record<string, unknown>[]) ?? [];

    // استبدال الحقول الحالية بلقطة الإصدار
    await supabase.from("document_fields").delete().eq("document_id", data.documentId);
    if (snapshot.length > 0) {
      const rows = snapshot.map((r) => ({
        id: r.id as string,
        document_id: data.documentId,
        page_number: r.page_number as number,
        field_type: r.field_type as string,
        x_pct: r.x_pct as number,
        y_pct: r.y_pct as number,
        w_pct: r.w_pct as number,
        h_pct: r.h_pct as number,
        rotation: r.rotation as number,
        opacity: r.opacity as number,
        value: (r.value as string | null) ?? null,
        checked: (r.checked as boolean | null) ?? null,
        metadata: (r.metadata as Json) ?? {},
        version: (r.version as number) ?? 1,
      }));
      const { error: insErr } = await supabase.from("document_fields").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }

    const { data: fresh } = await supabase
      .from("document_fields")
      .select("*")
      .eq("document_id", data.documentId)
      .order("created_at", { ascending: true });
    return { fields: (fresh ?? []).map(rowToField) };
  });
