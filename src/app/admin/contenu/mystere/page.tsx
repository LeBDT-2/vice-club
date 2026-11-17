/* eslint-disable @next/next/no-img-element -- aperçus signés */
import { AdminFlash, AdminSection, Field, StatusButtons, StatusTag } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/notice";
import { requireStaff } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMysteryAction, updateMysteryHintsAction } from "@/server/actions/admin-content";
import { listMedia, mediaLabel, previewUrls } from "@/server/admin/media";

export const metadata = { title: "Voiture mystère" };
const BACK = "/admin/contenu/mystere";

export default async function MysteryAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireStaff("admin", BACK);
  const sp = await searchParams;
  const admin = createAdminClient();
  const [{ data: puzzles }, { data: vehicles }, media] = await Promise.all([
    admin.from("mystery_puzzles").select("*, vehicles(name, manufacturer, status)").order("created_at", { ascending: false }),
    admin.from("vehicles").select("id, name, manufacturer").order("name").limit(1000),
    listMedia({ bucket: "game-media", status: "approved" }),
  ]);
  const url = await previewUrls((puzzles ?? []).flatMap((p) => [p.stage_paths[0], p.reveal_path].filter(Boolean).map((path) => ({ bucket: "game-media", path: path as string }))));
  return (
    <>
      <h1 className="display text-3xl">Voiture mystère</h1>
      <p className="max-w-3xl text-sm text-muted">
        Le serveur génère 6 variantes recadrées et pixellisées à partir de l&apos;image source, puis l&apos;image de révélation. Les joueurs ne reçoivent que la variante de leur
        essai en cours, sous un nom de fichier aléatoire. Choisis le point de recadrage sur un détail reconnaissable mais pas évident.
      </p>
      <AdminFlash ok={sp.ok} erreur={sp.erreur} />
      <AdminSection title="Créer une voiture mystère">
        <form action={createMysteryAction} className="grid gap-3 sm:grid-cols-2">
          <Field label="Véhicule (réponse)">
            <select name="vehicle_id" required className="field">
              {(vehicles ?? []).map((v) => <option key={v.id} value={v.id}>{[v.manufacturer, v.name].filter(Boolean).join(" ")}</option>)}
            </select>
          </Field>
          <Field label="Image source (média privé validé)" hint="Évite une image identique à celle du catalogue public.">
            <select name="source_media_id" required className="field">
              {media.map((m) => <option key={m.id} value={m.id}>{mediaLabel(m)}</option>)}
            </select>
          </Field>
          <Field label="Point de recadrage horizontal (%)"><input name="focus_x" type="number" min={0} max={100} defaultValue={50} className="field" /></Field>
          <Field label="Point de recadrage vertical (%)"><input name="focus_y" type="number" min={0} max={100} defaultValue={55} className="field" /></Field>
          <Field label="Indices (un par ligne, 5 max., du plus vague au plus précis)" className="sm:col-span-2">
            <textarea name="hints" className="field min-h-28" />
          </Field>
          <div className="sm:col-span-2"><Button type="submit">Générer les variantes</Button></div>
        </form>
      </AdminSection>
      <AdminSection title={`Énigmes (${puzzles?.length ?? 0})`}>
        <ul className="space-y-4">
          {(puzzles ?? []).map((p) => (
            <li key={p.id} className="grid gap-4 rounded-xl border border-line bg-deep p-4 lg:grid-cols-[12rem_12rem_1fr]">
              <figure>
                {p.stage_paths[0] && <img src={url({ bucket: "game-media", path: p.stage_paths[0] }) ?? ""} alt="Première variante" className="aspect-[16/10] w-full rounded-lg object-cover" />}
                <figcaption className="mt-1 text-xs text-muted">Essai 1</figcaption>
              </figure>
              <figure>
                {p.reveal_path && <img src={url({ bucket: "game-media", path: p.reveal_path }) ?? ""} alt="Révélation" className="aspect-[16/10] w-full rounded-lg object-cover" />}
                <figcaption className="mt-1 text-xs text-muted">Révélation</figcaption>
              </figure>
              <div className="space-y-2">
                <p className="font-semibold">
                  {p.vehicles?.manufacturer} {p.vehicles?.name} <StatusTag status={p.status} /> {p.is_demo && <DemoBadge />}
                </p>
                <form action={updateMysteryHintsAction} className="space-y-2">
                  <input type="hidden" name="id" value={p.id} />
                  <textarea name="hints" defaultValue={p.hints.join("\n")} aria-label="Indices" className="field min-h-24 text-sm" />
                  <Button type="submit" size="sm" variant="secondary">Mettre à jour les indices</Button>
                </form>
                <StatusButtons table="mystery_puzzles" id={p.id} status={p.status} back={BACK} />
              </div>
            </li>
          ))}
        </ul>
      </AdminSection>
    </>
  );
}
