"use client";

/* eslint-disable @next/next/no-img-element -- vignettes du catalogue (Storage public) */
import { useActionState, useMemo, useRef, useState } from "react";
import type { CatalogVehicle } from "@/server/data/garage";
import { saveGarageAction } from "@/server/actions/garage";
import { Button } from "@/components/ui/button";
import { FieldError, FormMessage, TextArea, TextField } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { DemoBadge } from "@/components/ui/notice";
import { formatVc } from "@/lib/utils/format";

export function BudgetGauge({ total, budget }: { total: number; budget: number }) {
  const ratio = Math.min(total / budget, 1);
  const over = total > budget;
  const r = 52;
  const len = Math.PI * r;
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-panel/90 p-4 text-center">
      <p className="text-sm font-semibold text-muted">Budget fictif</p>
      <svg viewBox="0 0 130 72" className="mx-auto mt-1 w-40" aria-hidden="true">
        <path d="M13 66 A 52 52 0 0 1 117 66" fill="none" stroke="#2b3354" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M13 66 A 52 52 0 0 1 117 66"
          fill="none"
          stroke={over ? "#ff6b6b" : "#2de2d0"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${len * ratio} ${len}`}
        />
      </svg>
      <p className={`-mt-3 text-xl font-extrabold tabular-nums ${over ? "text-danger" : "text-cyan"}`}>{formatVc(total)}</p>
      <p className="text-xs text-muted">sur {formatVc(budget)}</p>
      <p className="sr-only" aria-live="polite">
        {over ? `Budget dépassé de ${formatVc(total - budget)}.` : `Reste ${formatVc(budget - total)}.`}
      </p>
      {over && <p className="mt-1 text-xs font-semibold text-danger">Dépassé de {formatVc(total - budget)}</p>}
    </div>
  );
}

export function VehicleTile({ v, categoryLabel, action }: { v: CatalogVehicle; categoryLabel: string; action?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel">
      <div className="relative aspect-[16/10] bg-deep">
        {v.imageUrl ? (
          <img src={v.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-xs text-faint">Image à venir</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="font-bold leading-tight">{v.name}</p>
        <p className="text-xs text-muted">
          {[v.manufacturer, categoryLabel].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-1 text-sm font-semibold text-gold">{formatVc(v.cost)}</p>
        {action && <div className="mt-auto pt-3">{action}</div>}
      </div>
    </div>
  );
}

type Initial = { id: string | null; name: string; description: string; visibility: "private" | "public"; vehicleIds: string[] };

export function GarageEditor({
  catalog,
  categories,
  budget,
  maxVehicles,
  initial,
}: {
  catalog: CatalogVehicle[];
  categories: Record<string, string>;
  budget: number;
  maxVehicles: number;
  initial: Initial;
}) {
  const [state, action] = useActionState(saveGarageAction, null);
  const byId = useMemo(() => new Map(catalog.map((v) => [v.id, v])), [catalog]);
  const [selected, setSelected] = useState<string[]>(initial.vehicleIds.filter((id) => byId.has(id)));
  const [q, setQ] = useState("");
  const [game, setGame] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"name" | "cost_asc" | "cost_desc">("name");
  const [affordable, setAffordable] = useState(false);
  const catalogRef = useRef<HTMLInputElement>(null);

  const chosen = selected.map((id) => byId.get(id)!).filter(Boolean);
  const total = chosen.reduce((a, v) => a + v.cost, 0);
  const remaining = budget - total;
  const full = chosen.length >= maxVehicles;
  const games = [...new Map(catalog.map((v) => [v.gameId, v.gameName])).entries()];
  const hasDemo = catalog.some((v) => v.isDemo);

  const filtered = catalog
    .filter((v) => (!game || v.gameId === game) && (!category || v.category === category))
    .filter((v) => !q || `${v.name} ${v.manufacturer}`.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((v) => !affordable || v.cost <= remaining || selected.includes(v.id))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name, "fr") : sort === "cost_asc" ? a.cost - b.cost : b.cost - a.cost));

  const add = (id: string) => setSelected((s) => (s.includes(id) || s.length >= maxVehicles ? s : [...s, id]));
  const remove = (id: string) => setSelected((s) => s.filter((x) => x !== id));

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="garage_id" value={initial.id ?? ""} />
      {selected.map((id) => (
        <input key={id} type="hidden" name="vehicle_ids" value={id} />
      ))}

      <section aria-labelledby="slots-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="slots-title" className="display text-2xl">
              Ta sélection
            </h2>
            <p className="mt-1 text-sm text-muted">
              {chosen.length} / {maxVehicles} véhicules. Coûts fictifs propres au mini-jeu, sans lien avec les prix du jeu.
            </p>
          </div>
          <div className="w-full sm:w-56">
            <BudgetGauge total={total} budget={budget} />
          </div>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: maxVehicles }, (_, i) => {
            const v = chosen[i];
            return (
              <li key={v?.id ?? `empty-${i}`}>
                {v ? (
                  <VehicleTile
                    v={v}
                    categoryLabel={categories[v.category] ?? v.category}
                    action={
                      <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => remove(v.id)} aria-label={`Retirer ${v.name}`}>
                        Retirer
                      </Button>
                    }
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => catalogRef.current?.focus()}
                    className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line bg-panel/40 text-muted transition-colors hover:border-cyan hover:text-ink sm:aspect-auto sm:h-full sm:min-h-56"
                  >
                    <span aria-hidden="true" className="text-3xl leading-none">
                      +
                    </span>
                    <span className="text-sm font-semibold">Ajouter un véhicule</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <FieldError id="vehicle-err" errors={state?.fieldErrors?.vehicle_ids} />
      </section>

      <section aria-labelledby="infos-title" className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-panel p-5 lg:grid-cols-2">
        <h2 id="infos-title" className="sr-only">
          Informations du garage
        </h2>
        <div className="space-y-4">
          <TextField label="Nom du garage" name="name" defaultValue={initial.name} required maxLength={60} errors={state?.fieldErrors?.name} />
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Visibilité</legend>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  ["private", "Privé", "Visible par toi seul."],
                  ["public", "Public", "Visible sur ton profil et par lien."],
                ] as const
              ).map(([value, label, hint]) => (
                <label key={value} className="flex min-w-44 flex-1 cursor-pointer items-start gap-2 rounded-xl border border-line bg-deep p-3 has-[:checked]:border-cyan">
                  <input type="radio" name="visibility" value={value} defaultChecked={initial.visibility === value} className="mt-1 accent-[#2de2d0]" />
                  <span>
                    <span className="block font-semibold">{label}</span>
                    <span className="block text-xs text-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <TextArea label="Description (facultatif)" name="description" defaultValue={initial.description} maxLength={500} errors={state?.fieldErrors?.description} />
        <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <SubmitButton size="lg" disabled={total > budget}>
            Enregistrer le garage
          </SubmitButton>
          {total > budget && <p className="text-sm text-danger">Retire un véhicule pour repasser sous le budget.</p>}
          <FormMessage state={state} />
        </div>
      </section>

      <section aria-labelledby="catalog-title">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="catalog-title" className="display text-2xl">
            Catalogue
          </h2>
          {hasDemo && <DemoBadge />}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-[var(--radius-card)] border border-line bg-panel p-4 sm:grid-cols-3 lg:grid-cols-6 lg:items-end">
          <div className="col-span-2">
            <label htmlFor="cat-q" className="mb-1 block text-xs font-semibold text-muted">
              Rechercher
            </label>
            <input ref={catalogRef} id="cat-q" type="search" className="field" placeholder="Nom ou constructeur" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <label htmlFor="cat-game" className="mb-1 block text-xs font-semibold text-muted">
              Jeu
            </label>
            <select id="cat-game" className="field" value={game} onChange={(e) => setGame(e.target.value)}>
              <option value="">Tous</option>
              {games.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cat-cat" className="mb-1 block text-xs font-semibold text-muted">
              Catégorie
            </label>
            <select id="cat-cat" className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Toutes</option>
              {Object.entries(categories).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cat-sort" className="mb-1 block text-xs font-semibold text-muted">
              Trier par
            </label>
            <select id="cat-sort" className="field" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="name">Nom</option>
              <option value="cost_asc">Coût croissant</option>
              <option value="cost_desc">Coût décroissant</option>
            </select>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={affordable} onChange={(e) => setAffordable(e.target.checked)} className="size-4 accent-[#2de2d0]" />
            Dans mon budget
          </label>
        </div>
        <p className="mt-3 text-sm text-muted" aria-live="polite">
          {filtered.length} véhicule{filtered.length > 1 ? "s" : ""}
        </p>
        {filtered.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line p-6 text-center text-muted">Aucun véhicule ne correspond à ces filtres.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {filtered.map((v) => {
              const isIn = selected.includes(v.id);
              const tooExpensive = !isIn && v.cost > remaining;
              return (
                <li key={v.id}>
                  <VehicleTile
                    v={v}
                    categoryLabel={categories[v.category] ?? v.category}
                    action={
                      isIn ? (
                        <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => remove(v.id)} aria-label={`Retirer ${v.name}`}>
                          Retirer du garage
                        </Button>
                      ) : (
                        <>
                          <Button type="button" size="sm" className="w-full" disabled={full || tooExpensive} onClick={() => add(v.id)} aria-label={`Ajouter ${v.name}`}>
                            Ajouter
                          </Button>
                          {(full || tooExpensive) && <p className="mt-1 text-xs text-faint">{full ? "Garage complet" : "Hors budget"}</p>}
                        </>
                      )
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </form>
  );
}
