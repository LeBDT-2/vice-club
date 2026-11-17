import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, Notice } from "@/components/ui/notice";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ page?: string; bloque?: string }> }) {
  await requireProfile("/messages");
  const sp = await searchParams;
  const page = Math.max(1, Math.min(100, Number(sp.page) || 1));
  const supabase = await createClient();
  const { data: convs } = await supabase.rpc("my_conversations", { p_limit: 30, p_offset: (page - 1) * 30 });

  return (
    <div className="container-site max-w-3xl py-10">
      <h1 className="display text-3xl sm:text-4xl">Messages</h1>
      <p className="mt-2 text-sm text-muted">La messagerie s&apos;ouvre quand une demande de contact est acceptée.</p>
      {sp.bloque && (
        <Notice tone="success" className="mt-6">
          Utilisateur bloqué. Il ne peut plus te contacter ni voir ton profil.
        </Notice>
      )}
      {!convs || convs.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Pas encore de conversation"
            action={
              <Link href="/joueurs" className={buttonClass("primary")}>
                Trouver des joueurs
              </Link>
            }
          >
            Envoie une demande de contact à un joueur : la conversation apparaîtra ici dès qu&apos;il l&apos;aura acceptée.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel">
          {convs.map((c) => (
            <li key={c.conversation_id}>
              <Link href={`/messages/${c.conversation_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-panel-2">
                <Avatar username={c.other_username} path={c.other_avatar_path} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={c.unread ? "font-bold text-white" : "font-semibold"}>{c.other_username ?? "Joueur indisponible"}</span>
                    {c.last_message_at && <span className="shrink-0 text-xs text-faint">{fmt.format(new Date(c.last_message_at))}</span>}
                  </div>
                  <p className="truncate text-sm text-muted">
                    {c.blocked ? "Conversation fermée" : c.last_message_preview ? `${c.last_message_mine ? "Toi : " : ""}${c.last_message_preview}` : "Aucun message pour l'instant"}
                  </p>
                </div>
                {c.unread && (
                  <span className="rounded-full bg-pink px-2 py-0.5 text-xs font-bold text-white">
                    Non lu
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {convs && convs.length === 30 && (
        <div className="mt-4 text-center">
          <Link href={`/messages?page=${page + 1}`} className={buttonClass("secondary", "sm")}>
            Conversations plus anciennes
          </Link>
        </div>
      )}
    </div>
  );
}
