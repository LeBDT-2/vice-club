import type { ReactNode } from "react";
import { BannerScene } from "@/components/art/scenes";

export function AuthShell({ title, intro, children, aside }: { title: string; intro?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-56 overflow-hidden" aria-hidden="true">
        <BannerScene variant="games" className="size-full opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-night" />
      </div>
      <div className="container-site relative grid gap-8 pb-10 pt-14 lg:grid-cols-[minmax(0,30rem)_1fr]">
        <section className="rounded-[var(--radius-card)] border border-line bg-panel/95 p-6 shadow-[var(--shadow-lift)] sm:p-8">
          <h1 className="display text-3xl sm:text-4xl">{title}</h1>
          {intro && <div className="mt-3 text-muted">{intro}</div>}
          <div className="mt-6">{children}</div>
        </section>
        {aside && <aside className="hidden self-end lg:block">{aside}</aside>}
      </div>
    </div>
  );
}
