import type { ReactNode } from "react";
import { Photo, PhotoCredit } from "@/components/ambiance/photo";
import type { PhotoKey } from "@/config/photos";

const BANNER_PHOTO: Record<"players" | "garage" | "games", PhotoKey> = {
  players: "oceanDriveNeons",
  garage: "countachNeons",
  games: "oceanDriveBleu",
};

export function PageBanner({ title, intro, variant = "players", children }: { title: string; intro?: ReactNode; variant?: "players" | "garage" | "games"; children?: ReactNode }) {
  return (
    <div className="scanlines relative isolate overflow-hidden border-b border-line">
      <Photo name={BANNER_PHOTO[variant]} priority imgClassName="kenburns-slow" position="center 60%" />
      <div className="absolute inset-0 bg-gradient-to-r from-night via-night/80 to-night/25" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-night/80 to-transparent" aria-hidden="true" />
      <PhotoCredit name={BANNER_PHOTO[variant]} className="absolute bottom-2 right-2 z-10 hidden sm:block" />
      <span className="neon-sweep z-10" aria-hidden="true" />
      <div className="container-site relative z-10 py-12 sm:py-20">
        <h1 className="rise display max-w-2xl text-4xl sm:text-6xl">{title}</h1>
        {intro && <div className="mt-3 max-w-xl text-[1.05rem] text-ink/85">{intro}</div>}
        {children}
      </div>
    </div>
  );
}
