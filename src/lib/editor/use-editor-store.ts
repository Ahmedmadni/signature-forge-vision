import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  type ApplyScope,
  type EditorField,
  type FieldType,
  fieldMeta,
  resolveScopePages,
} from "./types";

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

const uid = () => `f_${Math.random().toString(36).slice(2, 9)}`;

export type SaveStatus = "idle" | "saving" | "saved";

export function useEditorStore(docId: string) {
  const storageKey = `signforge:editor:${docId}`;
  const [state, dispatch] = useReducer(reducer, {
    past: [],
    present: [],
    future: [],
  });
  const saveStatusRef = useRef<SaveStatus>("idle");
  const [, forceRender] = useReducer((n) => n + 1, 0);
  const setSaveStatus = useCallback((s: SaveStatus) => {
    saveStatusRef.current = s;
    forceRender();
  }, []);

  // ترطيب الحالة من التخزين المحلي
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) dispatch({ type: "hydrate", fields: JSON.parse(raw) });
    } catch {
      /* تجاهل */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // حفظ تلقائي مع تأخير بسيط
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setSaveStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(state.present));
        setSaveStatus("saved");
      } catch {
        /* تجاهل */
      }
    }, 600);
    return () => timer.current && clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.present, storageKey]);

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
      }));
      dispatch({ type: "set", fields: [...state.present, ...clones] });
    },
    [state.present],
  );

  return useMemo(
    () => ({
      fields: state.present,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      saveStatus: saveStatusRef.current,
      addField,
      updateField,
      removeField,
      applyToPages,
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
      clear: () => dispatch({ type: "set", fields: [] }),
    }),
    [state, addField, updateField, removeField, applyToPages],
  );
}

export type EditorStore = ReturnType<typeof useEditorStore>;
