import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { blockUserAction } from "@/server/actions/social";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { MessageComposer, ReportForm } from "@/components/social/forms";
import { RealtimeRefresh } from "@/components/social/realtime-refresh";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };

const PAGE = 40;
const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function ConversationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ avant?: string }> }) {
  const { id } = await params;
  const { avant } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const viewer = await requireProfile(`/messages/${id}`);
  const supabase = await createClient();

  // La RLS garantit que seuls les participants voient la conversation.
  const { data: conv } = await supabase.from("conversations").select("id, user_low, user_high").eq("id", id).maybeSingle();
  if (!conv) notFound();
  const otherId = conv.user_low === viewer.id ? conv.user_high : conv.user_low;

  const before = avant && /^\d+$/.test(avant) ? Number(avant) : null;
  let q = supabase.from("messages").select("id, sender_id, body, created_at, hidden_at").eq("conversation_id", id).order("id", { ascending: false }).limit(PAGE + 1);
  if (before) q = q.lt("id", before);
  const [{ data: rows }, { data: other }, { data: blocked }] = await Promise.all([
    q,
    supabase.from("profiles").select("id, username, avatar_path").eq("id", otherId).maybeSingle(),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", viewer.id).eq("blocked_id", otherId).maybeSingle(),
  ]);
  const hasMore = (rows?.length ?? 0) > PAGE;
  const messages = (rows ?? []).slice(0, PAGE).reverse();
  if (!before) await supabase.rpc("mark_conversation_read", { p_conversation: id });
  const closed = !other || Boolean(blocked);

  return (
    <div className="container-site max-w-3xl py-8">
      <RealtimeRefresh conversationId={id} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/messages" className={buttonClass("ghost", "sm")}>
            ← Messages
          </Link>
          <Avatar username={other?.username ?? null} path={other?.avatar_path} size={40} />
          <h1 className="text-xl font-bold">
            {other?.username ? (
              <Link href={`/joueurs/${other.username}`} className="hover:underline">
                {other.username}
              </Link>
            ) : (
              "Joueur indisponible"
            )}
          </h1>
        </div>
        {other && !blocked && (
          <form action={blockUserAction}>
            <input type="hidden" name="user_id" value={otherId} />
            <input type="hidden" name="back" value="messages" />
            <Button type="submit" variant="ghost" size="sm">
              Bloquer
            </Button>
          </form>
        )}
      </div>

      <section aria-label="Historique de la conversation" className="mt-6 rounded-[var(--radius-card)] border border-line bg-panel p-4">
        {hasMore && (
          <div className="mb-4 text-center">
            <Link href={`/messages/${id}?avant=${messages[0]?.id}`} className={buttonClass("secondary", "sm")}>
              Messages plus anciens
            </Link>
          </div>
        )}
        {before && (
          <div className="mb-4 text-center">
            <Link href={`/messages/${id}`} className="text-sm text-cyan underline">
              Revenir aux messages récents
            </Link>
          </div>
        )}
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Dites-vous bonjour ! Le premier message lance la conversation.</p>
        ) : (
          <ol className="space-y-3">
            {messages.map((m) => {
              const mine = m.sender_id === viewer.id;
              return (
                <li key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                  <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.95rem]", mine ? "rounded-br-sm bg-cyan/15 text-ink" : "rounded-bl-sm bg-panel-2")}>
                    <span className="sr-only">{mine ? "Toi" : other?.username ?? "Correspondant"} : </span>
                    {m.hidden_at ? <em className="text-muted">Message masqué par la modération.</em> : <p className="whitespace-pre-line break-words">{m.body}</p>}
                  </div>
                  <span className="mt-1 text-xs text-faint">{fmt.format(new Date(m.created_at))}</span>
                  {!mine && !m.hidden_at && (
                    <div className="mt-1 w-full max-w-xs">
                      <ReportForm targetType="message" targetId={String(m.id)} label="Signaler ce message" />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="mt-4">
        {closed ? (
          <Notice tone="info" title="Conversation fermée">
            {blocked ? "Tu as bloqué ce joueur. Débloque-le depuis Compte et sécurité pour reprendre la conversation." : "Ce joueur n'est plus joignable."}
          </Notice>
        ) : viewer.sanction ? (
          <Notice tone="warning">Ton compte est restreint : tu ne peux pas envoyer de messages.</Notice>
        ) : (
          <MessageComposer conversationId={id} />
        )}
      </div>
    </div>
  );
}
