import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { respondContactRequestAction, withdrawContactRequestAction } from "@/server/actions/social";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/notice";

export const metadata: Metadata = { title: "Demandes de contact", robots: { index: false } };

const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const viewer = await requireProfile("/demandes");
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("contact_requests")
    .select("id, sender_id, recipient_id, message, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);
  const ids = [...new Set((requests ?? []).flatMap((r) => [r.sender_id, r.recipient_id]))].filter((id) => id !== viewer.id);
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, username, avatar_path").in("id", ids) : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const received = (requests ?? []).filter((r) => r.recipient_id === viewer.id);
  const sent = (requests ?? []).filter((r) => r.sender_id === viewer.id);

  return (
    <div className="container-site max-w-3xl py-10">
      <h1 className="display text-3xl sm:text-4xl">Demandes de contact</h1>
      {erreur && (
        <Notice tone="danger" className="mt-6">
          {erreur}
        </Notice>
      )}
      <section aria-labelledby="h-recues" className="mt-8">
        <h2 id="h-recues" className="text-xl font-bold">
          Reçues ({received.length})
        </h2>
        {received.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Aucune demande en attente">Quand un joueur voudra jouer avec toi, sa demande apparaîtra ici.</EmptyState>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {received.map((r) => {
              const p = byId.get(r.sender_id);
              return (
                <li key={r.id} className="rounded-[var(--radius-card)] border border-line bg-panel p-4">
                  <div className="flex items-center gap-3">
                    <Avatar username={p?.username ?? null} path={p?.avatar_path} size={44} />
                    <div className="min-w-0 flex-1">
                      {p?.username ? (
                        <Link href={`/joueurs/${p.username}`} className="font-bold hover:underline">
                          {p.username}
                        </Link>
                      ) : (
                        <span className="font-bold text-muted">Profil indisponible</span>
                      )}
                      <p className="text-xs text-faint">{fmt.format(new Date(r.created_at))}</p>
                    </div>
                  </div>
                  {r.message && <p className="mt-3 whitespace-pre-line rounded-lg bg-deep p-3 text-sm">{r.message}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={respondContactRequestAction}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <input type="hidden" name="decision" value="accept" />
                      <Button type="submit" size="sm">
                        Accepter<span className="sr-only"> la demande de {p?.username}</span>
                      </Button>
                    </form>
                    <form action={respondContactRequestAction}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <input type="hidden" name="decision" value="decline" />
                      <Button type="submit" size="sm" variant="secondary">
                        Refuser<span className="sr-only"> la demande de {p?.username}</span>
                      </Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section aria-labelledby="h-envoyees" className="mt-10">
        <h2 id="h-envoyees" className="text-xl font-bold">
          Envoyées ({sent.length})
        </h2>
        {sent.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Aucune demande envoyée en attente. <Link href="/joueurs" className="text-cyan underline">Trouver des joueurs</Link>
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sent.map((r) => {
              const p = byId.get(r.recipient_id);
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3">
                  <span className="text-sm">
                    À <strong>{p?.username ?? "un joueur"}</strong> · {fmt.format(new Date(r.created_at))}
                  </span>
                  <form action={withdrawContactRequestAction}>
                    <input type="hidden" name="request_id" value={r.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Retirer la demande
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
