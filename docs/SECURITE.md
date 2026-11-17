# Sécurité : modèle de menaces et mesures

Ce document liste ce qui est protégé, contre quoi, et comment c'est vérifié. Les permissions détaillées sont dans [PERMISSIONS.md](PERMISSIONS.md).

## Ce qu'on protège

1. Les comptes (accès, e-mail, mot de passe géré par Supabase Auth, jamais stocké par l'application).
2. Les données privées des membres : e-mail, messages, pseudos de plateformes non publics, garages privés, historique.
3. L'intégrité des scores et des classements.
4. Les réponses des mini-jeux avant la fin de la manche.
5. L'outil de modération et d'administration.
6. La disponibilité du service face aux abus (spam, inscriptions en masse).

## Menaces et parades

| Menace | Parade | Vérification |
| --- | --- | --- |
| Lecture des données d'un autre membre via l'API Supabase (clé publique) | RLS sur toutes les tables, fonctions `security definer` avec `search_path` vide, colonnes modifiables accordées une à une | `tests/db/isolation.test.ts`, `privileges.test.ts` |
| Escalade de rôle | `user_roles` non modifiable, `admin_set_role` réservée aux admins `aal2`, pas sur soi, journalisée | `privileges.test.ts`, `tests/e2e/access.spec.ts` |
| Vol de session d'un admin | MFA TOTP obligatoire pour l'équipe : pages, actions et fonctions SQL exigent `aal2` | parcours MFA vérifié manuellement en local |
| Score falsifié | Le navigateur n'envoie qu'une réponse ; score calculé par le serveur ; écriture uniquement par `game_commit_answer` (clé secrète) avec barème borné, manche et nombre d'essais attendus, verrou de ligne | `garage-games.test.ts` (score hors barème, réponses simultanées, rejeu) |
| Rejouer le défi pour améliorer son rang | index unique « une partie classée par compte et par défi » ; rejouer renvoie la même partie | `daily-maintenance.test.ts`, vérification manuelle |
| Découvrir la réponse en avance | réponses dans des tables sans accès public ; images de manche via route contrôlée, manches futures en 404, noms de fichiers aléatoires, variantes pixelisées générées côté serveur | `tests/e2e/games.spec.ts` (HTML sans réponse, partie d'autrui en 404) |
| Redirection ouverte après connexion | `safeNextPath` : chemins internes uniquement, refus de `//`, `\`, schémas, caractères de contrôle (même encodés), `/api`, `/auth` | `tests/unit/redirect.test.ts`, `auth.spec.ts` |
| XSS | React échappe tout ; aucun HTML utilisateur ; CSP à nonce par requête avec `strict-dynamic`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'` ; messages en texte brut ; caractères de contrôle refusés | `access.spec.ts` (en-têtes) |
| Fichier malveillant (SVG scripté, polyglotte, EXIF GPS) | types acceptés JPEG/PNG/WebP vérifiés par décodage, ré-encodage WebP par `sharp`, métadonnées supprimées, taille et dimensions bornées, chemins aléatoires | `account.spec.ts` (faux PNG refusé), test manuel SVG refusé en admin |
| Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors 'none'` | `access.spec.ts` |
| CSRF | Server Actions Next.js (vérification d'origine intégrée), cookies `SameSite=Lax`, routes `GET` sans effet de bord | — |
| Force brute / inscriptions en masse | limites persistantes en base (connexion 30/10 min par IP et 8/10 min par e-mail, inscription 5/h par IP, réinitialisation 3/h par e-mail…), limites Supabase Auth, Turnstile en production | limites testées manuellement en local |
| Spam entre membres | demande de contact obligatoire avant tout message, limites (5 demandes/10 min, 12 messages/min, 400/jour), refus récents mémorisés, blocage, signalement | `social.test.ts`, `social.spec.ts` |
| Harcèlement après blocage | blocage bidirectionnel : conversation fermée, demandes en attente closes, pseudos privés masqués | `social.test.ts` |
| Fuite de secrets | clé secrète Supabase uniquement côté serveur (`server-only`), jamais préfixée `NEXT_PUBLIC_` ; validation des variables au démarrage ; journaux sans jetons, mots de passe ni contenus privés (codes d'erreur seulement) | revue du code, journal du serveur de production local vérifié |
| Énumération de comptes | messages de connexion et de réinitialisation génériques ; e-mail jamais affiché aux membres ; recherche par e-mail réservée aux admins et journalisée | `auth.spec.ts` |
| Compte sanctionné qui continue d'agir | `private.can_act()` vérifié dans chaque fonction d'écriture et politique RLS ; jeu non classé | `privileges.test.ts` |
| Données conservées trop longtemps | purge quotidienne (`run_maintenance`) selon les durées publiées | `daily-maintenance.test.ts` |
| Exposition d'identifiants de jeu | aucun accès aux comptes Rockstar/PSN/Xbox/Steam ; seuls des pseudos publics, avec visibilité choisie | conception |

## En-têtes HTTP

`Content-Security-Policy` (nonce par requête), `Strict-Transport-Security` (2 ans, `includeSubDomains`, `preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictive, `Cross-Origin-Opener-Policy: same-origin`, `X-Powered-By` supprimé. Pages privées : `Cache-Control: private, no-store` et `noindex`.

## Limites connues

- La limitation de débit par IP s'appuie sur `x-forwarded-for` fourni par Vercel. Derrière un autre hébergeur, vérifier que cet en-tête ne peut pas être forgé.
- Turnstile ne protège que les formulaires d'authentification et de compte ; le formulaire de contact utilise un champ piège et des limites de débit.
- Aucun audit de sécurité externe n'a été réalisé. Un test d'intrusion avant une forte audience est recommandé.
- Les e-mails de notification (nouvelle demande, nouveau message) ne sont pas envoyés : les notifications sont uniquement sur le site.

## Signaler une faille

Formulaire `/contact`, sujet « Signaler un bug ou une faille ». Ne pas publier de détails avant correction.
