# Mini-jeux, défi du jour et classements

Toutes les règles sont calculées **côté serveur** (`src/lib/games/scoring.ts`, `src/server/games/engine.ts`, fonction SQL `game_commit_answer`). Le navigateur n'envoie que la réponse du joueur, jamais un score. Les solutions ne quittent le serveur qu'après la réponse, dans la révélation de la manche.

## Principes communs

| Règle | Détail |
| --- | --- |
| Visiteur sans compte | Peut jouer à tout (entraînement et défi du jour). Sa partie est liée à un cookie aléatoire `vc_guest` (stocké en base sous forme d'empreinte SHA-256). **Jamais classée**, conservée 30 jours. |
| Compte | Doit avoir choisi un pseudo et ne pas être sanctionné pour que ses parties soient enregistrées dans « Mes résultats ». Sinon il joue comme un visiteur. |
| Entraînement | Illimité, jamais classé, expire après 2 heures d'inactivité. |
| Défi du jour | Un jeu par jour, choisi et publié par un administrateur. Change à **minuit heure de Paris** (heure d'été et d'hiver gérées). Toute la journée, tout le monde joue les mêmes manches. |
| Partie classée | Uniquement la **première** partie du défi du jour d'un compte (index unique en base). Rejouer renvoie vers la même partie, terminée ou en cours. |
| Anti-triche | Réponse liée à la manche attendue (`round_mismatch`), nombre d'essais attendu verrouillé en base (`stale_attempt`, verrou de ligne), barème borné par jeu (`invalid_score`), manches suivantes inaccessibles, images servies par une route qui vérifie la propriété de la partie (`Cache-Control: private, no-store`), limitation de débit (120 réponses/h par partie, 600/h par compte ou IP). |
| Expiration | Une partie de défi expire à minuit (Paris). Une partie expirée ne peut plus recevoir de réponse. |

## Les cinq jeux

### A. Garage ultime (`/mini-jeux/garage-ultime` → `/mon-garage`)
- Jusqu'à **5 véhicules** différents (paramètre `garage_max_vehicles`, modifiable dans /admin/parametres).
- Budget fictif de **10 000 000 VC$** (paramètre `garage_budget`). Le « coût garage » de chaque véhicule est fixé par l'équipe ; il est indépendant des prix du jeu.
- 10 garages au plus par compte (`garage_max_per_user`).
- Limites vérifiées en base par déclencheur (`garage_full`, `garage_over_budget`, `vehicle_unavailable`) : impossible de les contourner en appelant l'API directement.
- Garage privé (visible par son propriétaire seulement) ou public (affiché sur le profil, lien partageable, image Open Graph générée).

### B. Où suis-je ? (`where`)
- 5 manches. Une capture, un clic sur la carte (souris ou clavier : flèches, Maj + flèches pour aller plus vite, Entrée pour valider).
- Score par manche : `5000 × exp(−10 × d / diagonale)`, arrondi ; plein score si `d ≤ 0,5 %` de la diagonale. Maximum 25 000.
- Les distances sont exprimées dans le repère de la carte (« unités ») tant que l'échelle n'a pas été vérifiée par un administrateur (`scale_verified`, `meters_per_unit`).

### C. Voiture mystère (`mystery`)
- Une voiture, 6 essais. L'image est d'abord fortement recadrée et pixelisée ; chaque erreur la dévoile un peu plus (6 étapes générées à l'enregistrement, noms de fichiers aléatoires) et peut ajouter un indice.
- Points selon l'essai gagnant : 1 000, 800, 600, 400, 250, 100. 0 si non trouvée.
- Suggestions de modèles : uniquement les véhicules publiés (`/api/vehicules`). Grille de partage 🟥🟩 sans la réponse.

### D. Plus cher ou moins cher ? (`higher_lower`)
- Deux éléments **du même jeu avec le même type de prix** (`standard`, `promo`, `echange`) et un prix sourcé (`price_source`, `price_verified_at` obligatoires).
- Prix égaux : seule « Même prix » est correcte.
- Défi du jour : 10 manches. Entraînement : série jusqu'à la première erreur (50 au plus). 1 point par bonne réponse.

### E. GTA ou réalité ? (`reality`)
- 10 images, 100 points par bonne réponse, maximum 1 000.
- Une image marquée « générée par IA » ne peut pas être enregistrée comme « photo réelle » (refus côté serveur).
- Après chaque manche : explication, source, auteur et licence de l'image.

## Classements (`/classements`)

| Classement | Ordre |
| --- | --- |
| Du jour | Score décroissant, puis durée de partie croissante (début → fin, mesurée par le serveur), puis heure de fin. |
| Du mois et général | Somme des **points normalisés** des défis du jour classés, puis nombre de participations, puis meilleur résultat. |

**Points normalisés** : `round(1000 × score / score maximal de la partie)`. Chaque défi vaut donc au plus 1 000 points, quel que soit le jeu (sinon « Où suis-je ? », sur 25 000, écraserait les autres). Seules les parties classées comptent. N'apparaissent pas : les comptes bannis ou masqués par la modération, et les membres qui ont désactivé « Afficher mes résultats » dans leur profil.

## Contenu nécessaire pour ouvrir un jeu

Un jeu affiche « Contenu à venir » tant qu'il n'a pas ce minimum **publié** (`src/server/data/games.ts`) :

| Jeu | Minimum |
| --- | --- |
| Garage ultime | 5 véhicules |
| Où suis-je ? | 3 lieux sur une carte publiée |
| Voiture mystère | 1 énigme |
| Plus cher ou moins cher ? | 2 éléments comparables |
| GTA ou réalité ? | 5 images |

Un défi du jour ne peut être publié que si son tirage contient le nombre de manches demandé.
