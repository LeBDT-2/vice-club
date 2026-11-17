import type { Metadata } from "next";
import Link from "next/link";
import { Tag, EmptyState } from "@/components/ui/notice";
import { buttonClass } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/viewer";
import { KIND_LABEL, KIND_TO_SLUG } from "@/lib/games/catalog";
import { formatDateFr, formatScore } from "@/lib/utils/format";
import { myBestScores, myResults } from "@/server/data/games";

export const metadata: Metadata = { title: "Mes résultats", robots: { index: false } };

export default async function MyResultsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireUser("/mes-resultats");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [results, best] = await Promise.all([myResults(31, (page - 1) * 30), myBestScores()]);
  const hasMore = results.length > 30;
  return (
    <div className="container-site py-8">
      <h1 className="display text-4xl">Mes résultats</h1>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map((k) => (
          <li key={k} className="rounded-xl border border-line bg-panel p-4">
            <p className="text-sm text-muted">{KIND_LABEL[k]}</p>
            <p className="mt-1 text-2xl font-extrabold">{best[k] !== undefined ? formatScore(best[k]!) : "—"}</p>
            <p className="text-xs text-faint">meilleur score</p>
          </li>
        ))}
      </ul>
      {results.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Aucune partie enregistrée" action={<Link href="/mini-jeux" className={buttonClass("primary")}>Jouer</Link>}>
            Tes parties terminées avec ton compte apparaîtront ici.
          </EmptyState>
        </div>
      ) : (
        <ol className="mt-8 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel">
          {results.slice(0, 30).map((r) => (
            <li key={r.sessionId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <Link href={`/mini-jeux/${KIND_TO_SLUG[r.kind]}/partie/${r.sessionId}`} className="font-semibold hover:underline">
                  {KIND_LABEL[r.kind]}
                </Link>
                <p className="text-xs text-muted">{formatDateFr(r.completedAt)}</p>
              </div>
              {r.mode === "daily" ? <Tag tone={r.ranked ? "pink" : "default"}>{r.ranked ? "Défi classé" : "Défi non classé"}</Tag> : <Tag>Entraînement</Tag>}
              <span className="w-32 text-right font-bold tabular-nums">
                {formatScore(r.score)}
                {r.maxScore ? <span className="font-normal text-muted"> / {formatScore(r.maxScore)}</span> : null}
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 flex gap-3">
        {page > 1 && <Link href={`/mes-resultats?page=${page - 1}`} className={buttonClass("secondary", "sm")}>Plus récents</Link>}
        {hasMore && <Link href={`/mes-resultats?page=${page + 1}`} className={buttonClass("secondary", "sm")}>Plus anciens</Link>}
      </div>
    </div>
  );
}
