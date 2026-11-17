import type { Metadata } from "next";
import Link from "next/link";
import { PageBanner } from "@/components/layout/page-banner";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/notice";
import { getViewer } from "@/lib/auth/viewer";
import { KIND_LABEL } from "@/lib/games/catalog";
import type { GameKind } from "@/lib/games/scoring";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import { formatScore } from "@/lib/utils/format";
import { formatParisDate, monthBounds, parisDate } from "@/lib/utils/paris-time";

export const metadata: Metadata = {
  title: "Classements",
  description: "Classements du défi du jour, du mois et général. Seules les parties classées du défi du jour comptent.",
};

type Row = { rank: number; user_id: string; username: string; avatar_path: string | null; value: string; detail: string };

function duration(ms: number) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
}

export default async function LeaderboardsPage({ searchParams }: { searchParams: Promise<{ vue?: string; date?: string }> }) {
  const sp = await searchParams;
  const view = sp.vue === "mois" || sp.vue === "general" ? sp.vue : "jour";
  const today = parisDate();
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) && sp.date <= today ? sp.date : today;
  const supabase = await createClient();
  const viewer = await getViewer();

  let rows: Row[] = [];
  let challengeKind: GameKind | null = null;
  if (view === "jour") {
    const [{ data }, { data: ch }] = await Promise.all([
      supabase.rpc("leaderboard_daily", { p_date: date, p_limit: 100 }),
      supabase.from("daily_challenges").select("game_kind").eq("challenge_date", date).eq("status", "published").maybeSingle(),
    ]);
    challengeKind = (ch?.game_kind as GameKind) ?? null;
    rows = (data ?? []).map((r) => ({
      rank: Number(r.rank),
      user_id: r.user_id,
      username: r.username,
      avatar_path: r.avatar_path,
      value: `${formatScore(r.score)}${r.max_score ? ` / ${formatScore(r.max_score)}` : ""}`,
      detail: duration(r.duration_ms),
    }));
  } else {
    const { from, to } = view === "mois" ? monthBounds(today) : { from: "2020-01-01", to: today };
    const { data } = await supabase.rpc("leaderboard_period", { p_from: from, p_to: to, p_limit: 100 });
    rows = (data ?? []).map((r) => ({
      rank: Number(r.rank),
      user_id: r.user_id,
      username: r.username,
      avatar_path: r.avatar_path,
      value: `${formatScore(Number(r.total_points))} pts`,
      detail: `${r.participations} défi${Number(r.participations) > 1 ? "s" : ""}`,
    }));
  }

  const tabs = [
    { id: "jour", label: "Défi du jour", href: "/classements" },
    { id: "mois", label: "Ce mois-ci", href: "/classements?vue=mois" },
    { id: "general", label: "Général", href: "/classements?vue=general" },
  ];
  const rules =
    view === "jour"
      ? "Seul le premier essai classé de chaque compte compte. Départage : score, puis durée de la partie la plus courte."
      : "Chaque défi classé rapporte jusqu'à 1 000 points (score obtenu divisé par le score maximum, multiplié par 1 000). Départage : nombre de défis joués, puis meilleur défi.";

  return (
    <>
      <PageBanner variant="games" title="Classements" intro="Uniquement les défis du jour joués avec un compte. Les récompenses sont des badges purement visuels." />
      <div className="container-site py-8">
        <nav aria-label="Type de classement" className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              aria-current={view === t.id ? "page" : undefined}
              className={cn("rounded-full border px-4 py-2 text-sm font-semibold", view === t.id ? "border-cyan bg-cyan/10 text-cyan" : "border-line text-muted hover:text-ink")}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold first-letter:uppercase">
            {view === "jour" ? `${formatParisDate(date)}${challengeKind ? ` · ${KIND_LABEL[challengeKind]}` : ""}` : view === "mois" ? new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date()) : "Depuis l'ouverture"}
          </h2>
          {view === "jour" && date !== today && (
            <Link href="/classements" className="text-sm text-cyan underline">
              Revenir au défi d&apos;aujourd&apos;hui
            </Link>
          )}
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted">{rules}</p>

        {rows.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="Personne au classement pour l'instant">
              {view === "jour" ? "Sois le premier à terminer le défi du jour avec un compte." : "Les points arrivent avec les premiers défis du jour classés."}
            </EmptyState>
          </div>
        ) : (
          <ol className="mt-6 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel">
            {rows.map((r) => (
              <li key={r.user_id} className={cn("flex items-center gap-3 px-4 py-3", r.user_id === viewer?.id && "bg-cyan/5")}>
                <span className={cn("w-8 text-center text-lg font-extrabold tabular-nums", r.rank === 1 ? "text-gold" : r.rank <= 3 ? "text-pink-soft" : "text-muted")}>
                  {r.rank}
                </span>
                <Avatar username={r.username} path={r.avatar_path} size={36} />
                <Link href={`/joueurs/${r.username}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
                  {r.username}
                  {r.user_id === viewer?.id && <span className="ml-2 text-xs font-normal text-cyan">toi</span>}
                </Link>
                <span className="text-right">
                  <span className="block font-bold tabular-nums">{r.value}</span>
                  <span className="block text-xs text-muted">{r.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
