import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsReadAction } from "@/server/actions/social";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/notice";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

type Payload = Record<string, string | undefined>;

function describe(kind: string, p: Payload): { text: string; href?: string } {
  switch (kind) {
    case "contact_request":
      return { text: "Tu as reçu une nouvelle demande de contact.", href: "/demandes" };
    case "contact_accepted":
      return { text: "Ta demande de contact a été acceptée : la messagerie est ouverte.", href: p.conversation_id ? `/messages/${p.conversation_id}` : "/messages" };
    case "report_update":
      return { text: p.status === "resolved" ? "Ton signalement a été traité par la modération." : "Ton signalement a été examiné et classé sans suite." };
    case "sanction":
      return { text: "Une décision de modération concerne ton compte.", href: "/compte/restriction" };
    case "badge":
      return { text: "Tu as obtenu un nouveau badge !", href: "/mes-resultats" };
    default:
      return { text: "Notification." };
  }
}

export default async function NotificationsPage() {
  const viewer = await requireUser("/notifications");
  const supabase = await createClient();
  const [{ data: notifs }, { count: pending }] = await Promise.all([
    supabase.from("notifications").select("id, kind, payload, read_at, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("contact_requests").select("id", { count: "exact", head: true }).eq("recipient_id", viewer.id).eq("status", "pending"),
  ]);
  const unread = (notifs ?? []).some((n) => !n.read_at);

  return (
    <div className="container-site max-w-3xl py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-3xl sm:text-4xl">Notifications</h1>
        {unread && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="secondary" size="sm">
              Tout marquer comme lu
            </Button>
          </form>
        )}
      </div>
      {(pending ?? 0) > 0 && (
        <Link href="/demandes" className="mt-6 flex items-center justify-between rounded-xl border border-pink/50 bg-pink/10 px-4 py-3 font-semibold">
          {pending} demande{pending! > 1 ? "s" : ""} de contact en attente
          <span aria-hidden="true">›</span>
        </Link>
      )}
      {!notifs || notifs.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Rien de neuf pour l'instant">Les demandes acceptées, badges et décisions de modération apparaîtront ici.</EmptyState>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-panel">
          {notifs.map((n) => {
            const d = describe(n.kind, (n.payload ?? {}) as Payload);
            const body = (
              <div className="flex items-start gap-3 px-4 py-3">
                <span aria-hidden="true" className={`mt-2 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-pink"}`} />
                <div>
                  <p className={n.read_at ? "text-muted" : "font-semibold"}>
                    {!n.read_at && <span className="sr-only">Non lue : </span>}
                    {d.text}
                  </p>
                  <p className="text-xs text-faint">{fmt.format(new Date(n.created_at))}</p>
                </div>
              </div>
            );
            return <li key={n.id}>{d.href ? <Link href={d.href} className="block hover:bg-panel-2">{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
