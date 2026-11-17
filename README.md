# VICE CLUB

Site communautaire francophone, gratuit et non officiel autour de GTA :

- **Trouver des joueurs** compatibles (jeu, plateforme, langue, style, créneaux, disponibilités), demandes de contact, messagerie texte après acceptation, blocage et signalement.
- **Mon garage** : compose un garage virtuel de 5 véhicules dans un budget fictif, garde-le privé ou partage-le.
- **Cinq mini-jeux** (Garage ultime, Où suis-je ?, Voiture mystère, Plus cher ou moins cher ?, GTA ou réalité ?) et un **défi du jour** avec classements.
- **Back-office** : modération (signalements, sanctions, masquage), contenu avec provenance des médias, défis du jour, journal d'audit, administration protégée par double authentification.

Les visiteurs peuvent tout consulter et jouer sans compte ; un compte (18 ans et plus) sert à enregistrer ses résultats, apparaître au classement, sauvegarder des garages et contacter des joueurs. Aucune connexion à un compte Rockstar, PSN, Xbox ou Steam n'est jamais demandée.

Stack : Next.js 16 (App Router, TypeScript strict), Tailwind CSS 4, Supabase (Postgres + RLS, Auth, Storage, Realtime), Zod, Vitest, Playwright, déploiement Vercel.

## Démarrer en local

Prérequis : Node 22, pnpm 10, Docker.

```bash
pnpm install
pnpm exec supabase start          # Postgres, Auth, Storage, Mailpit ; applique les migrations
pnpm exec supabase status -o env  # affiche les clés locales
cp .env.example .env.local        # puis reporte API_URL, PUBLISHABLE_KEY, SECRET_KEY
                                  # et génère RATE_LIMIT_SALT : openssl rand -base64 48
pnpm seed:demo                    # facultatif : contenu de démonstration fictif
pnpm dev                          # http://localhost:3000
```

- E-mails de confirmation et de réinitialisation : Mailpit sur http://127.0.0.1:54324.
- Devenir administrateur en local : inscris-toi, puis
  `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "select private.bootstrap_admin('ton@email.test')"`
  et active la double authentification sur `/compte/securite/mfa`.

## Vérifier

```bash
pnpm typecheck && pnpm lint
pnpm test        # tests unitaires (scores, fuseau de Paris, redirections, validation)
pnpm test:db     # RLS et règles en base, sur Supabase local
pnpm test:e2e    # parcours complets dans un navigateur (Playwright)
pnpm build
```

La CI GitHub Actions (`.github/workflows/ci.yml`) exécute tout cela, y compris Supabase local, à chaque push et pull request.

## Documentation

| Document | Contenu |
| --- | --- |
| [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) | Supabase + Vercel pas à pas : migrations, Auth, SMTP, redirections, Turnstile, domaine, premier administrateur, vérifications |
| [docs/LANCEMENT.md](docs/LANCEMENT.md) | Liste de vérification avant ouverture publique |
| [docs/CONTENU.md](docs/CONTENU.md) | Ajouter jeux, plateformes, médias, véhicules, lieux, énigmes, défis ; jeu de démonstration ; modération |
| [docs/JEUX.md](docs/JEUX.md) | Règles, calcul des scores, classements, anti-triche |
| [docs/PERMISSIONS.md](docs/PERMISSIONS.md) | Rôles, droits, RLS par table, stockage |
| [docs/SECURITE.md](docs/SECURITE.md) | Modèle de menaces, parades, en-têtes, limites connues |
| [docs/EXPLOITATION.md](docs/EXPLOITATION.md) | Sauvegarde, restauration, retour arrière, surveillance, coûts |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Organisation du code et choix techniques |
| [PROGRESS.md](PROGRESS.md) | État d'avancement et limites honnêtes |

## Mentions

VICE CLUB n'est ni affilié ni approuvé par Rockstar Games ou Take-Two Interactive. Grand Theft Auto et GTA sont des marques de Take-Two Interactive. Les illustrations du site sont originales ; les médias de jeu sont crédités sur `/sources`.
