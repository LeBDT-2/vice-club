import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { unblockUserAction } from "@/server/actions/social";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/notice";

export const metadata: Metadata = { title: "Utilisateurs bloqués", robots: { index: false } };

export default async function BlockedPage() {
  const viewer = await requireUser("/compte/bloques");
  const supabase = await createClient();
  const { data: blocks } = await supabase.from("blocks").select("blocked_id, created_at").eq("blocker_id", viewer.id);
  // Les profils bloqués sont masqués par la RLS ; on lit uniquement leur pseudo,
  // pour la liste personnelle de l'utilisateur, avec le client privilégié.
  const ids = (blocks ?? []).map((b) => b.blocked_id);
  const { data: names } = ids.length ? await createAdminClient().from("profiles").select("id, username").in("id", ids) : { data: [] };
  const byId = new Map((names ?? []).map((n) => [n.id, n.username]));
  return (
    <div className="container-site max-w-2xl py-10">
      <h1 className="display text-3xl">Utilisateurs bloqués</h1>
      {ids.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Tu n'as bloqué personne" />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-panel">
          {ids.map((id) => (
            <li key={id} className="flex items-center justify-between px-4 py-3">
              <span>{byId.get(id) ?? "Compte sans pseudo"}</span>
              <form action={unblockUserAction}>
                <input type="hidden" name="user_id" value={id} />
                <Button type="submit" size="sm" variant="secondary">
                  Débloquer
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
