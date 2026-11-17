import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Cookies",
  description: "Les seuls cookies utilisés par VICE CLUB sont strictement nécessaires au fonctionnement du site.",
  alternates: { canonical: "/cookies" },
};

export default function Cookies() {
  const turnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  return (
    <LegalPage
      title="Cookies"
      current="/cookies"
      showMissing={false}
      intro={
        <p>
          Pas de publicité, pas de mesure d&apos;audience, pas de réseau social intégré : le site ne dépose que des cookies strictement nécessaires.
          Ils sont exemptés de consentement, c&apos;est pourquoi aucun bandeau ne s&apos;affiche.
        </p>
      }
    >
      <h2>Cookies utilisés</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Nom</th>
            <th scope="col">Rôle</th>
            <th scope="col">Durée</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>sb-…-auth-token</code> (parfois découpé en <code>.0</code>, <code>.1</code>)
            </td>
            <td>Garde ta session ouverte une fois connecté. Déposé uniquement à la connexion.</td>
            <td>Supprimé à la déconnexion ; 400 jours au maximum</td>
          </tr>
          <tr>
            <td>
              <code>sb-…-auth-token-code-verifier</code>
            </td>
            <td>Sécurise le retour depuis un lien d&apos;e-mail (confirmation, réinitialisation du mot de passe).</td>
            <td>Le temps de l&apos;opération</td>
          </tr>
          <tr>
            <td>
              <code>vc_guest</code>
            </td>
            <td>Identifiant aléatoire qui te permet de jouer aux mini-jeux sans compte et de reprendre ta partie. Déposé quand tu lances une partie.</td>
            <td>30 jours</td>
          </tr>
        </tbody>
      </table>
      <p>
        Tous sont limités à ce site (<code>SameSite=Lax</code>), transmis uniquement en HTTPS en production et ne servent à aucun suivi.{" "}
        <code>vc_guest</code> est en plus inaccessible aux scripts (<code>HttpOnly</code>) et n&apos;est stocké côté serveur que sous forme
        d&apos;empreinte.
      </p>

      {turnstile && (
        <>
          <h2>Vérification anti-robot</h2>
          <p>
            Sur les pages d&apos;inscription, de connexion et de mot de passe oublié, un contrôle Cloudflare Turnstile vérifie que tu n&apos;es pas un
            robot. Il s&apos;exécute dans un cadre fourni par Cloudflare et n&apos;est pas utilisé à des fins publicitaires.
          </p>
        </>
      )}

      <h2>Stockage local</h2>
      <p>Le site n&apos;utilise ni localStorage ni sessionStorage pour te suivre.</p>

      <h2>Si cela change</h2>
      <p>
        Si un jour des cookies non nécessaires étaient ajoutés (mesure d&apos;audience, publicité), ils ne seraient déposés qu&apos;après ton accord
        explicite, que tu pourrais retirer à tout moment, et cette page serait mise à jour. Voir aussi la page{" "}
        <Link href="/confidentialite">Confidentialité</Link>.
      </p>
    </LegalPage>
  );
}
