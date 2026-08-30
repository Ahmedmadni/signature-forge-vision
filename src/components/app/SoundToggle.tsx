import { useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, setSoundEnabled, subscribeSound, playSfx } from "@/lib/sfx";

export function SoundToggle() {
  const enabled = useSyncExternalStore(
    (cb) => subscribeSound(() => cb()),
    () => isSoundEnabled(),
    () => true,
  );

  return (
    <button
      type="button"
      aria-label={enabled ? "كتم الأصوات" : "تشغيل الأصوات"}
      onClick={() => {
        const next = !enabled;
        setSoundEnabled(next);
        if (next) playSfx("tap");
      }}
      className="press grid h-9 w-9 place-items-center rounded-xl border border-border/70 bg-card/60 text-muted-foreground hover:text-primary"
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
