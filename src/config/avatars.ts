/**
 * Avatars tout prêts « façon GTA » que chaque joueur peut choisir sur sa page profil.
 * Ce sont des personnages ORIGINAUX (aucun personnage de Rockstar), pensés pour couvrir
 * le plus de looks possible : couleur de peau, cheveux, barbe, âge.
 *
 * Une image est servie depuis public/avatars/presets/<id>.webp. Un avatar n'apparaît
 * dans le sélecteur que lorsque son id figure dans AVATAR_READY, c'est-à-dire quand son
 * image est présente dans le dépôt (voir scripts/import-avatars.ts et docs/AVATARS.md).
 */
export type AvatarGroup = "homme" | "femme";
export type AvatarPreset = {
  id: string;
  group: AvatarGroup;
  /** Nom court affiché au survol et lu par les lecteurs d'écran. */
  label: string;
  /** Description physique précise, utilisée pour générer le portrait. */
  look: string;
  /** Image générée par IA (mention affichée sur /sources). */
  ai: boolean;
};

const p = (id: string, group: AvatarGroup, label: string, look: string): AvatarPreset => ({ id, group, label, look, ai: true });

export const AVATAR_PRESETS: AvatarPreset[] = [
  p("m01", "homme", "Le parrain", "homme blanc d'environ 45 ans, cheveux noirs plaqués en arrière, barbe de trois jours, chemise hawaïenne ouverte, chaîne en or"),
  p("m02", "homme", "Le costaud", "homme noir à la peau foncée d'environ 30 ans, crâne rasé, barbe courte bien taillée, débardeur blanc, épaules musclées"),
  p("m03", "homme", "Le gamin du quartier", "jeune homme métis d'environ 20 ans, cheveux bouclés courts noirs, fine moustache, casquette portée à l'envers, sweat à capuche"),
  p("m04", "homme", "Le cartel", "homme latino à la peau mate d'environ 35 ans, cheveux noirs longs attachés en catogan, bouc, tatouages sur le cou, chemise noire"),
  p("m05", "homme", "Le motard", "homme blanc roux d'environ 40 ans, cheveux roux mi-longs, grande barbe rousse fournie, gilet de motard en cuir"),
  p("m06", "homme", "Le pilote", "homme d'Asie de l'Est d'environ 25 ans, cheveux noirs courts en dégradé, rasé de près, veste bomber, lunettes de soleil posées sur la tête"),
  p("m07", "homme", "Le DJ", "homme noir d'environ 28 ans, longues dreadlocks, rasé de près, chemise à motifs ouverte, casque audio autour du cou"),
  p("m08", "homme", "L'homme d'affaires", "homme d'Asie du Sud à la peau brune d'environ 35 ans, cheveux noirs ondulés mi-courts, barbe complète soignée, costume clair"),
  p("m09", "homme", "Le surfeur", "jeune homme blanc d'environ 22 ans, cheveux blonds décolorés par le soleil en bataille, rasé, peau bronzée, t-shirt de surf"),
  p("m10", "homme", "Le vétéran", "homme d'environ 60 ans à la peau olive, cheveux gris courts, épaisse moustache grise, chemise en lin, chapeau panama"),
  p("f01", "femme", "La star de la plage", "femme blanche d'environ 25 ans, longs cheveux blonds ondulés, lunettes de soleil, haut de maillot sous une chemise ouverte"),
  p("f02", "femme", "La reine du club", "femme noire à la peau foncée d'environ 28 ans, grande coiffure afro naturelle, créoles dorées, rouge à lèvres prune"),
  p("f03", "femme", "La braqueuse", "femme latina à la peau mate d'environ 30 ans, longs cheveux noirs lisses en tresse sur l'épaule, regard déterminé, débardeur et veste en jean"),
  p("f04", "femme", "La pilote de rue", "femme d'Asie de l'Est d'environ 23 ans, carré noir court avec frange droite, veste en cuir, gants de conduite"),
  p("f05", "femme", "La rebelle", "femme blanche d'environ 27 ans, cheveux roux bouclés mi-longs, taches de rousseur, veste militaire"),
  p("f06", "femme", "La sportive", "femme noire d'environ 24 ans, longues tresses africaines (box braids), brassière de sport, écouteurs"),
  p("f07", "femme", "L'avocate", "femme d'Asie du Sud à la peau brune d'environ 32 ans, longs cheveux noirs en queue de cheval haute, tenue chic, boucles d'oreilles discrètes"),
  p("f08", "femme", "La punk", "femme métisse d'environ 26 ans, cheveux courts rasés sur un côté et teints en rose, piercings au nez et à l'oreille, t-shirt de groupe"),
  p("f09", "femme", "La femme d'affaires", "femme blanche d'environ 40 ans, cheveux châtains au carré long, tailleur élégant, collier fin"),
  p("f10", "femme", "La patronne", "femme d'environ 55 ans à la peau brune, cheveux argentés courts, lunettes à monture dorée, collier de perles, air assuré"),
];

/** Ids dont l'image est présente dans public/avatars/presets. Mis à jour par scripts/import-avatars.ts. */
export const AVATAR_READY: readonly string[] = [];

export const PRESET_PREFIX = "preset/";

export function readyPresets() {
  return AVATAR_PRESETS.filter((a) => AVATAR_READY.includes(a.id));
}

/** Avatar tout prêt désigné par avatar_path (« preset/<id> »), s'il existe et a son image. */
export function presetFromPath(path: string | null | undefined): AvatarPreset | null {
  if (!path?.startsWith(PRESET_PREFIX)) return null;
  const id = path.slice(PRESET_PREFIX.length);
  return readyPresets().find((a) => a.id === id) ?? null;
}

export const presetSrc = (id: string) => `/avatars/presets/${id}.webp`;

/** Style commun à tous les portraits, pour qu'ils forment une série cohérente. */
export const AVATAR_STYLE =
  "Portrait en buste, cadrage carré centré sur le visage, dans le style des illustrations peintes des écrans de chargement de Grand Theft Auto " +
  "(traits encrés, couleurs saturées, ombrage peint à la main, rendu réaliste et non cartoon). Personnage original, ne ressemblant à aucun " +
  "personnage existant ni à une personne réelle. Regard vers l'objectif. Fond : coucher de soleil rose et orange sur Vice City avec palmiers flous, " +
  "éclairage néon rose d'un côté et cyan de l'autre. Aucun texte, aucun logo, aucune signature. Format 1024 × 1024.";
