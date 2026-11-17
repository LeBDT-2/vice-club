/* eslint-disable @next/next/no-img-element -- vignettes publiques */
import Link from "next/link";
import type { GarageSummary } from "@/server/data/garage";
import { Tag } from "@/components/ui/notice";
import { formatVc } from "@/lib/utils/format";

/** Carte compacte d'un garage : mosaïque des véhicules + total. */
export function GarageCard({ garage, href, showVisibility = false }: { garage: GarageSummary; href: string; showVisibility?: boolean }) {
  return (
    <Link href={href} className="group block overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel transition-colors hover:border-pink">
      <div className="grid h-28 grid-cols-5 gap-px bg-line">
        {Array.from({ length: 5 }, (_, i) => {
          const v = garage.vehicles[i];
          return (
            <div key={i} className="bg-deep">
              {v?.imageUrl ? <img src={v.imageUrl} alt="" loading="lazy" className="size-full object-cover" /> : null}
            </div>
          );
        })}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold group-hover:text-white">{garage.name}</p>
          {showVisibility && <Tag tone={garage.visibility === "public" ? "cyan" : "default"}>{garage.visibility === "public" ? "Public" : "Privé"}</Tag>}
        </div>
        <p className="mt-1 text-sm text-muted">
          {garage.vehicles.length} véhicule{garage.vehicles.length > 1 ? "s" : ""} · {formatVc(garage.total)}
        </p>
        {garage.hidden && <p className="mt-1 text-xs text-danger">Masqué par la modération</p>}
      </div>
    </Link>
  );
}
