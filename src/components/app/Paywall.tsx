import { Clock3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  used?: number;
  limit?: number;
}

/**
 * The current release has no purchase flow. Keep quota exhaustion truthful:
 * do not advertise a premium plan until billing + receipt verification exist.
 */
export function Paywall({ open, onClose, used = 3, limit = 3 }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-primary" /> انتهت حصتك اليومية
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm leading-relaxed text-muted-foreground">
          استخدمت {used} من {limit} صفحات متاحة اليوم. تتجدد الحصة تلقائيًا في اليوم التالي.
        </p>

        <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          لا توجد مشتريات أو اشتراكات مدفوعة داخل الإصدار الحالي من وقِّع.
        </div>

        <Button className="w-full" onClick={onClose}>
          حسنًا
        </Button>
      </DialogContent>
    </Dialog>
  );
}
