import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/notice";
import { LANGUAGES, PLAY_STYLES } from "@/lib/validation/profile";
import type { PlayerCardData } from "@/server/data/players";
import { buttonClass } from "@/components/ui/button";

const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export function AvailabilityPill({ availability, lastSeenAt }: { availability: PlayerCardData["availability"]; lastSeenAt: string | null }) {
  const now = Date.now();
  if (availability) {
    const start = new Date(availability.startsAt).getTime();
    if (start <= now) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
          <span aria-hidden="true" className="size-2 rounded-full bg-success" />
          Disponible jusqu&apos;à {timeFmt.format(new Date(availability.endsAt))}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold">
        <span aria-hidden="true" className="size-2 rounded-full border-2 border-gold" />
        Bientôt dispo · {dayFmt.format(new Date(availability.startsAt))}
      </span>
    );
  }
  if (lastSeenAt && now - new Date(lastSeenAt).getTime() < 15 * 60_000) {
    return <span className="text-xs text-muted">Actif récemment sur le site</span>;
  }
  return <span className="text-xs text-faint">Pas de disponibilité déclarée</span>;
}

export function PlayerCard({ player }: { player: PlayerCardData }) {
  return (
    <article className="flex gap-4 rounded-[var(--radius-card)] border border-line bg-panel p-4 transition-colors hover:border-pink/50">
      <Avatar username={player.username} path={player.avatarPath} size={72} className="rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="display truncate text-lg">{player.username}</h3>
          <AvailabilityPill availability={player.availability} lastSeenAt={player.lastSeenAt} />
        </div>
        {player.games.length > 0 && (
          <p className="mt-1 truncate text-sm text-muted">{player.games.map((g) => g.label).join(", ")}</p>
        )}
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Préférences">
          {player.languages.slice(0, 2).map((l) => (
            <li key={l}>
              <Tag>{LANGUAGES[l as keyof typeof LANGUAGES] ?? l}</Tag>
            </li>
          ))}
          {player.hasMic !== null && (
            <li>
              <Tag tone={player.hasMic ? "cyan" : "default"}>{player.hasMic ? "🎙 Micro" : "Sans micro"}</Tag>
            </li>
          )}
          {player.styles.slice(0, 2).map((s) => (
            <li key={s}>
              <Tag tone="pink">{PLAY_STYLES[s as keyof typeof PLAY_STYLES] ?? s}</Tag>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <Link href={`/joueurs/${encodeURIComponent(player.username)}`} className={buttonClass("secondary", "sm")}>
            Voir le profil<span className="sr-only"> de {player.username}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
