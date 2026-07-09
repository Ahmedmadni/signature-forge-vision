import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument, degrees } from "pdf-lib";
import {
  savePdfRevision,
  createDocumentFromPdf,
} from "./page-ops.functions";

if (typeof window !== "undefined") {
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;
}

export interface PageModel {
  uid: string;
  srcKey: string; // "origin" أو معرّف ملف مُضاف
  pageIndex: number; // فهرس 0-based داخل المصدر (يُتجاهل للصفحات الفارغة)
  rotation: number; // 0 | 90 | 180 | 270 (يُضاف فوق دوران الأصل)
  blank: boolean;
}

interface SourceEntry {
  bytes: Uint8Array;
  doc: any; // مستند pdf.js
  label: string;
}

const A4: [number, number] = [595.28, 841.89];

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[],
    );
  }
  return btoa(binary);
}

// ---- سجل التراجع المحلي ----
interface HistoryState {
  past: PageModel[][];
  present: PageModel[];
  future: PageModel[][];
}
type HAction =
  | { type: "set"; pages: PageModel[] }
  | { type: "hydrate"; pages: PageModel[] }
  | { type: "undo" }
  | { type: "redo" };

function historyReducer(state: HistoryState, action: HAction): HistoryState {
  switch (action.type) {
    case "hydrate":
      return { past: [], present: action.pages, future: [] };
    case "set":
      return {
        past: [...state.past, state.present].slice(-100),
        present: action.pages,
        future: [],
      };
    case "undo": {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: prev,
        future: [state.present, ...state.future],
      };
    }
    case "redo": {
      if (!state.future.length) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}

export type ViewMode = "grid" | "list";
export type SaveState = "idle" | "loading" | "saving" | "saved" | "error";
export type SplitMode = "count" | "ranges" | "individual" | "size";

export function usePageOrganizer(documentId: string, title: string, src: string) {
  const sourcesRef = useRef<Map<string, SourceEntry>>(new Map());
  const [, forceRender] = useReducer((n) => n + 1, 0);
  const [state, dispatch] = useReducer(historyReducer, {
    past: [],
    present: [],
    future: [],
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const anchorRef = useRef<string | null>(null);
  const [view, setView] = useState<ViewMode>("grid");
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const pagesRef = useRef<PageModel[]>([]);
  pagesRef.current = state.present;

  // ---- تحميل المصدر الأصلي ----
  useEffect(() => {
    let cancelled = false;
    setSaveState("loading");
    setLoadError(null);
    (async () => {
      try {
        const res = await fetch(src);
        const buf = new Uint8Array(await res.arrayBuffer());
        const doc = await (pdfjsLib as any).getDocument({ data: buf.slice() })
          .promise;
        if (cancelled) return;
        sourcesRef.current.set("origin", { bytes: buf, doc, label: title });
        const pages: PageModel[] = Array.from(
          { length: doc.numPages },
          (_, i) => ({
            uid: uid(),
            srcKey: "origin",
            pageIndex: i,
            rotation: 0,
            blank: false,
          }),
        );
        dispatch({ type: "hydrate", pages });
        setSaveState("saved");
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "تعذّر تحميل المستند");
        setSaveState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const getPdfjsPage = useCallback(
    async (srcKey: string, pageIndex: number) => {
      const entry = sourcesRef.current.get(srcKey);
      if (!entry) return null;
      return entry.doc.getPage(pageIndex + 1);
    },
    [],
  );

  // ---- التحديد ----
  const selectPage = useCallback(
    (id: string, mode: "single" | "toggle" | "range") => {
      setSelected((prev) => {
        const next = new Set(prev);
        const pages = pagesRef.current;
        if (mode === "toggle") {
          next.has(id) ? next.delete(id) : next.add(id);
          anchorRef.current = id;
        } else if (mode === "range" && anchorRef.current) {
          const a = pages.findIndex((p) => p.uid === anchorRef.current);
          const b = pages.findIndex((p) => p.uid === id);
          if (a !== -1 && b !== -1) {
            const [lo, hi] = a < b ? [a, b] : [b, a];
            for (let i = lo; i <= hi; i++) next.add(pages[i].uid);
          }
        } else {
          next.clear();
          next.add(id);
          anchorRef.current = id;
        }
        return next;
      });
    },
    [],
  );

  const selectAll = useCallback(() => {
    setSelected(new Set(pagesRef.current.map((p) => p.uid)));
  }, []);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const commit = useCallback((pages: PageModel[]) => {
    dispatch({ type: "set", pages });
  }, []);

  // ---- عمليات الصفحات ----
  const reorder = useCallback(
    (draggedId: string, targetIndex: number) => {
      const pages = [...pagesRef.current];
      const moveIds = selected.has(draggedId)
        ? pages.filter((p) => selected.has(p.uid)).map((p) => p.uid)
        : [draggedId];
      const moving = pages.filter((p) => moveIds.includes(p.uid));
      const rest = pages.filter((p) => !moveIds.includes(p.uid));
      const targetPage = pages[targetIndex];
      let insertAt = rest.findIndex((p) => p.uid === targetPage?.uid);
      if (insertAt === -1) insertAt = rest.length;
      rest.splice(insertAt, 0, ...moving);
      commit(rest);
    },
    [selected, commit],
  );

  const rotateSelected = useCallback(
    (delta: number) => {
      if (!selected.size) return;
      commit(
        pagesRef.current.map((p) =>
          selected.has(p.uid)
            ? { ...p, rotation: (((p.rotation + delta) % 360) + 360) % 360 }
            : p,
        ),
      );
    },
    [selected, commit],
  );

  const deleteSelected = useCallback(() => {
    if (!selected.size) return;
    const next = pagesRef.current.filter((p) => !selected.has(p.uid));
    if (next.length === 0) return; // لا تحذف كل الصفحات
    commit(next);
    clearSelection();
  }, [selected, commit, clearSelection]);

  const duplicateSelected = useCallback(() => {
    if (!selected.size) return;
    const pages = pagesRef.current;
    const out: PageModel[] = [];
    for (const p of pages) {
      out.push(p);
      if (selected.has(p.uid)) out.push({ ...p, uid: uid() });
    }
    commit(out);
  }, [selected, commit]);

  const insertBlank = useCallback(() => {
    const pages = [...pagesRef.current];
    let at = pages.length;
    if (selected.size) {
      const idxs = pages
        .map((p, i) => (selected.has(p.uid) ? i : -1))
        .filter((i) => i >= 0);
      at = Math.max(...idxs) + 1;
    }
    pages.splice(at, 0, {
      uid: uid(),
      srcKey: "origin",
      pageIndex: -1,
      rotation: 0,
      blank: true,
    });
    commit(pages);
  }, [selected, commit]);

  const addFile = useCallback(async (file: File) => {
    setBusy("جارٍ دمج الملف…");
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const doc = await (pdfjsLib as any).getDocument({ data: buf.slice() })
        .promise;
      const key = uid();
      sourcesRef.current.set(key, {
        bytes: buf,
        doc,
        label: file.name,
      });
      const added: PageModel[] = Array.from(
        { length: doc.numPages },
        (_, i) => ({
          uid: uid(),
          srcKey: key,
          pageIndex: i,
          rotation: 0,
          blank: false,
        }),
      );
      commit([...pagesRef.current, ...added]);
    } finally {
      setBusy(null);
    }
  }, [commit]);

  // ---- بناء PDF من مجموعة صفحات ----
  const buildPdf = useCallback(async (pages: PageModel[]): Promise<Uint8Array> => {
    const out = await PDFDocument.create();
    const loaded = new Map<string, PDFDocument>();
    for (const key of new Set(pages.filter((p) => !p.blank).map((p) => p.srcKey))) {
      const entry = sourcesRef.current.get(key);
      if (!entry) continue;
      loaded.set(key, await PDFDocument.load(entry.bytes.slice()));
    }
    for (const p of pages) {
      if (p.blank) {
        out.addPage(A4);
        continue;
      }
      const srcDoc = loaded.get(p.srcKey);
      if (!srcDoc) continue;
      const [copied] = await out.copyPages(srcDoc, [p.pageIndex]);
      const base = copied.getRotation().angle;
      copied.setRotation(degrees((((base + p.rotation) % 360) + 360) % 360));
      out.addPage(copied);
    }
    return out.save();
  }, []);

  const save = useCallback(
    async (operation: string) => {
      const pages = pagesRef.current;
      if (!pages.length) return;
      setSaveState("saving");
      try {
        const bytes = await buildPdf(pages);
        const res = await savePdfRevision({
          data: {
            documentId,
            base64: bytesToBase64(bytes),
            operation,
            pageCount: pages.length,
          },
        });
        // إعادة تحميل المصدر الأصلي من الملف الجديد لتصبح الحالة أساسًا جديدًا
        if (res.url) {
          const buf = new Uint8Array(
            await (await fetch(res.url)).arrayBuffer(),
          );
          const doc = await (pdfjsLib as any).getDocument({ data: buf.slice() })
            .promise;
          sourcesRef.current.set("origin", { bytes: buf, doc, label: title });
          dispatch({
            type: "hydrate",
            pages: Array.from({ length: doc.numPages }, (_, i) => ({
              uid: uid(),
              srcKey: "origin",
              pageIndex: i,
              rotation: 0,
              blank: false,
            })),
          });
        }
        setSaveState("saved");
        return res.version;
      } catch (e) {
        setSaveState("error");
        throw e;
      }
    },
    [documentId, title, buildPdf],
  );

  const extractSelected = useCallback(async () => {
    if (!selected.size) return null;
    setBusy("جارٍ الاستخراج…");
    try {
      const pages = pagesRef.current.filter((p) => selected.has(p.uid));
      const bytes = await buildPdf(pages);
      const res = await createDocumentFromPdf({
        data: {
          title: `${title} — مستخرَج (${pages.length})`,
          base64: bytesToBase64(bytes),
          pageCount: pages.length,
        },
      });
      return res.document;
    } finally {
      setBusy(null);
    }
  }, [selected, buildPdf, title]);

  const splitDocument = useCallback(
    async (mode: SplitMode, param: string) => {
      setBusy("جارٍ التقسيم…");
      try {
        const pages = pagesRef.current;
        const groups: PageModel[][] = [];
        if (mode === "individual") {
          pages.forEach((p) => groups.push([p]));
        } else if (mode === "count") {
          const n = Math.max(1, parseInt(param, 10) || 1);
          for (let i = 0; i < pages.length; i += n) {
            groups.push(pages.slice(i, i + n));
          }
        } else if (mode === "ranges") {
          // مثال: "1-3,4-6,7"
          param.split(",").forEach((part) => {
            const [a, b] = part.trim().split("-").map((x) => parseInt(x, 10));
            const lo = (a || 1) - 1;
            const hi = (b || a || 1) - 1;
            const g = pages.slice(lo, hi + 1);
            if (g.length) groups.push(g);
          });
        } else if (mode === "size") {
          // تقريب: بايت تقريبي لكل صفحة عبر بناء تراكمي
          const maxBytes = Math.max(0.05, parseFloat(param) || 1) * 1024 * 1024;
          let current: PageModel[] = [];
          for (const p of pages) {
            current.push(p);
            const bytes = await buildPdf(current);
            if (bytes.byteLength >= maxBytes && current.length > 1) {
              current.pop();
              groups.push(current);
              current = [p];
            }
          }
          if (current.length) groups.push(current);
        }
        const results = [];
        for (let i = 0; i < groups.length; i++) {
          const bytes = await buildPdf(groups[i]);
          const res = await createDocumentFromPdf({
            data: {
              title: `${title} — جزء ${i + 1}`,
              base64: bytesToBase64(bytes),
              pageCount: groups[i].length,
            },
          });
          results.push(res.document);
        }
        return results;
      } finally {
        setBusy(null);
      }
    },
    [buildPdf, title],
  );

  const undo = useCallback(() => {
    dispatch({ type: "undo" });
    forceRender();
  }, []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  return useMemo(
    () => ({
      pages: state.present,
      selected,
      view,
      setView,
      saveState,
      loadError,
      busy,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      getPdfjsPage,
      selectPage,
      selectAll,
      clearSelection,
      reorder,
      rotateSelected,
      deleteSelected,
      duplicateSelected,
      insertBlank,
      addFile,
      extractSelected,
      splitDocument,
      save,
      undo,
      redo,
    }),
    [
      state,
      selected,
      view,
      saveState,
      loadError,
      busy,
      getPdfjsPage,
      selectPage,
      selectAll,
      clearSelection,
      reorder,
      rotateSelected,
      deleteSelected,
      duplicateSelected,
      insertBlank,
      addFile,
      extractSelected,
      splitDocument,
      save,
      undo,
      redo,
    ],
  );
}

export type PageOrganizerStore = ReturnType<typeof usePageOrganizer>;
