# Rôles et permissions

Trois rôles, stockés dans `public.user_roles` (absence de ligne = `user`). **Aucun utilisateur ne peut modifier son rôle** : la table n'est lisible que pour sa propre ligne et n'accepte aucune écriture depuis le navigateur. Un rôle ne s'attribue que par `admin_set_role` (administrateur en session `aal2`, motif obligatoire, journalisé, jamais sur soi-même) ou, pour le tout premier compte, par `private.bootstrap_admin` exécutée dans le SQL Editor de Supabase.

Les contrôles sont faits **trois fois** : dans la page (redirection), dans l'action serveur (`assertStaff`), et en base (RLS ou `private.require_staff` dans les fonctions SQL). La base est la barrière qui compte : même un appel direct à l'API Supabase avec la clé publique ne contourne rien.

## Ce que chacun peut faire

| Action | Visiteur | Membre | Membre sanctionné | Modérateur (MFA) | Admin (MFA) |
| --- | :-: | :-: | :-: | :-: | :-: |
| Consulter profils publics, garages publics, classements | ✓ | ✓ | ✓ | ✓ | ✓ |
| Jouer (entraînement, défi du jour) | ✓ non classé | ✓ classé | ✓ non classé | ✓ | ✓ |
| Modifier son profil, ses pseudos, ses disponibilités | | ✓ | lecture seule | ✓ | ✓ |
| Créer / modifier ses garages | | ✓ | | ✓ | ✓ |
| Envoyer une demande de contact, écrire un message | | ✓ | | ✓ | ✓ |
| Bloquer, signaler | | ✓ | ✓ | ✓ | ✓ |
| Exporter ses données | | ✓ | ✓ | ✓ | ✓ |
| Supprimer son compte | | ✓ | ✓ | ✓ | après rétrogradation par un autre admin |
| Écrire à l'équipe (/contact) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Traiter les signalements et messages de contact | | | | ✓ | ✓ |
| Masquer un profil, un garage, un message signalé | | | | ✓ | ✓ |
| Suspendre (durée) / bannir, lever une sanction | | | | ✓ | ✓ |
| Rechercher un compte par pseudo | | | | ✓ | ✓ |
| Rechercher un compte par e-mail exact (jamais affiché) | | | | | ✓ |
| Lire une conversation | participants | participants | participants | message signalé uniquement (extrait figé) | idem |
| Gérer jeux, plateformes, véhicules, propriétés, cartes, lieux, énigmes, images | | | | | ✓ |
| Valider un média (source, auteur, licence) | | | | | ✓ |
| Programmer / publier les défis du jour | | | | | ✓ |
| Paramètres (budget garage, limites) | | | | | ✓ |
| Attribuer un rôle | | | | | ✓ (pas à soi) |
| Lire le journal d'audit | | | | | ✓ |

« Sanctionné » = suspension en cours ou bannissement (`private.can_act()` renvoie faux). Le profil d'un compte banni disparaît de la recherche et des classements.

## Données par table (RLS)

Toutes les tables du schéma `public` ont la RLS activée. Résumé :

| Table | Lecture | Écriture depuis le navigateur |
| --- | --- | --- |
| `profiles` | profils listés (pseudo, non masqué, non banni) ; le sien | colonnes de profil seulement, par soi, non sanctionné (`hidden_at`, rôles… interdits) |
| `profile_private` (âge, CGU) | soi | aucune |
| `profile_handles` | selon visibilité : public / contacts acceptés / soi | soi, non sanctionné |
| `profile_games`, `availabilities` | si profil listé | soi |
| `garages`, `garage_vehicles` | propriétaire, ou public non masqué | propriétaire ; limites vérifiées par déclencheurs |
| `contact_requests` | les deux parties | aucune (fonctions `send_contact_request`, `respond_…`, `withdraw_…`) |
| `conversations`, `messages` | participants | aucune (fonction `send_message`) |
| `blocks` | ses propres blocages (on ne voit pas qui nous bloque) | suppression des siens ; ajout par `block_user` |
| `notifications` | les siennes | marquer lue, supprimer |
| `reports` | ceux qu'on a envoyés | aucune (fonction `report_content`) |
| `sanctions` | la personne concernée, l'équipe | aucune (fonctions de modération) |
| `game_sessions`, `game_rounds` | aucune | aucune : tout passe par le serveur |
| `game_results` | les siens | aucune |
| `geo_locations`, `mystery_puzzles`, `reality_items` (réponses) | aucune | aucune |
| `games`, `platforms`, `game_platforms`, `vehicles`, `properties`, `game_maps`, `daily_challenges` | publiés uniquement | aucune |
| `media_assets` | médias publics validés | aucune |
| `contact_messages` | aucune | aucune (action serveur après validation) |
| `audit_log` | administrateurs en `aal2` | aucune |
| `user_roles` | sa propre ligne | aucune |

Les écritures d'administration passent par le client serveur à clé secrète, **après** `assertStaff("admin")` (rôle + `aal2` + absence de sanction), puis sont journalisées dans `audit_log`.

## Stockage

| Compartiment | Lecture | Écriture |
| --- | --- | --- |
| `avatars` (public) | tous | serveur uniquement, après ré-encodage WebP 256 × 256 px sans métadonnées, chemin `<id utilisateur>/<aléatoire>.webp` |
| `public-media` (public) | tous | serveur (admin), ré-encodage, nom aléatoire |
| `game-media` (**privé**) | personne en direct ; images servies par `/api/jeux/<partie>/image/<n>` après contrôle de propriété | serveur (admin) |

## Tests

Ces règles sont vérifiées par `pnpm test:db` (`tests/db/*.test.ts`, base locale) et `pnpm test:e2e` : isolation entre comptes, escalade de rôle, colonnes protégées, fonctions de service inaccessibles, blocage, messagerie, limites de garage, concurrence sur les réponses, unicité du défi classé, sanctions.
