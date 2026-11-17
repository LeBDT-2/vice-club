import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "info" | "success" | "warning" | "danger";
const tones: Record<Tone, { cls: string; icon: string; label: string }> = {
  info: { cls: "border-cyan/40 bg-cyan/5", icon: "ℹ", label: "Information" },
  success: { cls: "border-success/50 bg-success/10", icon: "✓", label: "Succès" },
  warning: { cls: "border-gold/50 bg-gold/10", icon: "!", label: "Attention" },
  danger: { cls: "border-danger/60 bg-danger/10", icon: "✕", label: "Erreur" },
};

export function Notice({ tone = "info", title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  const t = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-4 text-sm", t.cls, className)}>
      <span aria-hidden="true" className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">
        {t.icon}
      </span>
      <div>
        <span className="sr-only">{t.label} : </span>
        {title && <p className="font-semibold text-ink">{title}</p>}
        {children && <div className="text-muted [&_a]:text-cyan [&_a]:underline">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action, art }: { title: string; children?: ReactNode; action?: ReactNode; art?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line bg-panel/40 px-6 py-10 text-center">
      {art ?? (
        <svg viewBox="0 0 64 64" className="mb-4 size-14" aria-hidden="true">
          <circle cx="32" cy="36" r="18" fill="#ff9a4d" opacity="0.8" />
          <rect x="10" y="40" width="44" height="3" fill="#ff3e8a" />
          <rect x="14" y="46" width="36" height="2" fill="#ff3e8a" opacity="0.6" />
          <path d="M44 54 C 46 40, 47 30, 50 18 L52 18 C 50 30, 49 40, 47 54 Z" fill="#2de2d0" />
          <path d="M51 18 C 44 14, 38 15, 33 20 C 40 17, 46 17, 51 19 Z M51 18 C 56 12, 62 12, 64 16 C 59 14, 55 15, 52 19 Z" fill="#2de2d0" />
        </svg>
      )}
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <div className="mt-2 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Tag({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "pink" | "cyan" | "gold" }) {
  const cls = {
    default: "border-line bg-panel-2 text-muted",
    pink: "border-pink/40 bg-pink/10 text-pink-soft",
    cyan: "border-cyan/40 bg-cyan/10 text-cyan",
    gold: "border-gold/40 bg-gold/10 text-gold",
  }[tone];
  return <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", cls)}>{children}</span>;
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded-md border border-gold/60 bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">
      Contenu de démonstration
    </span>
  );
}
