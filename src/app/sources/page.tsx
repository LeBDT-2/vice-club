import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { createAdminClient } from "@/lib/supabase/admin";
import { LICENSE_URL, PHOTOS } from "@/config/photos";
import { GTA6, GTA6_CREDIT, GTA6_SOURCE_URL } from "@/config/gta";

export const metadata: Metadata = {
  title: "Sources et crédits des médias",
  description: "Origine, auteur et licence des images utilisées sur VICE CLUB.",
  alternates: { canonical: "/sources" },
};
export const dynamic = "force-dynamic";

type Credit = { source: string; author: string; license: string; ai: boolean; demo: boolean; count: number };

/**
 * Crédits des médias validés. Les médias des mini-jeux sont regroupés par
 * source / auteur / licence, sans aperçu ni description, pour ne jamais dévoiler
 * une réponse.
 */
async function loadCredits(): Promise<Credit[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("media_assets")
    .select("source, author, license, is_ai_generated, is_demo")
    .eq("validation_status", "approved")
    .limit(5000);
  if (error) throw new Error("media_credits");
  const map = new Map<string, Credit>();
  for (const m of data ?? []) {
    const key = [m.source, m.author, m.license, m.is_ai_generated, m.is_demo].join("\u0000");
    const prev = map.get(key);
    if (prev) prev.count += 1;
    else map.set(key, { source: m.source, author: m.author, license: m.license, ai: m.is_ai_generated, demo: m.is_demo, count: 1 });
  }
  return [...map.values()].sort((a, b) => Number(a.demo) - Number(b.demo) || b.count - a.count);
}

export default async function Sources() {
  const credits = await loadCredits();
  return (
    <LegalPage
      title="Sources et crédits des médias"
      current="/sources"
      showMissing={false}
      intro={
        <p>
          Chaque image publiée est vérifiée par l&apos;équipe avant d&apos;apparaître : on note d&apos;où elle vient, qui l&apos;a faite, sous quelle
          licence, et si elle a été générée par une IA.
        </p>
      }
    >
      <h2 id="gta">Visuels de GTA VI et captures de GTA V</h2>
      <p>
        Le diaporama de l&apos;accueil, la section GTA VI et les vignettes des mini-jeux utilisent des visuels officiels de Grand Theft Auto VI
        ({GTA6_CREDIT}), repris du{" "}
        <a href={GTA6_SOURCE_URL} rel="noopener noreferrer" target="_blank">
          site officiel de Rockstar Games
        </a>
        . Les véhicules des mini-jeux et du garage sont des captures de GTA V (© Rockstar Games) hébergées par{" "}
        <a href="https://gta.fandom.com/" rel="noopener noreferrer" target="_blank">
          GTA Wiki
        </a>
        , d&apos;où viennent aussi les prix en jeu ; la page source de chaque véhicule est indiquée dans le tableau des médias plus bas.
      </p>
      <p>
        VICE CLUB est un site de fans non officiel : il n&apos;est ni affilié, ni approuvé, ni parrainé par Rockstar Games ou Take-Two Interactive.
        Ces visuels restent leur propriété et sont retirés sur simple demande (voir plus bas).
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Visuel GTA VI</th>
            <th scope="col">Droits</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(GTA6).map((v) => (
            <tr key={v.src}>
              <td>
                <a href={GTA6_SOURCE_URL} rel="noopener noreferrer" target="_blank">
                  {v.caption}
                </a>
              </td>
              <td>{GTA6_CREDIT}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="photos">Photos d&apos;ambiance du site</h2>
      <p>
        Les autres fonds et bannières sont de vraies photos (Miami Beach, voitures de collection, skateurs), publiées sous licence libre sur
        Wikimedia Commons. Ce ne sont pas des captures de jeu. Elles ont été recadrées,
        redimensionnées et converties en WebP ; sur le site, elles sont assombries et teintées pour la lisibilité du texte. Les photos sous
        licence CC BY-SA restent disponibles sous la même licence. Le logo est une illustration originale.
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Photo</th>
            <th scope="col">Auteur</th>
            <th scope="col">Licence</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(PHOTOS).map((p) => {
            const url = LICENSE_URL[p.license];
            return (
              <tr key={p.src}>
                <td>
                  <a href={p.sourceUrl} rel="noopener noreferrer" target="_blank">
                    {p.caption}
                  </a>
                </td>
                <td>{p.author}</td>
                <td>
                  {url ? (
                    <a href={url} rel="noopener noreferrer license" target="_blank">
                      {p.license}
                    </a>
                  ) : (
                    p.license
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Médias des mini-jeux et du catalogue</h2>
      {credits.length === 0 ? (
        <p>Aucun média n&apos;est encore publié. Cette liste se remplira au fur et à mesure que l&apos;équipe valide des images.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Source</th>
              <th scope="col">Auteur</th>
              <th scope="col">Licence</th>
              <th scope="col" className="text-right">
                Images
              </th>
            </tr>
          </thead>
          <tbody>
            {credits.map((c) => (
              <tr key={`${c.source}-${c.author}-${c.license}-${c.ai}-${c.demo}`}>
                <td>
                  {c.source}
                  {c.ai && <span className="ml-2 rounded bg-cyan/15 px-1.5 py-0.5 text-xs text-cyan">générée par IA</span>}
                  {c.demo && <span className="ml-2 rounded bg-gold/15 px-1.5 py-0.5 text-xs text-gold">démonstration</span>}
                </td>
                <td>{c.author}</td>
                <td>{c.license}</td>
                <td className="text-right tabular-nums">{c.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p>
        Les captures de jeux restent la propriété de leurs éditeurs ; elles sont utilisées en petit nombre, à des fins de jeu-questionnaire non
        commercial, avec mention de la source. Le crédit précis de chaque image de la « Voiture mystère » s&apos;affiche à la fin de la manche.
      </p>

      <h2>Un média vous appartient ?</h2>
      <p>
        Si vous êtes ayant droit et souhaitez une correction de crédit ou un retrait, écrivez-nous via la page{" "}
        <Link href="/contact?sujet=droits_auteur">Contact</Link> en indiquant la page concernée. Le média est retiré pendant l&apos;examen de la demande.
      </p>
    </LegalPage>
  );
}
