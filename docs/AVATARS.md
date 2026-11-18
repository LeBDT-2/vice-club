# Avatars tout prêts : générer les 20 portraits

Les 20 personnages sont décrits dans `src/config/avatars.ts` (1 à 10 = hommes `m01`–`m10`, 11 à 20 = femmes `f01`–`f10`).

## 1. Dans ChatGPT (une seule conversation)

Colle le texte ci-dessous, puis tape « Avatar 2 », « Avatar 3 »… jusqu'à 20. Télécharge chaque image et nomme-la `avatar-01.png` … `avatar-20.png`, toutes dans le même dossier. Si un visage est raté ou ressemble à une vraie personne ou à un personnage de GTA, demande à ChatGPT de le refaire.

```
I need 20 original avatar portraits for a fan community website about GTA, in the style of Grand Theft Auto loading-screen artwork: hand-painted digital illustration, bold dark outlines, cel-shading, strong contrast, saturated colors. All characters must be original (not existing GTA characters, no celebrities), with no text, no logos and no watermark.

Common rules for EVERY image so they look like one set:
- Square format 1024×1024.
- Head and shoulders, centered, facing the viewer slightly 3/4, confident expression.
- Background: simple sunset gradient (orange → pink → purple) with a soft palm-tree silhouette. Same lighting for all.
- Modern Miami / Vice City vibe for clothes (tank top, open shirt, hoodie, jacket, sunglasses on some).

Generate them one at a time when I say "Avatar N".

MEN
1. Light skin, short brown hair, short stubble, square jaw
2. Light skin, long blond hair tied back, clean-shaven, thin face
3. Medium/tan skin, black slicked-back hair, thick full beard
4. Medium/olive skin, curly dark hair, mustache, round face
5. Dark skin, short fade haircut, thin goatee
6. Dark skin, shoulder-length locs, short beard
7. East Asian, black undercut hair, clean-shaven, sunglasses
8. South Asian, wavy black hair, full trimmed beard
9. Light skin with freckles, red/ginger hair, red beard
10. Older man (50s), grey hair, grey beard, wrinkles, gold chain

WOMEN
11. Light skin, long straight blonde hair, sunglasses on head
12. Light skin, short black bob, red lipstick
13. Medium/tan skin, long wavy brown hair, hoop earrings
14. Medium/olive skin, dark hair in a high ponytail, freckles
15. Dark skin, big natural afro, gold earrings
16. Dark skin, long box braids, nose piercing
17. East Asian, long straight black hair with bangs
18. South Asian, long dark hair in a side braid
19. Light skin, pink/dyed short pixie cut, tattoos on shoulder
20. Older woman (50s), silver hair in a bun, elegant

Start with "Avatar 1".
```

## 2. Import dans le site

```
cd C:\Users\morea\Documents\vice-club
git pull
pnpm.cmd import:avatars C:\Users\morea\Documents\avatars
```

Le script recadre chaque image en 256 × 256, la convertit en WebP dans `public/avatars/presets/` et active les avatars correspondants. Ensuite : `git add -A`, commit et push (Vercel republie le site).

Autre possibilité : une seule image en grille 5 colonnes × 4 lignes (hommes sur les lignes 1-2, femmes sur 3-4), importée avec `pnpm.cmd import:avatars --grille C:\chemin\grille.png`. Les visages sont alors plus petits.
