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
  p("m01", "homme", "Le chauffeur", "homme à la peau claire, cheveux châtains courts, barbe de trois jours, mâchoire carrée"),
  p("m02", "homme", "Le surfeur", "homme à la peau claire, longs cheveux blonds attachés, rasé, visage fin"),
  p("m03", "homme", "Le parrain", "homme à la peau hâlée, cheveux noirs plaqués en arrière, barbe noire fournie"),
  p("m04", "homme", "Le charmeur", "homme à la peau olive, cheveux bruns bouclés, moustache, visage rond"),
  p("m05", "homme", "Le costaud", "homme à la peau noire, coupe dégradée courte, bouc fin"),
  p("m06", "homme", "Le DJ", "homme à la peau noire, dreadlocks aux épaules, barbe courte"),
  p("m07", "homme", "Le pilote", "homme d'Asie de l'Est, cheveux noirs en undercut, rasé, lunettes de soleil"),
  p("m08", "homme", "L'homme d'affaires", "homme d'Asie du Sud, cheveux noirs ondulés, barbe complète taillée"),
  p("m09", "homme", "Le motard", "homme à la peau claire avec taches de rousseur, cheveux roux, barbe rousse"),
  p("m10", "homme", "Le vétéran", "homme d'une cinquantaine d'années, cheveux et barbe gris, rides, chaîne en or"),
  p("f01", "femme", "La star de la plage", "femme à la peau claire, longs cheveux blonds lisses, lunettes de soleil sur la tête"),
  p("f02", "femme", "La pilote de rue", "femme à la peau claire, carré noir court, rouge à lèvres rouge"),
  p("f03", "femme", "La braqueuse", "femme à la peau hâlée, longs cheveux bruns ondulés, créoles"),
  p("f04", "femme", "La rebelle", "femme à la peau olive, cheveux foncés en queue de cheval haute, taches de rousseur"),
  p("f05", "femme", "La reine du club", "femme à la peau noire, grande coiffure afro naturelle, boucles d'oreilles dorées"),
  p("f06", "femme", "La sportive", "femme à la peau noire, longues tresses africaines, piercing au nez"),
  p("f07", "femme", "La hackeuse", "femme d'Asie de l'Est, longs cheveux noirs lisses avec frange"),
  p("f08", "femme", "L'avocate", "femme d'Asie du Sud, longs cheveux foncés en tresse sur le côté"),
  p("f09", "femme", "La punk", "femme à la peau claire, cheveux courts coupe pixie teints en rose, tatouages sur l'épaule"),
  p("f10", "femme", "La patronne", "femme d'une cinquantaine d'années, cheveux argentés en chignon, élégante"),
];

/** Ids dont l'image est présente dans public/avatars/presets. Mis à jour par scripts/import-avatars.ts. */
export const AVATAR_READY: readonly string[] = ["m01", "m02", "m03", "m04", "m05", "m06", "m07", "m08", "m09", "m10", "f01", "f02", "f03", "f04", "f05", "f06", "f07", "f08", "f09", "f10"];

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
