# Guide du contenu (back-office)

Tout le contenu se gère dans `/admin` (compte administrateur avec double authentification). Chaque élément suit le même cycle : **brouillon → publié → archivé**. Seul le contenu publié est visible du public ou utilisé par les mini-jeux. Chaque action est inscrite au journal d'audit.

## Règles d'or

1. **Une image n'est utilisable qu'avec sa provenance** : source précise, auteur ou titulaire des droits, licence ou autorisation, justification d'usage. Pas d'image récupérée au hasard sur un moteur de recherche, pas d'aspiration de sites tiers.
2. **Aucune donnée inventée présentée comme réelle** : prix sourcés et datés, lieux réellement situés, réponses vérifiées.
3. **Une image générée par IA** est marquée comme telle et ne peut jamais être la « photo réelle » de « GTA ou réalité ? ».
4. Le texte alternatif d'une image de jeu **ne doit pas révéler la réponse**.

## Ordre conseillé pour ouvrir le site

1. **Jeux et plateformes** (`/admin/contenu/jeux`) : crée ou importe le catalogue (un script de départ en brouillon est fourni : `supabase/reference/catalogue-initial.sql`). Pour chaque combinaison jeu × plateforme, renseigne la version, un **groupe de jeu croisé** (même valeur = joueurs compatibles entre plateformes) uniquement si c'est confirmé officiellement, puis active **« mise en relation »**. Sans combinaison publiée avec mise en relation active, la recherche de joueurs reste vide et l'explique.
2. **Médias** (`/admin/contenu/medias`) : importe les images. Choisis **Public** (visuels de véhicules et propriétés pour le garage) ou **Privé** (captures de lieux, voitures mystère, GTA ou réalité). L'image arrive « en attente » ; un administrateur la **valide** après contrôle de la provenance.
3. **Véhicules** et **propriétés** : nom, fabricant, catégorie, image validée, **coût garage** (budget fictif VC$) et, pour « Plus cher ou moins cher ? », le prix en jeu avec son type (standard, promo, échange), sa source et sa date de vérification.
4. **Cartes et lieux** : une carte (image validée, largeur et hauteur dans son repère) ; coche « échelle vérifiée » et renseigne les mètres par unité seulement si l'échelle est mesurée. Ajoute des lieux en cliquant sur la carte et associe une capture validée.
5. **Voiture mystère** : choisis un véhicule et une image privée validée, place le point d'intérêt ; les 6 étapes de dévoilement sont générées automatiquement. Ajoute jusqu'à 5 indices progressifs.
6. **GTA ou réalité ?** : image privée validée, réponse, explication courte. La source s'affiche après la manche.
7. **Défis du jour** (`/admin/defis`) : choisis une date et un jeu, lance le tirage des manches, vérifie-les, puis publie. Le tableau de bord signale les jours sans défi publié sur les 7 prochains jours. Un défi ne peut pas être publié à une date passée, et un défi publié est verrouillé dès que sa journée commence (ni dépublication ni modification) pour que tout le monde joue les mêmes manches.
8. **Paramètres** : budget et nombre de places du garage.

Le minimum de contenu publié pour ouvrir chaque jeu est indiqué dans [JEUX.md](JEUX.md#contenu-nécessaire-pour-ouvrir-un-jeu).

## Jeu de démonstration (local et préversion uniquement)

```bash
pnpm seed:demo            # crée ou recrée le contenu de démonstration
pnpm seed:demo --remove   # le supprime entièrement (lignes et fichiers)
```

Contenu créé : un jeu fictif « Jeu de démonstration », deux plateformes « (démo) », 14 véhicules (vrais modèles, prix fictifs), 4 propriétés fictives, une carte fictive avec 8 lieux, 3 voitures mystère, 12 images « GTA ou réalité ? » et les défis des 7 prochains jours. Les images sont de vraies photos sous licence libre de Wikimedia Commons livrées dans `scripts/demo-media/` (crédits dans `credits.json`, enregistrés dans les médias) ; les images « GTA » de la démo sont ces photos retouchées par le script, ce que l'explication de chaque manche indique. Seule la carte est dessinée et tamponnée **DÉMO** ; tout est marqué `is_demo` et affiché avec un badge « Contenu de démonstration ». Il ne crée **aucun utilisateur, score ni statistique**.

Garde-fous : le script refuse `APP_ENV=production` et toute base non locale (sauf `--allow-remote`, à n'utiliser que sur une base de préversion). Avant l'ouverture, `/admin` doit n'afficher aucune alerte « Données de démonstration présentes » (SQL : `select * from public.demo_content_report();`).

## Modération au quotidien

- `/admin/signalements` : chaque signalement contient un extrait figé du contenu. Décide : masquer le contenu, sanctionner (suspension avec durée ou bannissement, motif obligatoire, visible par la personne), ou classer sans suite.
- `/admin/contact` : messages envoyés via le formulaire (questions, droits RGPD, droits d'auteur, contestations). Réponds par e-mail puis marque « traité » avec une note interne. Délai de réponse annoncé pour les demandes RGPD : un mois.
- `/admin/utilisateurs` : recherche par pseudo (et par e-mail exact pour les administrateurs), historique des sanctions, rôles.
- Demande d'ayant droit sur un média : passe immédiatement en brouillon (ou archive) les éléments qui l'utilisent et marque le média « refusé », vérifie, puis corrige le crédit ou retire l'image.

## Photos d'ambiance du site

Les fonds, bannières et vignettes des mini-jeux sont listés dans `src/config/photos.ts` (fichiers dans `public/ambiance/`). Pour en ajouter ou en remplacer une :

1. Choisir une photo sous licence libre (CC0, domaine public, CC BY ou CC BY-SA) sur Wikimedia Commons, jamais une capture de jeu ni une image trouvée au hasard.
2. La convertir en WebP de 1920 px de large au plus (par exemple `sharp`), la déposer dans `public/ambiance/`.
3. Ajouter son entrée (auteur, licence, lien vers la page Commons, texte alternatif, légende) dans `src/config/photos.ts`. Elle apparaît alors automatiquement sur `/sources`.
