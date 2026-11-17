# Déploiement : Supabase + Vercel

Ce guide met VICE CLUB en ligne avec les offres gratuites de Supabase et de Vercel. **Ne publie rien sans avoir coché la [liste de lancement](LANCEMENT.md).** Compte environ une heure la première fois.

Deux environnements sont recommandés :

| Environnement | Supabase | Vercel | `APP_ENV` |
| --- | --- | --- | --- |
| Préversion | projet `vice-club-preview` | déploiements « Preview » (branches) | `preview` |
| Production | projet `vice-club-prod` | déploiement « Production » (`main`) | `production` |

Le local tourne avec `supabase start` (voir le [README](../README.md)).

---

## 1. Projet Supabase

1. Crée un projet sur [supabase.com](https://supabase.com) (offre gratuite). **Région : Union européenne** (ex. Frankfurt `eu-central-1` ou Paris `eu-west-3`). Note-la dans `src/config/legal.ts` (`dataProcessor.region`).
2. Mot de passe de base : génère-le et garde-le dans un gestionnaire de mots de passe. Il ne va **jamais** dans Vercel.
3. Récupère dans *Project Settings → API Keys* :
   - l'URL du projet (`https://<ref>.supabase.co`) ;
   - la clé **publiable** `sb_publishable_…` ;
   - une clé **secrète** `sb_secret_…` (à créer si besoin). Elle ne sert qu'au serveur Next.js.

### Appliquer les migrations

Depuis ton poste, dans le dossier du projet :

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <ref>
pnpm exec supabase db push        # applique supabase/migrations/*.sql dans l'ordre
```

Vérifie dans *Database → Migrations* que les 11 migrations apparaissent. N'exécute **jamais** `pnpm seed:demo` sur ce projet (le script refuse de toute façon une base distante sans `--allow-remote`).

### Tâche de maintenance quotidienne

La migration `…001000_maintenance.sql` planifie `public.run_maintenance()` chaque jour à 04 h 15 UTC **si l'extension pg_cron est disponible**. Sur Supabase :

1. *Database → Extensions* : active **pg_cron**.
2. *SQL Editor* :
   ```sql
   select cron.schedule('vice-club-maintenance', '15 4 * * *', 'select public.run_maintenance()');
   select jobname, schedule from cron.job;   -- doit lister vice-club-maintenance
   ```
3. Test immédiat : `select public.run_maintenance();` renvoie le nombre de lignes purgées par catégorie.

Les durées appliquées sont celles affichées sur `/confidentialite` (source : `RETENTION` dans `src/config/legal.ts`).

### Authentification (*Authentication* dans le tableau de bord)

| Réglage | Valeur |
| --- | --- |
| *URL Configuration → Site URL* | `https://ton-domaine.fr` (préversion : URL Vercel de préversion) |
| *URL Configuration → Redirect URLs* | `https://ton-domaine.fr/**` ; en préversion : `https://*-<équipe>.vercel.app/**` |
| *Sign In / Providers → Email* | activé, **Confirm email** activé, **Secure email change** activé |
| *Sign In / Providers* | tous les autres fournisseurs désactivés (pas de connexion Rockstar / PSN / Xbox / Steam) |
| Mot de passe | longueur minimale **10**, exigence « lettres et chiffres » |
| *Multi-Factor* | **TOTP activé** (obligatoire pour l'équipe : l'administration exige `aal2`) |
| *Attack Protection → CAPTCHA* | Cloudflare Turnstile, clé **secrète** Turnstile (voir §4) |
| *Rate Limits* | garder les valeurs par défaut (l'application ajoute ses propres limites) |
| *Sessions* | durée par défaut ; « Inactivity timeout » facultatif |

**Modèles d'e-mails** (*Authentication → Emails → Templates*) : copie le contenu de `supabase/templates/` :

| Modèle Supabase | Fichier | Sujet conseillé |
| --- | --- | --- |
| Confirm signup | `confirmation.html` | Confirme ton inscription à VICE CLUB |
| Reset password | `recovery.html` | Réinitialise ton mot de passe VICE CLUB |
| Change email address | `email_change.html` | Confirme ta nouvelle adresse e-mail VICE CLUB |
| Password changed (notification) | `password_changed.html` | Ton mot de passe VICE CLUB a été modifié |

Les liens utilisent `{{ .SiteURL }}/auth/confirm?token_hash=…&type=…` : ne remplace pas ce format, la route `/auth/confirm` en dépend.

### SMTP (obligatoire avant ouverture)

Le SMTP intégré de Supabase est limité à quelques e-mails par heure et réservé aux tests : les inscriptions échoueraient dès les premiers visiteurs. Configure un SMTP dans *Authentication → Emails → SMTP Settings* :

1. Choisis un fournisseur avec une offre gratuite adaptée (par exemple Brevo, Resend ou Amazon SES ; compare les quotas au moment de choisir). **Aucun service payant n'est souscrit par ce projet : c'est ta décision.**
2. Vérifie ton domaine chez le fournisseur : enregistrements **SPF**, **DKIM** et **DMARC** dans la zone DNS du domaine (sinon les e-mails finissent en spam).
3. Renseigne hôte, port (587 STARTTLS), identifiant, mot de passe SMTP, expéditeur `VICE CLUB <no-reply@ton-domaine.fr>`.
4. Envoie-toi un e-mail de test (inscription avec une adresse personnelle), vérifie le lien et l'affichage sur mobile.
5. Dans *Rate Limits*, relève la limite d'e-mails par heure au niveau permis par ton fournisseur.

### Stockage

Les compartiments `avatars` (public), `public-media` (public) et `game-media` (**privé**) et leurs règles sont créés par les migrations. Vérifie dans *Storage* que `game-media` est bien privé : les images des mini-jeux ne doivent être accessibles que via `/api/jeux/…`.

---

## 2. Premier administrateur

1. Inscris-toi normalement sur le site déployé, confirme ton e-mail et choisis ton pseudo.
2. Dans le *SQL Editor* de Supabase (rôle `postgres`, le seul autorisé) :
   ```sql
   select private.bootstrap_admin('ton-adresse@exemple.fr');
   ```
   L'action est inscrite au journal d'audit (`role.bootstrap_admin`).
3. Connecte-toi, va sur `/admin` : tu es redirigé vers `/compte/securite/mfa`. Active la double authentification (application TOTP) ; l'administration n'est accessible qu'en session `aal2`.
4. Les rôles suivants (modérateur, administrateur) se donnent depuis `/admin/utilisateurs/<id>` avec un motif. Un administrateur ne peut pas modifier son propre rôle ni supprimer son compte sans avoir été rétrogradé par un autre administrateur.

---

## 3. Projet Vercel

1. Importe le dépôt GitHub dans Vercel (*Add New → Project*). Framework : Next.js (détecté). Commande d'installation : `pnpm install --frozen-lockfile` (détectée grâce au `pnpm-lock.yaml`). Version de Node : 22.
2. Variables d'environnement (*Settings → Environment Variables*), séparément pour **Production** et **Preview** :

| Variable | Production | Preview | Exposée au navigateur |
| --- | --- | --- | --- |
| `APP_ENV` | `production` | `preview` | non |
| `NEXT_PUBLIC_SITE_URL` | `https://ton-domaine.fr` | URL de préversion | oui |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet prod | URL du projet préversion | oui |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` prod | `sb_publishable_…` préversion | oui |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` prod (*Sensitive*) | `sb_secret_…` préversion | **non, jamais** |
| `RATE_LIMIT_SALT` | `openssl rand -base64 48` (*Sensitive*) | autre valeur | non |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | clé de site Turnstile | clé de site Turnstile | oui |
| `ANTIBOT_DISABLED_ACKNOWLEDGED` | `false` | `true` si pas de Turnstile en préversion | non |

   En production, le serveur refuse de traiter les requêtes (erreur explicite dans les journaux Vercel) si une variable manque, si l'URL du site n'est pas en HTTPS ou si Turnstile est absent sans acceptation explicite (`src/lib/env.ts`).
3. Déploie. Vérifie `https://…/robots.txt` : en préversion il interdit tout ; en production il autorise les pages publiques et pointe vers le sitemap.

### Domaine

*Settings → Domains* : ajoute `ton-domaine.fr` (et `www` en redirection). Configure les DNS indiqués par Vercel. Le certificat HTTPS est automatique. Mets ensuite à jour `NEXT_PUBLIC_SITE_URL`, la *Site URL* et les *Redirect URLs* de Supabase, puis redéploie.

L'en-tête `Strict-Transport-Security` est envoyé avec `preload` : ne soumets le domaine à la liste HSTS preload qu'une fois certain que tous les sous-domaines sont en HTTPS.

---

## 4. Cloudflare Turnstile (anti-robot gratuit)

1. Tableau de bord Cloudflare → *Turnstile* → *Add widget*. Domaines : ton domaine (et `vercel.app` pour la préversion si besoin). Mode : *Managed*.
2. **Clé de site** → variable Vercel `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
3. **Clé secrète** → Supabase *Authentication → Attack Protection → Enable CAPTCHA protection* (fournisseur Turnstile). Elle ne va pas dans Vercel.
4. Le widget s'affiche sur l'inscription, la connexion, le mot de passe oublié et les opérations sensibles du compte ; la CSP l'autorise automatiquement quand la clé est présente.

---

## 5. Vérifications après déploiement (avec deux comptes réels)

Utilise deux adresses à toi (A et B), sur deux navigateurs.

1. Inscription A : e-mail reçu, lien valide, choix du pseudo, profil.
2. Mot de passe oublié A : e-mail reçu, réinitialisation, reconnexion.
3. B cherche A dans `/joueurs` (A doit avoir déclaré au moins un jeu publié avec mise en relation activée), envoie une demande ; A accepte ; échange de messages ; B signale un message ; A bloque B et vérifie que B ne peut plus écrire.
4. A crée un garage public, ouvre son lien en navigation privée, vérifie l'aperçu (image Open Graph).
5. Défi du jour : jouer en visiteur (non classé), puis avec A (classé, visible dans `/classements`), rejouer → même partie.
6. `/compte` : export JSON (ne contient que les données de A), puis suppression du compte B avec mot de passe.
7. Admin : `/admin` exige la double authentification ; traiter le signalement ; vérifier le journal d'audit.
8. `curl -I https://ton-domaine.fr` : en-têtes `content-security-policy`, `strict-transport-security`, `x-content-type-options`.
9. Données de démonstration : `/admin` ne doit afficher **aucune** alerte « Données de démonstration présentes ». En SQL : `select * from public.demo_content_report();` (toutes les lignes à 0).
10. Supprime ensuite les comptes de test (`/compte` ou *Authentication → Users*).

---

## 6. Mises à jour et retour arrière

- **Code** : chaque push sur une branche crée une préversion ; `main` déploie la production. Retour arrière : *Deployments → … → Promote to Production* sur le déploiement précédent (instantané).
- **Base** : ajoute toujours une **nouvelle** migration (jamais de modification d'une migration déjà appliquée), teste-la en local (`supabase db reset`) puis en préversion (`supabase db push` sur le projet préversion), puis en production. Une migration ne s'annule pas automatiquement : pour revenir en arrière, écris une migration corrective. Avant une migration risquée, fais une sauvegarde manuelle (voir [EXPLOITATION.md](EXPLOITATION.md)).
- **Ordre** : migration d'abord (compatible avec l'ancien code), code ensuite.
