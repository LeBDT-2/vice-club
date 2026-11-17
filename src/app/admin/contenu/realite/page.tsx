/* eslint-disable @next/next/no-img-element -- aperçus signés */
import { AdminFlash, AdminSection, Field, StatusButtons, StatusTag } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DemoBadge, Tag } from "@/components/ui/notice";
import { requireStaff } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveRealityAction } from "@/server/actions/admin-content";
import { listMedia, mediaLabel, previewUrls } from "@/server/admin/media";

export const metadata = { title: "GTA ou réalité" };
const BACK = "/admin/contenu/realite";

export default async function RealityAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireStaff("admin", BACK);
  const sp = await searchParams;
  const admin = createAdminClient();
  const [{ data: items }, { data: games }, media] = await Promise.all([
    admin.from("reality_items").select("*, media:media_assets(bucket, path, source, author, license, is_ai_generated)").order("created_at", { ascending: false }),
    admin.from("games").select("id, name").order("sort_order"),
    listMedia({ bucket: "game-media", status: "approved" }),
  ]);
  const url = await previewUrls((items ?? []).filter((i) => i.media).map((i) => ({ bucket: "game-media", path: i.media!.path })));
  return (
    <>
      <h1 className="display text-3xl">GTA ou réalité ?</h1>
      <p className="max-w-3xl text-sm text-muted">
        Uniquement des images dont la provenance et les droits sont documentés. Une image générée par IA ne peut jamais être présentée comme une photo réelle.
      </p>
      <AdminFlash ok={sp.ok} erreur={sp.erreur} />
      <AdminSection title="Ajouter une image">
        <form action={saveRealityAction} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="id" value="" />
          <Field label="Image (média privé validé)" className="sm:col-span-2">
            <select name="media_id" required className="field">
              {media.map((m) => <option key={m.id} value={m.id}>{mediaLabel(m)}{m.is_ai_generated ? " (IA)" : ""}</option>)}
            </select>
          </Field>
          <Field label="Réponse">
            <select name="answer" className="field">
              <option value="gta">Capture d&apos;un jeu GTA</option>
              <option value="reality">Photo réelle</option>
            </select>
          </Field>
          <Field label="Jeu concerné (si capture)">
            <select name="game_id" className="field">
              <option value="">—</option>
              {(games ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="Explication affichée après la réponse" className="sm:col-span-2"><textarea name="explanation" required minLength={10} maxLength={1000} className="field min-h-20" /></Field>
          <div className="sm:col-span-3"><Button type="submit">Ajouter en brouillon</Button></div>
        </form>
      </AdminSection>
      <AdminSection title={`Images (${items?.length ?? 0})`}>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(items ?? []).map((i) => (
            <li key={i.id} className="overflow-hidden rounded-xl border border-line bg-deep">
              {i.media && <img src={url({ bucket: "game-media", path: i.media.path }) ?? ""} alt="" className="aspect-video w-full object-cover" loading="lazy" />}
              <div className="space-y-2 p-3 text-xs">
                <p className="flex flex-wrap gap-1">
                  <Tag tone={i.answer === "gta" ? "pink" : "cyan"}>{i.answer === "gta" ? "Capture GTA" : "Photo réelle"}</Tag>
                  <StatusTag status={i.status} />
                  {i.is_demo && <DemoBadge />}
                </p>
                <p className="text-muted">{i.explanation}</p>
                {i.media && <p className="text-faint">{i.media.source} · {i.media.author} · {i.media.license}</p>}
                <StatusButtons table="reality_items" id={i.id} status={i.status} back={BACK} />
              </div>
            </li>
          ))}
        </ul>
      </AdminSection>
    </>
  );
}
