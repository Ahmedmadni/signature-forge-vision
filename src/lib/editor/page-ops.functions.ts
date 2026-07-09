import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- أدوات مساعدة ----
function b64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function nextVersionNumber(
  supabase: any,
  documentId: string,
): Promise<number> {
  const { data: last } = await supabase
    .from("document_versions")
    .select("version_number")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (last?.version_number ?? 0) + 1;
}

// ---- حفظ مراجعة PDF جديدة (بعد تعديل الصفحات) ----
export const savePdfRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      documentId: string;
      base64: string;
      operation: string;
      pageCount: number;
    }) =>
      z
        .object({
          documentId: z.string().uuid(),
          base64: z.string().min(1),
          operation: z.string().max(120),
          pageCount: z.number().int().positive(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, owner_id")
      .eq("id", data.documentId)
      .maybeSingle();
    if (docErr) throw new Error(docErr.message);
    if (!doc) throw new Error("Document not found");

    const bytes = b64ToBytes(data.base64);
    const ts = Date.now();
    const path = `${userId}/${data.documentId}/rev-${ts}.pdf`;

    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (upErr) throw new Error(upErr.message);

    // لقطة إصدار قبل تحديث المستند
    const versionNumber = await nextVersionNumber(supabase, data.documentId);
    const { data: version, error: verErr } = await supabase
      .from("document_versions")
      .insert({
        document_id: data.documentId,
        version_number: versionNumber,
        kind: "pdf",
        operation: data.operation,
        file_path: path,
        page_count: data.pageCount,
        label: data.operation,
        modified_count: data.pageCount,
        created_by: userId,
        fields_snapshot: [],
      })
      .select("id, version_number, operation, page_count, file_path, created_at")
      .maybeSingle();
    if (verErr) throw new Error(verErr.message);

    // تحديث المستند ليشير للملف الجديد
    const { error: updErr } = await supabase
      .from("documents")
      .update({
        file_path: path,
        page_count: data.pageCount,
        size_bytes: bytes.byteLength,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.documentId);
    if (updErr) throw new Error(updErr.message);

    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, 3600);

    return { version, url: signed?.signedUrl ?? null };
  });

// ---- قائمة مراجعات PDF ----
export const listPdfRevisions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documentId: string }) =>
    z.object({ documentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("document_versions")
      .select("id, version_number, operation, page_count, file_path, created_at")
      .eq("document_id", data.documentId)
      .eq("kind", "pdf")
      .order("version_number", { ascending: false });
    if (error) throw new Error(error.message);
    return { revisions: rows ?? [] };
  });

// ---- استعادة مراجعة PDF ----
export const restorePdfRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documentId: string; versionId: string }) =>
    z.object({ documentId: z.string().uuid(), versionId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: version, error } = await supabase
      .from("document_versions")
      .select("file_path, page_count, operation")
      .eq("id", data.versionId)
      .eq("document_id", data.documentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!version?.file_path) throw new Error("Revision not found");

    // إنشاء لقطة استعادة جديدة تحافظ على التسلسل الزمني
    const versionNumber = await nextVersionNumber(supabase, data.documentId);
    await supabase.from("document_versions").insert({
      document_id: data.documentId,
      version_number: versionNumber,
      kind: "pdf",
      operation: `استعادة: ${version.operation ?? ""}`.trim(),
      file_path: version.file_path,
      page_count: version.page_count,
      label: "استعادة مراجعة",
      modified_count: version.page_count ?? 0,
      created_by: userId,
      fields_snapshot: [],
    });

    await supabase
      .from("documents")
      .update({
        file_path: version.file_path,
        page_count: version.page_count ?? 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.documentId);

    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(version.file_path, 3600);
    return { url: signed?.signedUrl ?? null, pageCount: version.page_count ?? 1 };
  });

// ---- إنشاء مستند جديد من صفحات مستخرجة/مقسّمة ----
export const createDocumentFromPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { title: string; base64: string; pageCount: number }) =>
      z
        .object({
          title: z.string().min(1).max(200),
          base64: z.string().min(1),
          pageCount: z.number().int().positive(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const bytes = b64ToBytes(data.base64);
    const id = crypto.randomUUID();
    const path = `${userId}/${id}.pdf`;

    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (upErr) throw new Error(upErr.message);

    const { data: row, error: insErr } = await supabase
      .from("documents")
      .insert({
        id,
        owner_id: userId,
        title: data.title,
        file_type: "pdf",
        file_path: path,
        status: "draft",
        size_bytes: bytes.byteLength,
        page_count: data.pageCount,
      })
      .select("id, title")
      .maybeSingle();
    if (insErr) throw new Error(insErr.message);
    return { document: row };
  });
