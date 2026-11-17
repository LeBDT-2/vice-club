import type { ReactNode } from "react";
import { Photo, PhotoCredit } from "@/components/ambiance/photo";

export function AuthShell({ title, intro, children, aside }: { title: string; intro?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-80 overflow-hidden lg:h-full" aria-hidden="true">
        <Photo name="skateurPalmiers" priority className="lg:left-1/3" position="center 40%" />
        <div className="absolute inset-0 bg-gradient-to-b from-night/30 via-night/60 to-night lg:bg-gradient-to-r lg:from-night lg:via-night/70 lg:to-night/20" />
      </div>
      <div className="container-site relative grid gap-8 pb-10 pt-14 lg:grid-cols-[minmax(0,30rem)_1fr]">
        <section className="glass rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-lift)] sm:p-8">
          <h1 className="display text-3xl sm:text-4xl">{title}</h1>
          {intro && <div className="mt-3 text-muted">{intro}</div>}
          <div className="mt-6">{children}</div>
        </section>
        {aside && <aside className="hidden self-end lg:block">{aside}</aside>}
        <PhotoCredit name="skateurPalmiers" className="absolute bottom-2 right-4 hidden lg:block" />
      </div>
    </div>
  );
}
