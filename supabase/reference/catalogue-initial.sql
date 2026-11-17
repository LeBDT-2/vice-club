-- ---------------------------------------------------------------------------
-- Catalogue de départ OPTIONNEL : jeux et plateformes réels, tous en BROUILLON.
-- Rien n'est publié ni ouvert à la mise en relation : un administrateur vérifie
-- chaque ligne dans /admin/contenu/jeux (versions, jeu croisé, notes), puis publie.
--
-- Usage (une seule fois, idempotent) : coller dans le SQL Editor de Supabase.
-- Ce fichier n'est PAS une migration et n'est pas appliqué automatiquement.
--
-- Aucun « crossplay_group » n'est renseigné : deux plateformes ne sont déclarées
-- compatibles qu'après vérification par l'équipe. La mise en relation reste
-- désactivée (matchmaking_enabled = false) tant que l'équipe ne l'a pas activée.
-- ---------------------------------------------------------------------------

insert into public.platforms (slug, name, short_name, sort_order, status) values
  ('ps5', 'PlayStation 5', 'PS5', 10, 'draft'),
  ('xbox-series', 'Xbox Series X|S', 'Xbox Series', 20, 'draft'),
  ('pc', 'PC', 'PC', 30, 'draft'),
  ('ps4', 'PlayStation 4', 'PS4', 40, 'draft'),
  ('xbox-one', 'Xbox One', 'Xbox One', 50, 'draft')
on conflict (slug) do nothing;

insert into public.games (slug, name, short_name, description, sort_order, status) values
  ('gta-online', 'Grand Theft Auto Online', 'GTA Online', 'Mode en ligne de Grand Theft Auto V.', 10, 'draft'),
  ('gta-vi', 'Grand Theft Auto VI', 'GTA VI', 'Fonctions en ligne non confirmées à la date de rédaction : à vérifier avant toute ouverture de la mise en relation.', 20, 'draft'),
  ('gta-v', 'Grand Theft Auto V', 'GTA V', 'Mode histoire. Utile pour le catalogue (véhicules, lieux) des mini-jeux.', 30, 'draft')
on conflict (slug) do nothing;

-- Combinaisons proposées pour la recherche de joueurs : toutes en brouillon, mise en relation désactivée.
insert into public.game_platforms (game_id, platform_id, version_label, matchmaking_enabled, notes, status)
select g.id, p.id, v.version_label, false, v.notes, 'draft'
from (values
  ('gta-online', 'ps5', '', 'À vérifier : version et jeu croisé avant publication.'),
  ('gta-online', 'xbox-series', '', 'À vérifier : version et jeu croisé avant publication.'),
  ('gta-online', 'pc', '', 'À vérifier : édition PC (Legacy / Enhanced) et compatibilité entre éditions.'),
  ('gta-vi', 'ps5', '', 'Plateforme annoncée. Mode en ligne non confirmé : ne pas activer la mise en relation sans source officielle.'),
  ('gta-vi', 'xbox-series', '', 'Plateforme annoncée. Mode en ligne non confirmé : ne pas activer la mise en relation sans source officielle.')
) as v(game_slug, platform_slug, version_label, notes)
join public.games g on g.slug = v.game_slug
join public.platforms p on p.slug = v.platform_slug
on conflict (game_id, platform_id, version_label) do nothing;
