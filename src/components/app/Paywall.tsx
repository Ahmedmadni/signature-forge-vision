import { Crown, Check, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  used?: number;
  limit?: number;
}

const perks = [
  "صفحات غير محدودة يوميًا",
  "توقيعات متعددة محفوظة",
  "بدون علامة مائية",
  "دعم أولوية",
];

export function Paywall({ open, onClose, used = 3, limit = 3 }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" /> انتهت حصتك اليومية
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          استخدمت {used} من {limit} صفحات مجانية اليوم. ارتقِ إلى الخطة المميزة للتوقيع بلا حدود، أو
          عد غدًا لتجديد حصتك المجانية.
        </p>

        <ul className="space-y-2 rounded-2xl border border-border bg-muted/40 p-4">
          {perks.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" /> {p}
            </li>
          ))}
        </ul>

        <Button
          className="w-full bg-gradient-brand text-primary-foreground shadow-glow"
          onClick={onClose}
        >
          <Sparkles className="h-4 w-4" /> الترقية قريبًا
        </Button>
        <Button variant="ghost" className="w-full" onClick={onClose}>
          لاحقًا
        </Button>
      </DialogContent>
    </Dialog>
  );
}
