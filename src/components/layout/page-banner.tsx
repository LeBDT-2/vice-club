import type { ReactNode } from "react";
import { BannerScene } from "@/components/art/scenes";

export function PageBanner({ title, intro, variant = "players", children }: { title: string; intro?: ReactNode; variant?: "players" | "garage" | "games"; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden border-b border-line">
      <BannerScene variant={variant} className="absolute inset-0 size-full" />
      <div className="container-site relative py-10 sm:py-14">
        <h1 className="display max-w-2xl text-4xl sm:text-5xl">{title}</h1>
        {intro && <div className="mt-3 max-w-xl text-[1.05rem] text-ink/85">{intro}</div>}
        {children}
      </div>
    </div>
  );
}
