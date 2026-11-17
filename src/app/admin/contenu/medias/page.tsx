/* eslint-disable @next/next/no-img-element -- aperçus signés */
import { AdminFlash, AdminSection, Field, MediaStatusTag } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DemoBadge, Tag } from "@/components/ui/notice";
import { requireStaff } from "@/lib/auth/viewer";
import { reviewMediaAction, uploadMediaAction } from "@/server/actions/admin-content";
import { listMedia, previewUrls } from "@/server/admin/media";

export const metadata = { title: "Médias" };

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string; statut?: string }> }) {
  await requireStaff("admin", "/admin/contenu/medias");
  const sp = await searchParams;
  const media = await listMedia({ status: sp.statut });
  const url = await previewUrls(media);
  return (
    <>
      <h1 className="display text-3xl">Médias</h1>
      <AdminFlash ok={sp.ok} erreur={sp.erreur} />
      <AdminSection title="Importer une image">
        <form action={uploadMediaAction} encType="multipart/form-data" className="grid gap-4 sm:grid-cols-2">
          <Field label="Fichier (JPEG, PNG ou WebP, 5 Mo max.)" hint="L'image est ré-encodée en WebP et ses métadonnées sont supprimées.">
            <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required className="field" />
          </Field>
          <Field label="Stockage" hint="Privé pour les images de jeu (captures, voiture mystère, GTA ou réalité) : jamais servies directement.">
            <select name="bucket" className="field">
              <option value="game-media">Privé : images des mini-jeux</option>
              <option value="public-media">Public : catalogue, cartes</option>
            </select>
          </Field>
          <Field label="Source (URL ou description précise)">
            <input name="source" required minLength={2} maxLength={500} className="field" />
          </Field>
          <Field label="Auteur ou titulaire des droits">
            <input name="author" required minLength={2} maxLength={200} className="field" />
          </Field>
          <Field label="Licence ou autorisation">
            <input name="license" required minLength={2} maxLength={200} className="field" placeholder="ex. CC BY 4.0, autorisation écrite du…" />
          </Field>
          <Field label="Texte alternatif (accessibilité)" hint="Ne doit pas révéler la réponse d'un mini-jeu.">
            <input name="alt_text" maxLength={300} className="field" />
          </Field>
          <Field label="Justification d'usage" className="sm:col-span-2">
            <textarea name="usage_justification" maxLength={1000} className="field min-h-20" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_ai_generated" className="size-4" /> Image générée par IA (ne sera jamais présentée comme une photo réelle)
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">Importer</Button>
          </div>
        </form>
      </AdminSection>
      <AdminSection title={`Bibliothèque (${media.length})`}>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {media.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-xl border border-line bg-deep">
              <div className="aspect-video bg-night">{url(m) && <img src={url(m)!} alt={m.alt_text} className="size-full object-contain" loading="lazy" />}</div>
              <div className="space-y-1 p-3 text-xs">
                <p className="flex flex-wrap gap-1">
                  <MediaStatusTag status={m.validation_status} />
                  <Tag>{m.bucket === "game-media" ? "Privé" : "Public"}</Tag>
                  {m.is_ai_generated && <Tag tone="gold">IA</Tag>}
                  {m.is_demo && <DemoBadge />}
                </p>
                <p><span className="text-muted">Source :</span> {m.source}</p>
                <p><span className="text-muted">Auteur :</span> {m.author} · <span className="text-muted">Licence :</span> {m.license}</p>
                <p className="text-muted">{m.width} × {m.height}</p>
                <form action={reviewMediaAction} className="flex flex-wrap gap-1 pt-1">
                  <input type="hidden" name="id" value={m.id} />
                  {m.validation_status !== "approved" && <Button size="sm" name="decision" value="approved">Valider</Button>}
                  {m.validation_status !== "rejected" && <Button size="sm" variant="ghost" name="decision" value="rejected">Refuser</Button>}
                </form>
              </div>
            </li>
          ))}
        </ul>
      </AdminSection>
    </>
  );
}
