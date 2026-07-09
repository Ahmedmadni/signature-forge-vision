import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  RotateCw,
  RotateCcw,
  Trash2,
  Copy,
  FilePlus2,
  FileOutput,
  Merge,
  Scissors,
  Undo2,
  Redo2,
  Save,
  LayoutGrid,
  List,
  CheckSquare,
  Loader2,
  MousePointerClick,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageThumb } from "./PageThumb";
import {
  usePageOrganizer,
  type SplitMode,
} from "@/lib/editor/use-page-organizer";
import { cn } from "@/lib/utils";

interface Props {
  documentId: string;
  title: string;
  src: string;
}

const saveLabels: Record<string, string> = {
  loading: "جارٍ التحميل…",
  saving: "جارٍ الحفظ…",
  saved: "محفوظ",
  error: "خطأ في الحفظ",
  idle: "",
};

export function PageOrganizer({ documentId, title, src }: Props) {
  const store = usePageOrganizer(documentId, title, src);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<SplitMode>("count");
  const [splitParam, setSplitParam] = useState("1");
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragId = useRef<string | null>(null);

  const thumbW = store.view === "grid" ? 150 : 90;

  const doSave = async (op: string) => {
    try {
      await store.save(op);
      toast.success("تم حفظ المراجعة", { description: op });
    } catch {
      toast.error("تعذّر حفظ المراجعة");
    }
  };

  const handleMerge = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (f.type === "application/pdf" || f.name.endsWith(".pdf")) {
        await store.addFile(f);
      }
    }
    toast.success("تم دمج الملفات — لا تنسَ الحفظ");
  };

  const handleExtract = async () => {
    const doc = await store.extractSelected();
    if (doc) {
      toast.success("تم إنشاء مستند مستخرَج", {
        action: {
          label: "فتح",
          onClick: () => navigate({ to: "/editor/$docId", params: { docId: doc.id } }),
        },
      });
    }
  };

  const handleSplit = async () => {
    setSplitOpen(false);
    const res = await store.splitDocument(splitMode, splitParam);
    if (res) toast.success(`تم التقسيم إلى ${res.length} مستند`);
  };

  const selectedCount = store.selected.size;

  if (store.loadError) {
    return (
      <div className="grid h-[60vh] place-items-center text-center text-muted-foreground">
        <div>
          <p className="font-medium">تعذّر تحميل المستند</p>
          <p className="text-sm">{store.loadError}</p>
        </div>
      </div>
    );
  }

  const btn = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    opts?: { disabled?: boolean },
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          disabled={opts?.disabled}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex flex-col gap-3">
      {/* شريط الأدوات */}
      <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-card/60 p-2">
        {btn("تراجع", <Undo2 className="h-4 w-4" />, store.undo, { disabled: !store.canUndo })}
        {btn("إعادة", <Redo2 className="h-4 w-4" />, store.redo, { disabled: !store.canRedo })}
        <Separator orientation="vertical" className="mx-1 h-6" />
        {btn("تدوير يمين", <RotateCw className="h-4 w-4" />, () => store.rotateSelected(90), { disabled: !selectedCount })}
        {btn("تدوير يسار", <RotateCcw className="h-4 w-4" />, () => store.rotateSelected(-90), { disabled: !selectedCount })}
        {btn("تكرار", <Copy className="h-4 w-4" />, store.duplicateSelected, { disabled: !selectedCount })}
        {btn("حذف", <Trash2 className="h-4 w-4" />, store.deleteSelected, { disabled: !selectedCount })}
        {btn("صفحة فارغة", <FilePlus2 className="h-4 w-4" />, store.insertBlank)}
        {btn("استخراج", <FileOutput className="h-4 w-4" />, handleExtract, { disabled: !selectedCount })}
        <Separator orientation="vertical" className="mx-1 h-6" />
        {btn("دمج ملفات", <Merge className="h-4 w-4" />, () => fileInputRef.current?.click())}
        {btn("تقسيم", <Scissors className="h-4 w-4" />, () => setSplitOpen(true))}
        <Separator orientation="vertical" className="mx-1 h-6" />
        {btn("تحديد الكل", <CheckSquare className="h-4 w-4" />, store.selectAll)}
        {btn(
          store.view === "grid" ? "عرض قائمة" : "عرض شبكي",
          store.view === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />,
          () => store.setView(store.view === "grid" ? "list" : "grid"),
        )}

        <div className="ms-auto flex items-center gap-3 px-2">
          <span className="text-xs text-muted-foreground">
            {store.pages.length} صفحة
            {selectedCount ? ` · ${selectedCount} محدَّدة` : ""}
          </span>
          <span
            className={cn(
              "text-xs",
              store.saveState === "error" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {saveLabels[store.saveState]}
          </span>
          <Button
            size="sm"
            className="bg-gradient-brand text-primary-foreground shadow-glow"
            disabled={store.saveState === "saving" || store.saveState === "loading"}
            onClick={() => doSave("تعديل الصفحات")}
          >
            {store.saveState === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            حفظ المراجعة
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleMerge(e.target.files)}
      />

      {/* الحالة أثناء المعالجة */}
      <AnimatePresence>
        {store.busy && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-xl border border-border bg-primary/5 px-4 py-2 text-sm text-primary"
          >
            <Loader2 className="h-4 w-4 animate-spin" /> {store.busy}
          </motion.div>
        )}
      </AnimatePresence>

      {/* الشبكة/القائمة */}
      {store.saveState === "loading" && !store.pages.length ? (
        <div className="grid h-[50vh] place-items-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div
          className={cn(
            "min-h-[50vh] rounded-2xl border border-border bg-muted/30 p-4",
            store.view === "grid"
              ? "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4"
              : "flex flex-col gap-2",
          )}
          onClick={(e) => {
            if (e.target === e.currentTarget) store.clearSelection();
          }}
        >
          {store.pages.map((page, index) => {
            const isSel = store.selected.has(page.uid);
            return (
              <ContextMenu key={page.uid}>
                <ContextMenuTrigger asChild>
                  <motion.div
                    layout
                    draggable
                    onDragStart={() => (dragId.current = page.uid)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverIdx(index);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragId.current) store.reorder(dragId.current, index);
                      dragId.current = null;
                      setDragOverIdx(null);
                    }}
                    onDragEnd={() => {
                      dragId.current = null;
                      setDragOverIdx(null);
                    }}
                    onClick={(e) =>
                      store.selectPage(
                        page.uid,
                        e.shiftKey ? "range" : e.ctrlKey || e.metaKey ? "toggle" : "single",
                      )
                    }
                    className={cn(
                      "group relative cursor-pointer rounded-xl border-2 bg-card p-2 transition-colors",
                      isSel ? "border-primary shadow-glow" : "border-transparent hover:border-border",
                      dragOverIdx === index && "ring-2 ring-primary/50",
                      store.view === "list" && "flex items-center gap-3",
                    )}
                  >
                    <div className={cn("grid place-items-center", store.view === "list" && "shrink-0")}>
                      <PageThumb
                        page={page}
                        index={index}
                        width={thumbW}
                        getPdfjsPage={store.getPdfjsPage}
                      />
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-2",
                        store.view === "grid"
                          ? "mt-2 justify-between"
                          : "flex-1 justify-between",
                      )}
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        صفحة {index + 1}
                        {page.blank && " (فارغة)"}
                      </span>
                      {isSel && (
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">
                          ✓
                        </span>
                      )}
                    </div>
                  </motion.div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem
                    onClick={() => {
                      if (!isSel) store.selectPage(page.uid, "single");
                      store.rotateSelected(90);
                    }}
                  >
                    <RotateCw className="h-4 w-4" /> تدوير 90°
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => {
                      if (!isSel) store.selectPage(page.uid, "single");
                      store.rotateSelected(180);
                    }}
                  >
                    <RotateCw className="h-4 w-4" /> تدوير 180°
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => {
                      if (!isSel) store.selectPage(page.uid, "single");
                      store.duplicateSelected();
                    }}
                  >
                    <Copy className="h-4 w-4" /> تكرار
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => {
                      if (!isSel) store.selectPage(page.uid, "single");
                      handleExtract();
                    }}
                  >
                    <FileOutput className="h-4 w-4" /> استخراج
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="text-destructive"
                    onClick={() => {
                      if (!isSel) store.selectPage(page.uid, "single");
                      store.deleteSelected();
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> حذف
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      )}

      {!store.pages.length && store.saveState !== "loading" && (
        <div className="grid place-items-center gap-2 py-10 text-center text-muted-foreground">
          <MousePointerClick className="h-8 w-8 opacity-40" />
          <p>لا توجد صفحات</p>
        </div>
      )}

      {/* حوار التقسيم */}
      <Dialog open={splitOpen} onOpenChange={setSplitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تقسيم المستند</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={splitMode} onValueChange={(v) => setSplitMode(v as SplitMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="count">حسب عدد الصفحات</SelectItem>
                <SelectItem value="ranges">حسب النطاقات</SelectItem>
                <SelectItem value="individual">صفحات مفردة</SelectItem>
                <SelectItem value="size">حسب الحجم (م.ب)</SelectItem>
              </SelectContent>
            </Select>
            {splitMode !== "individual" && (
              <Input
                value={splitParam}
                onChange={(e) => setSplitParam(e.target.value)}
                placeholder={
                  splitMode === "count"
                    ? "عدد الصفحات لكل ملف، مثال: 5"
                    : splitMode === "ranges"
                      ? "نطاقات، مثال: 1-3,4-6,7"
                      : "الحجم بالميغابايت، مثال: 2"
                }
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSplit}>تقسيم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
