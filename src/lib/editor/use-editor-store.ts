import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  type ApplyScope,
  type EditorField,
  type FieldType,
  fieldMeta,
  resolveScopePages,
} from "./types";
import {
  loadDocumentFields,
  syncDocumentFields,
  createDocumentVersion,
  listDocumentVersions,
  restoreDocumentVersion,
  type PersistedField,
} from "./documents.functions";

interface HistoryState {
  past: EditorField[][];
  present: EditorField[];
  future: EditorField[][];
}

type Action =
  | { type: "set"; fields: EditorField[] }
  | { type: "add"; field: EditorField }
  | { type: "update"; id: string; patch: Partial<EditorField> }
  | { type: "remove"; id: string }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "hydrate"; fields: EditorField[] };

const MAX_HISTORY = 60;

function commit(state: HistoryState, next: EditorField[]): HistoryState {
  return {
    past: [...state.past, state.present].slice(-MAX_HISTORY),
    present: next,
    future: [],
  };
}

function reducer(state: HistoryState, action: Action): HistoryState {
  switch (action.type) {
    case "hydrate":
      return { past: [], present: action.fields, future: [] };
    case "set":
      return commit(state, action.fields);
    case "add":
      return commit(state, [...state.present, action.field]);
    case "update":
      return commit(
        state,
        state.present.map((f) => (f.id === action.id ? { ...f, ...action.patch } : f)),
      );
    case "remove":
      return commit(state, state.present.filter((f) => f.id !== action.id));
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error";

export interface DocVersion {
  id: string;
  version_number: number;
  label: string | null;
  modified_count: number;
  created_by: string | null;
  created_at: string;
}

function toPersisted(f: EditorField): PersistedField {
  return {
    id: f.id,
    type: f.type,
    page: f.page,
    xPct: f.xPct,
    yPct: f.yPct,
    wPct: f.wPct,
    hPct: f.hPct,
    rotation: f.rotation,
    opacity: f.opacity,
    value: f.value,
    checked: f.checked,
    metadata: (f.metadata ?? {}) as PersistedField["metadata"],
  };
}

function fromPersisted(f: PersistedField & { version?: number }): EditorField {
  return {
    id: f.id,
    type: f.type as FieldType,
    page: f.page,
    xPct: f.xPct,
    yPct: f.yPct,
    wPct: f.wPct,
    hPct: f.hPct,
    rotation: f.rotation,
    opacity: f.opacity,
    value: f.value,
    checked: f.checked,
    metadata: (f.metadata ?? {}) as Record<string, unknown>,
    version: f.version,
  };
}

export function useEditorStore(documentId: string) {
  const [state, dispatch] = useReducer(reducer, {
    past: [],
    present: [],
    future: [],
  });

  const saveStatusRef = useRef<SaveStatus>("loading");
  const versionsRef = useRef<DocVersion[]>([]);
  const [, forceRender] = useReducer((n) => n + 1, 0);
  const setSaveStatus = useCallback((s: SaveStatus) => {
    saveStatusRef.current = s;
    forceRender();
  }, []);

  const dirtyRef = useRef(false);
  const inFlightRef = useRef(false);
  const latestFieldsRef = useRef<EditorField[]>([]);
  latestFieldsRef.current = state.present;
  const retryRef = useRef(0);
  const hydratedRef = useRef(false);

  // ---- التحميل الأولي من الخادم ----
  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    setSaveStatus("loading");
    loadDocumentFields({ data: { documentId } })
      .then((res) => {
        if (cancelled) return;
        dispatch({ type: "hydrate", fields: res.fields.map(fromPersisted) });
        hydratedRef.current = true;
        setSaveStatus("saved");
      })
      .catch(() => {
        if (cancelled) return;
        hydratedRef.current = true;
        setSaveStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  // ---- المزامنة مع الخادم ----
  const flush = useCallback(async () => {
    if (!hydratedRef.current) return;
    if (inFlightRef.current) {
      dirtyRef.current = true;
      return;
    }
    inFlightRef.current = true;
    dirtyRef.current = false;
    setSaveStatus("saving");
    try {
      const res = await syncDocumentFields({
        data: {
          documentId,
          fields: latestFieldsRef.current.map(toPersisted),
        },
      });
      retryRef.current = 0;
      // تحديث أرقام الإصدارات دون كسر تاريخ التراجع
      const versionMap = new Map(res.fields.map((f) => [f.id, f.version]));
      latestFieldsRef.current = latestFieldsRef.current.map((f) => ({
        ...f,
        version: versionMap.get(f.id) ?? f.version,
      }));
      setSaveStatus(dirtyRef.current ? "saving" : "saved");
    } catch {
      setSaveStatus("error");
      // إعادة المحاولة بتراجع تصاعدي
      if (retryRef.current < 5) {
        retryRef.current += 1;
        dirtyRef.current = true;
        setTimeout(() => void flush(), Math.min(1000 * 2 ** retryRef.current, 15000));
      }
    } finally {
      inFlightRef.current = false;
      if (dirtyRef.current) void flush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  // ---- حفظ تلقائي مع تأخير ----
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!hydratedRef.current) return;
    dirtyRef.current = true;
    setSaveStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 1500);
    return () => timer.current && clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.present]);

  const commitNow = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    void flush();
  }, [flush]);

  const addField = useCallback(
    (type: FieldType, page: number, xPct: number, yPct: number) => {
      const meta = fieldMeta[type];
      const id = uid();
      dispatch({
        type: "add",
        field: {
          id,
          type,
          page,
          xPct: Math.min(Math.max(xPct - meta.defaultW / 2, 0), 1 - meta.defaultW),
          yPct: Math.min(Math.max(yPct - meta.defaultH / 2, 0), 1 - meta.defaultH),
          wPct: meta.defaultW,
          hPct: meta.defaultH,
          rotation: 0,
          opacity: 1,
          value: type === "date" ? new Date().toLocaleDateString("ar-EG") : "",
          checked: type === "checkbox" ? true : undefined,
          metadata: {},
          version: 1,
        },
      });
      return id;
    },
    [],
  );

  const updateField = useCallback(
    (id: string, patch: Partial<EditorField>) => dispatch({ type: "update", id, patch }),
    [],
  );
  const removeField = useCallback((id: string) => dispatch({ type: "remove", id }), []);

  const applyToPages = useCallback(
    (field: EditorField, scope: ApplyScope, currentPage: number, pageCount: number) => {
      const pages = resolveScopePages(scope, currentPage, pageCount).filter(
        (p) => p !== field.page,
      );
      if (pages.length === 0) return;
      const clones: EditorField[] = pages.map((p) => ({
        ...field,
        id: uid(),
        page: p,
        version: 1,
      }));
      dispatch({ type: "set", fields: [...latestFieldsRef.current, ...clones] });
    },
    [],
  );

  // ---- إصدارات المستند ----
  const saveVersion = useCallback(
    async (label?: string) => {
      await commitNow();
      await createDocumentVersion({
        data: {
          documentId,
          label,
          modifiedCount: latestFieldsRef.current.length,
        },
      });
      await refreshVersions();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [documentId, commitNow],
  );

  const refreshVersions = useCallback(async () => {
    try {
      const res = await listDocumentVersions({ data: { documentId } });
      versionsRef.current = res.versions as DocVersion[];
      forceRender();
    } catch {
      /* تجاهل */
    }
  }, [documentId]);

  const restoreVersion = useCallback(
    async (versionId: string) => {
      const res = await restoreDocumentVersion({ data: { documentId, versionId } });
      dispatch({ type: "hydrate", fields: res.fields.map(fromPersisted) });
      hydratedRef.current = true;
      setSaveStatus("saved");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [documentId],
  );

  return useMemo(
    () => ({
      fields: state.present,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      saveStatus: saveStatusRef.current,
      versions: versionsRef.current,
      addField,
      updateField,
      removeField,
      applyToPages,
      commitNow,
      saveVersion,
      refreshVersions,
      restoreVersion,
      retrySave: commitNow,
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
      clear: () => dispatch({ type: "set", fields: [] }),
    }),
    [
      state,
      addField,
      updateField,
      removeField,
      applyToPages,
      commitNow,
      saveVersion,
      refreshVersions,
      restoreVersion,
    ],
  );
}

export type EditorStore = ReturnType<typeof useEditorStore>;
