import { Bus } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-xl bg-gold text-accent-foreground shadow-card",
        className,
      )}
    >
      <Bus className="size-5" strokeWidth={2.4} />
    </span>
  );
}

export function BrandWordmark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-base font-extrabold tracking-tight",
            inverted ? "text-surface-foreground" : "text-foreground",
          )}
        >
          KATISHA BUS
        </span>
        <span
          className={cn(
            "text-[10px] font-medium tracking-[0.16em] uppercase",
            inverted ? "text-surface-foreground/70" : "text-muted-foreground",
          )}
        >
          Rwanda
        </span>
      </span>
    </span>
  );
}
