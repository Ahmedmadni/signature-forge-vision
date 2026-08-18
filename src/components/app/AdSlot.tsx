import { ADS_ENABLED, AD_UNITS, type AdSlotName } from "@/lib/ads";

interface Props {
  slot?: AdSlotName;
  className?: string;
  /** إظهار مساحة محجوزة أثناء التطوير قبل ربط حساب الإعلانات */
  showPlaceholder?: boolean;
}

/**
 * مساحة إعلانية محجوزة. عند تفعيل الإعلانات يُعرض الإعلان في هذا الحاوي،
 * وقبل ذلك يبقى المكان محجوزًا حتى لا يتغيّر التصميم عند التفعيل.
 */
export function AdSlot({ slot = "banner", className = "", showPlaceholder = false }: Props) {
  const active = ADS_ENABLED && Boolean(AD_UNITS[slot]);

  if (!active && !showPlaceholder) return null;

  return (
    <div
      data-ad-slot={slot}
      className={`grid h-[60px] w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40 ${className}`}
    >
      {!active && (
        <span className="text-[11px] text-muted-foreground">مساحة إعلانية</span>
      )}
    </div>
  );
}
