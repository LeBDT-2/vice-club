# Avancement de VICE CLUB

Dernière mise à jour : 17 novembre 2026.

Statut : **application complète en local, testée, prête à être déployée. Non publiée.** L'ouverture publique dépend des points des sections 3 à 5, à faire par l'éditeur.

## 1. Implémenté et testé

Vérifié par tests automatisés, en local et dans la CI GitHub Actions : 48 tests unitaires, 30 tests d'intégration sur base Supabase locale, 20 tests de bout en bout Playwright.

| Domaine | Ce qui est vérifié | Où |
| --- | --- | --- |
| Comptes | inscription avec déclaration 18+ et CGU, confirmation par e-mail, choix du pseudo, connexion (message générique en cas d'erreur), mot de passe oublié et réinitialisation, URL de retour externe ignorée, pages privées redirigées | `tests/e2e/auth.spec.ts` |
| Compte | refus d'un faux fichier image, export JSON limité à ses données (401 sans session), suppression avec mot de passe | `tests/e2e/account.spec.ts` |
| Accès | administration refusée à un membre, pages privées `no-store` et `noindex`, en-têtes de sécurité | `tests/e2e/access.spec.ts` |
| Social | demande de contact, acceptation, messagerie dans les deux sens, signalement, blocage qui ferme la conversation | `tests/e2e/social.spec.ts`, `tests/db/social.test.ts` |
| Isolation (RLS) | données privées, notifications, profil, garages privés, pseudos de plateformes selon visibilité, écritures anonymes refusées | `tests/db/isolation.test.ts` |
| Privilèges | pas d'auto-attribution de rôle, colonnes de modération protégées, outils de modération et fonctions de service inaccessibles, scores non écrivables, sanctions bloquantes | `tests/db/privileges.test.ts` |
| Garage | limites de places et de budget, véhicule non publié, doublons, garage d'autrui | `tests/db/garage-games.test.ts` |
| Moteur de jeu | score hors barème refusé, réponses simultanées (une seule retenue), partie terminée non rejouable, une partie classée par défi, invité jamais classé | `tests/db/garage-games.test.ts`, `daily-maintenance.test.ts` |
| Mini-jeux | partie complète au clavier en visiteur, aucune réponse dans le HTML, partie et images d'autrui en 404 | `tests/e2e/games.spec.ts` |
| Conservation | purge des parties invitées anciennes | `tests/db/daily-maintenance.test.ts` |
| Mobile et accessibilité | aucune page publique ne déborde à 412 px, menu mobile au clavier, lien d'évitement | `tests/e2e/responsive.spec.ts` |
| Ambiance et GTA VI | diaporama de l'accueil avec pause, échauffement « Devine la voiture » sur GTA V, section GTA VI (logo, lien officiel, mention non officiel), crédits GTA et photos publiés | `tests/e2e/home.spec.ts` |
| Logique pure | scores des 4 jeux, minuit de Paris y compris changements d'heure, redirections sûres, validations | `tests/unit/*` |

Vérifié manuellement en local (navigateur automatisé, sans test permanent) : les 4 jeux à score en compte et en visiteur, rejouer le défi du jour renvoie la même partie, classement du jour et du mois, garage (création, page publique, image de partage), double authentification de l'administration, création et publication d'un défi, refus d'un SVG en import admin, validation de média, journal d'audit, formulaire de contact et boîte de réception admin, pages légales sur mobile.

## Refonte visuelle (17 novembre 2026)

À la demande de l'éditeur : plus aucune illustration vectorielle plate. Fond photo fixe (coucher de soleil et palmiers), accueil en diaporama plein écran (Ocean Drive, Porsche sous la pluie, Countach sous les néons), titre néon animé, bandeau défilant, cartes de mini-jeux photo inclinables au survol, sections qui apparaissent au défilement, mini-jeu d'échauffement « Devine la voiture », bannières photo sur toutes les pages. 27 photos d'ambiance et 26 photos de démonstration, toutes de vraies photos sous licence libre de Wikimedia Commons, créditées sur `/sources`. Animations coupées si le système demande de réduire les animations.

## GTA V et GTA VI (17 novembre 2026)

À la demande de l'éditeur, qui accepte le risque de retrait : visuels officiels de GTA VI (logo, affiches, captures) sur l'accueil (diaporama, section « Vice City, le retour » avec compte à rebours jusqu'au 19 novembre 2026 et galerie), sur les vignettes des mini-jeux et les bannières. Mini-jeux rebasés sur GTA V : 26 véhicules réels avec prix en jeu sourcés (GTA Wiki), 5 voitures mystère, « GTA ou réalité ? » avec de vraies captures de GTA VI, échauffement « Devine la voiture » sur des voitures de GTA V. Crédits sur `/sources#gta`, mention « site non officiel » conservée. Reste fictif : la carte « Où suis-je ? » (une vraie carte de GTA V avec des lieux repérés est la prochaine étape).

## 2. Implémenté mais non vérifié dans l'environnement cible (Vercel + Supabase hébergé)

- Déploiement Vercel et projet Supabase hébergé : jamais réalisés (en attente de ton accord et de tes comptes).
- Envoi réel des e-mails par un SMTP de production (testé uniquement avec Mailpit local).
- Cloudflare Turnstile : intégré (widget, CSP, contrôle au démarrage) mais jamais testé avec de vraies clés.
- Planification pg_cron sur Supabase hébergé (testée sur la base locale).
- Limitation de débit par IP derrière Vercel (`x-forwarded-for`).
- Image de partage des garages servie depuis le stockage hébergé.
- Rafraîchissement temps réel de la conversation ouverte (Realtime) : non couvert par un test automatisé.

## 3. Configuration externe restante

Détail pas à pas dans [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md).

1. Créer les projets Supabase (préversion et production, région UE) et appliquer les migrations.
2. Configurer Auth : URL du site, redirections, modèles d'e-mails, TOTP, confirmation d'e-mail.
3. Choisir et configurer un fournisseur SMTP (SPF, DKIM, DMARC). **Décision et éventuel coût : à toi.**
4. Créer le widget Cloudflare Turnstile (gratuit) et poser les deux clés.
5. Créer le projet Vercel, renseigner les variables, relier le domaine.
6. Activer pg_cron et planifier la maintenance.
7. Créer le premier administrateur (`private.bootstrap_admin`) et activer sa double authentification.

## 4. Contenu à fournir

Détail dans [docs/CONTENU.md](docs/CONTENU.md).

- Informations légales dans `src/config/legal.ts` (rien n'a été inventé : statut, nom, adresse ou anonymat d'éditeur non professionnel, directeur de publication, e-mail de contact, région d'hébergement).
- Catalogue réel : jeux, plateformes, combinaisons avec mise en relation vérifiée (un script de départ en brouillon est fourni ; rien n'est supposé sur le multijoueur ou le jeu croisé de GTA VI).
- Images avec provenance vérifiée pour les propriétés et les lieux (véhicules, voitures mystère et « GTA ou réalité ? » : fournis par `pnpm seed:demo` à partir de GTA Wiki et du site de Rockstar).
- Prix en jeu des propriétés (ceux des 26 véhicules de GTA V sont sourcés et datés).
- Une carte avec ses lieux (et son échelle si elle est mesurée).
- Les défis du jour des premières semaines.

## 5. Bloquants avant ouverture publique

- Informations légales non complétées (alerte affichée dans `/admin` et sur les pages légales).
- Aucun SMTP de production : sans lui, les inscriptions échoueraient au-delà de quelques e-mails par heure.
- Aucun contenu réel publié : les mini-jeux afficheraient « Contenu à venir » et la recherche de joueurs n'aurait aucune combinaison jeu × plateforme ouverte.
- Le jeu de démonstration doit être absent de la production (vérification : `select * from public.demo_content_report();`).
- Parcours à deux comptes réels sur la production, sauvegarde et restauration testées ([docs/LANCEMENT.md](docs/LANCEMENT.md)).

## Limites assumées

- Pas de notifications par e-mail (demandes, messages) : notifications sur le site uniquement.
- Pas de connexion par réseau social ni de vérification des pseudos de plateformes (simples déclarations).
- Messagerie texte uniquement, sans pièces jointes.
- Publicité : aucune ; à ajouter seulement avec consentement, mise à jour des pages et changement d'offre Vercel.
- Aucun audit de sécurité externe réalisé.
