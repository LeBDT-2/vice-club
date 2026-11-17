# Liste de vérification avant ouverture publique

À cocher dans l'ordre. Rien n'est publié automatiquement : l'ouverture est ta décision.

## Informations et obligations

- [ ] `src/config/legal.ts` complété : statut et nom de l'éditeur, adresse (ou anonymat d'éditeur non professionnel), directeur de la publication, e-mail de contact, hébergeur confirmé, région Supabase. `/admin` n'affiche plus l'alerte « Informations légales à compléter ».
- [ ] Pages `/mentions-legales`, `/confidentialite`, `/conditions`, `/regles`, `/cookies` relues (idéalement par une personne compétente en droit du numérique). Plus aucun crochet « à compléter ».
- [ ] Adresse de contact fonctionnelle et relevée régulièrement.

## Infrastructure

- [ ] Projet Supabase de production en région UE, 11 migrations appliquées, `game-media` privé.
- [ ] pg_cron activé et tâche `vice-club-maintenance` planifiée.
- [ ] Auth : confirmation d'e-mail, changement d'e-mail sécurisé, mot de passe ≥ 10, TOTP activé, autres fournisseurs désactivés, URL du site et redirections correctes.
- [ ] Modèles d'e-mails copiés depuis `supabase/templates/`.
- [ ] SMTP personnalisé configuré, SPF/DKIM/DMARC en place, e-mail de test reçu hors spam.
- [ ] Turnstile : clé de site dans Vercel, clé secrète dans Supabase.
- [ ] Variables Vercel de production complètes, `APP_ENV=production`, clé secrète marquée *Sensitive*.
- [ ] Domaine en HTTPS, `NEXT_PUBLIC_SITE_URL` et Supabase à jour.

## Contenu

- [ ] Données de démonstration absentes : `select * from public.demo_content_report();` → toutes à 0.
- [ ] Au moins un jeu et une combinaison jeu × plateforme publiés avec mise en relation **vérifiée** (pas de suppositions sur le jeu croisé ou le multijoueur de GTA VI).
- [ ] Chaque mini-jeu ouvert a son contenu minimum publié, avec provenance et licences validées ; sinon il affiche honnêtement « Contenu à venir ».
- [ ] Défis du jour publiés pour au moins les 7 prochains jours.
- [ ] Budget et places du garage réglés.

## Équipe

- [ ] Premier administrateur créé (`private.bootstrap_admin`) avec double authentification active.
- [ ] Au moins un second membre de l'équipe (modérateur ou admin) pour ne pas dépendre d'une seule personne.
- [ ] Procédure de traitement des signalements et des demandes RGPD connue de l'équipe.

## Vérifications

- [ ] CI GitHub au vert (types, lint, tests unitaires, build, RLS, bout en bout).
- [ ] Parcours à deux comptes réels effectué sur la production (voir [DEPLOIEMENT.md §5](DEPLOIEMENT.md#5-vérifications-après-déploiement-avec-deux-comptes-réels)), puis comptes de test supprimés.
- [ ] Test sur un vrai téléphone (iOS et Android) : inscription, recherche, messagerie, un mini-jeu.
- [ ] Sauvegarde initiale faite **et** restauration testée sur un projet séparé ([EXPLOITATION.md](EXPLOITATION.md)).
- [ ] `robots.txt` de production autorise les pages publiques ; préversions en `noindex`.
- [ ] Aucun compte, score ou statistique fictif en production.
