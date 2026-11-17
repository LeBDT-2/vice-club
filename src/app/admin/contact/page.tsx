import Link from "next/link";
import { AdminFlash } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireStaff, roleAtLeast } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils/cn";
import { CONTACT_CATEGORIES } from "@/lib/validation/contact";
import { setContactMessageStatusAction } from "@/server/actions/contact";

export const metadata = { title: "Messages de contact" };

export default async function AdminContact({ searchParams }: { searchParams: Promise<{ statut?: string; ok?: string; erreur?: string }> }) {
  const viewer = await requireStaff("moderator", "/admin/contact");
  const isAdmin = roleAtLeast(viewer.role, "admin");
  const sp = await searchParams;
  const status = sp.statut === "closed" ? "closed" : "open";
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contact_messages")
    .select("id, user_id, reply_email, category, subject, body, page_url, status, handled_at, staff_note, created_at")
    .eq("status", status)
    .order("created_at", { ascending: status === "open" })
    .limit(100);
  const messages = data ?? [];

  const userIds = [...new Set(messages.map((m) => m.user_id).filter((v): v is string => Boolean(v)))];
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id, username").in("id", userIds)
    : { data: [] as { id: string; username: string | null }[] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.username]));
  // L'adresse du compte n'est visible que par les administrateurs.
  const emails = new Map<string, string>();
  if (isAdmin) {
    await Promise.all(
      messages
        .filter((m) => m.user_id && !m.reply_email)
        .map(async (m) => {
          const { data: u } = await admin.auth.admin.getUserById(m.user_id!);
          if (u.user?.email) emails.set(m.user_id!, u.user.email);
        }),
    );
  }

  return (
    <>
      <h1 className="display text-3xl">Messages de contact</h1>
      <AdminFlash ok={sp.ok} erreur={sp.erreur ?? (error ? "Lecture impossible." : undefined)} />
      <nav className="flex gap-2" aria-label="Statut">
        {[
          ["open", "À traiter"],
          ["closed", "Traités"],
        ].map(([id, label]) => (
          <Link
            key={id}
            href={`/admin/contact${id === "open" ? "" : "?statut=closed"}`}
            aria-current={status === id ? "page" : undefined}
            className={cn("rounded-full border px-4 py-1.5 text-sm", status === id ? "border-cyan text-cyan" : "border-line text-muted")}
          >
            {label}
          </Link>
        ))}
      </nav>
      {messages.length === 0 ? (
        <EmptyState title="Aucun message">Rien dans cette liste.</EmptyState>
      ) : (
        <ul className="space-y-4">
          {messages.map((m) => {
            const reply = m.reply_email ?? (m.user_id ? emails.get(m.user_id) : undefined);
            return (
              <li key={m.id} className="rounded-[var(--radius-card)] border border-line bg-panel p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold">{m.subject}</h2>
                  <p className="text-xs text-muted">{new Date(m.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</p>
                </div>
                <p className="mt-1 text-sm text-cyan">{CONTACT_CATEGORIES[m.category as keyof typeof CONTACT_CATEGORIES] ?? m.category}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-ink/90">{m.body}</p>
                <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm text-muted sm:grid-cols-[10rem_1fr]">
                  <dt>Compte</dt>
                  <dd>
                    {m.user_id ? (
                      <Link href={`/admin/utilisateurs/${m.user_id}`} className="text-cyan underline">
                        {names.get(m.user_id) ?? "Sans pseudo"}
                      </Link>
                    ) : (
                      "Visiteur sans compte"
                    )}
                  </dd>
                  <dt>Répondre à</dt>
                  <dd>{reply ? <a href={`mailto:${reply}`} className="text-cyan underline">{reply}</a> : "Adresse du compte (visible par un administrateur)"}</dd>
                  {m.page_url && (
                    <>
                      <dt>Page concernée</dt>
                      <dd className="break-all">{m.page_url}</dd>
                    </>
                  )}
                  {m.staff_note && (
                    <>
                      <dt>Note interne</dt>
                      <dd>{m.staff_note}</dd>
                    </>
                  )}
                </dl>
                <form action={setContactMessageStatusAction} className="mt-4 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={m.id} />
                  {m.status === "open" ? (
                    <>
                      <label className="min-w-64 flex-1 text-sm">
                        <span className="mb-1 block font-semibold">Note interne (facultatif)</span>
                        <input name="note" maxLength={1000} className="field" placeholder="Ex. : répondu par e-mail le…" />
                      </label>
                      <SubmitButton size="sm" pendingLabel="…">
                        Marquer comme traité
                      </SubmitButton>
                    </>
                  ) : (
                    <>
                      <input type="hidden" name="reopen" value="1" />
                      <SubmitButton size="sm" variant="secondary" pendingLabel="…">
                        Rouvrir
                      </SubmitButton>
                    </>
                  )}
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
