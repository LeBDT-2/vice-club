# Architecture

## Vue d'ensemble

```
Navigateur ──HTTPS──▶ Vercel (Next.js 16, App Router)
                        │  proxy.ts : CSP à nonce, rafraîchissement de session Supabase
                        │  Server Components : lecture avec le client « utilisateur » (RLS)
                        │  Server Actions / routes : validation Zod, limites de débit,
                        │                            client « secret » uniquement après contrôle
                        ▼
                     Supabase
                        ├─ Postgres : tables + RLS, fonctions SQL (security definer)
                        ├─ Auth : e-mail/mot de passe, confirmation, TOTP (aal2)
                        ├─ Storage : avatars, public-media (publics), game-media (privé)
                        └─ Realtime : rafraîchissement de la conversation ouverte
```

Le navigateur ne parle à Supabase que pour Realtime (clé publique, RLS). Toutes les lectures et écritures passent par le serveur Next.js.

## Arborescence

| Dossier | Rôle |
| --- | --- |
| `src/app` | Routes. Noms d'URL en français (`/joueurs`, `/mini-jeux`, `/mon-garage`…). `(auth)` regroupe connexion, inscription, mot de passe. |
| `src/components` | Composants par domaine (`games`, `garage`, `social`, `admin`, `legal`…) et `ui` (boutons, champs, notices). `art/scenes.tsx` contient les illustrations SVG originales. |
| `src/server/actions` | Server Actions (une par intention utilisateur), toutes validées par Zod. |
| `src/server/data` | Lectures côté serveur (requêtes Supabase typées). |
| `src/server/games` | Moteur des mini-jeux : création de partie, tirage, contrôle de propriété, révélation. |
| `src/lib` | Code pur et partagé : règles de score, fuseau de Paris, validation, sécurité (CSP, redirections, limites), environnement. |
| `src/config/legal.ts` | Informations légales et durées de conservation (seul fichier à compléter pour les pages légales). |
| `supabase/migrations` | Schéma versionné, appliqué dans l'ordre. Ne jamais modifier une migration déjà appliquée. |
| `supabase/templates` | Modèles d'e-mails d'authentification. |
| `supabase/reference` | Scripts optionnels (catalogue de départ en brouillon). |
| `scripts/seed-demo.ts` | Jeu de démonstration (local / préversion). |
| `tests/unit`, `tests/db`, `tests/e2e` | Tests Vitest (pur), Vitest sur Supabase local (RLS), Playwright (parcours). |

## Choix et raisons

- **Rendu dynamique, `cacheComponents: false`** : presque toutes les pages dépendent de la session (menu, relations, état des parties) et la CSP utilise un nonce par requête. Le cache de composants mutualisé ferait courir le risque de servir un fragment privé à un autre visiteur ; on privilégie la sûreté. Les seules routes statiques sont `robots.txt` et `sitemap.xml`. Les données publiques lourdes restent légères (pagination, colonnes choisies).
- **Deux clients Supabase côté serveur** : `createClient()` agit au nom de la personne (RLS appliquée) ; `createAdminClient()` (clé secrète, `server-only`) n'est utilisé qu'après un contrôle explicite (propriété d'une partie, `assertStaff`) ou pour des tables sans accès public (réponses des jeux, messages de contact).
- **Logique sensible en SQL** : demandes de contact, messages, blocage, signalements, garages, réponses aux jeux, modération. Les invariants (limites de garage, une partie classée par défi, défi verrouillé une fois commencé, barème des scores) sont garantis par la base, même en cas d'appel direct à l'API.
- **Limitation de débit persistante** (`private.rate_limits` + `consume_rate_limit`) : fonctionne en serverless, clés = empreintes HMAC (IP, e-mail), jamais de valeur en clair. En cas de panne de la base, on refuse plutôt que d'ouvrir.
- **Défi du jour** : la « journée » est calculée en Europe/Paris côté serveur et en SQL (`private.today_paris()`), jamais avec l'horloge du navigateur. Le compte à rebours compense le décalage d'horloge client.
- **Images** : tout envoi est décodé et ré-encodé en WebP par `sharp` (métadonnées supprimées), nommé aléatoirement. Les images de mini-jeux sont privées et servies par `/api/jeux/<partie>/image/<n>`.
- **Formulaires** : Server Actions + `useActionState`, fonctionnent sans JavaScript ; en cas d'erreur, la saisie est restaurée (sauf mots de passe) par `useKeepValues`.
- **Accessibilité** : lien d'évitement, focus visible, libellés explicites, combobox ARIA pour la voiture mystère, carte « Où suis-je ? » utilisable au clavier, annonces `aria-live`, `prefers-reduced-motion` respecté, information jamais portée par la seule couleur.

## Environnements

| Variable `APP_ENV` | Usage | Particularités |
| --- | --- | --- |
| `local` | `pnpm dev` + `supabase start` | Turnstile facultatif, images locales autorisées, `noindex` |
| `test` | CI | idem `local` |
| `preview` | déploiements de branche Vercel | `noindex`, `robots.txt` interdit tout |
| `production` | site public | HTTPS et Turnstile exigés, seed de démonstration refusé |

## Commandes

| Commande | Effet |
| --- | --- |
| `pnpm dev` | serveur de développement |
| `pnpm typecheck` / `pnpm lint` | TypeScript strict / ESLint |
| `pnpm test` | tests unitaires |
| `pnpm test:db` | tests RLS et intégration (Supabase local démarré) |
| `pnpm test:e2e` | tests de bout en bout Playwright (démarre `pnpm dev` si besoin) |
| `pnpm build` / `pnpm start` | build et serveur de production |
| `pnpm seed:demo [--remove]` | jeu de démonstration local |
| `pnpm exec supabase gen types typescript --local > src/lib/supabase/database.types.ts` | régénère les types après une migration |
