import Link from "next/link";
import { GuessTeaser } from "@/components/ambiance/guess-teaser";
import { HeroSlideshow } from "@/components/ambiance/hero-slideshow";
import { GameArt, GameArtCredit } from "@/components/ambiance/game-art";
import { Photo } from "@/components/ambiance/photo";
import { GTA6, GTA6_CREDIT } from "@/config/gta";
import { Gta6Section } from "@/components/ambiance/gta6-section";
import { ChallengeBanner } from "@/components/games/challenge-banner";
import { GameCard } from "@/components/games/game-card";
import { TiltCard } from "@/components/ambiance/tilt-card";
import { PlayerCard } from "@/components/players/player-card";
import { buttonClass } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/viewer";
import { MINI_GAMES } from "@/lib/games/catalog";
import { formatVc } from "@/lib/utils/format";
import { getSettings } from "@/server/data/catalog";
import { gameAvailability, todayChallenge } from "@/server/data/games";
import { searchPlayers } from "@/server/data/players";

export default async function Home() {
  const viewer = await getViewer();
  const [challenge, availability, now, soon, settings] = await Promise.all([
    todayChallenge(),
    gameAvailability(),
    searchPlayers({ dispo: "maintenant", page: 1 }, viewer?.id ?? null),
    searchPlayers({ dispo: "bientot", page: 1 }, viewer?.id ?? null),
    getSettings(),
  ]);
  // Uniquement des profils réels ayant déclaré une disponibilité.
  const seen = new Set<string>();
  const players = [...now.players, ...soon.players].filter((p) => !seen.has(p.id) && seen.add(p.id)).slice(0, 4);

  const live = now.total ?? now.players.length;
  const slides = (["jasonLuciaPalmiers", "crepuscule", "plage", "skyline", "cheetah"] as const).map((k) => ({
    src: GTA6[k].src,
    caption: `GTA VI : ${GTA6[k].caption}`,
    credit: GTA6_CREDIT,
    href: "/sources#gta",
  }));
  const words = ["Ta", "prochaine", "virée"];
  const shot = "Capture de GTA V © Rockstar Games, via GTA Wiki";
  const teaser = [
    { src: "/gta/v/t20.webp", answer: "Progen T20", choices: ["Pegassi Osiris", "Progen T20", "Grotti Turismo R"], credit: shot },
    { src: "/gta/v/coquette-classic.webp", answer: "Invetero Coquette Classic", choices: ["Grotti Stinger", "Invetero Coquette Classic", "Pegassi Monroe"], credit: shot },
    { src: "/gta/v/dominator.webp", answer: "Vapid Dominator", choices: ["Vapid Dominator", "Bravado Gauntlet", "Declasse Sabre Turbo"], credit: shot },
  ];
  const ticker = [...MINI_GAMES.map((g) => g.title), "Défi du jour", "Classements", "Mon garage"];

  return (
    <>
      <section className="scanlines relative isolate flex min-h-[min(92svh,54rem)] flex-col overflow-hidden">
        <HeroSlideshow slides={slides} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-night/90 via-night/45 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-gradient-to-t from-night via-night/60 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-night/70 to-transparent" aria-hidden="true" />
        <div className="container-site flex flex-1 flex-col justify-center pb-24 pt-16">
          <p className="rise glass inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold" style={{ ["--d" as string]: "0ms" }}>
            {live > 0 ? (
              <>
                <span className="live-dot" aria-hidden="true" />
                {live} joueur{live > 1 ? "s" : ""} dispo maintenant
              </>
            ) : (
              <>
                <span className="live-dot !bg-pink" aria-hidden="true" />
                Communauté francophone, gratuite et indépendante
              </>
            )}
          </p>
          <h1 className="display mt-5 max-w-5xl text-[3.2rem] leading-[0.95] sm:text-7xl xl:text-[6.5rem]">
            {words.map((w, n) => (
              <span key={w}>
                <span className="rise" style={{ ["--d" as string]: `${120 + n * 110}ms` }}>
                  {w}
                </span>{" "}
              </span>
            ))}
            <br />
            <span className="neon-on neon-pink" style={{ ["--d" as string]: "650ms" }}>
              commence ici.
            </span>
          </h1>
          <p className="rise mt-6 max-w-md text-lg text-ink/90 sm:text-xl" style={{ ["--d" as string]: "900ms" }}>
            Trouve ton équipe. Crée ton garage. Défie tes amis.
          </p>
          <div className="rise mt-8 flex flex-wrap gap-3" style={{ ["--d" as string]: "1050ms" }}>
            <Link href="/joueurs" className={buttonClass("primary", "lg", "shadow-[0_0_28px_rgb(45_226_208/0.45)]")}>
              Trouver des joueurs
            </Link>
            <Link href="/defi-du-jour" className={buttonClass("secondary", "lg", "glass")}>
              Jouer au défi du jour
            </Link>
          </div>
        </div>
      </section>

      <div className="marquee-wrap relative overflow-hidden border-y border-pink/30 bg-night/70 py-3 backdrop-blur" aria-hidden="true">
        <div className="marquee">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center">
              {ticker.map((t) => (
                <span key={t} className="display flex items-center whitespace-nowrap px-6 text-xl">
                  <span className={k === 0 ? "neon-pink" : "neon-cyan"}>{t}</span>
                  <span className="ml-12 text-gold">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="container-site space-y-16 py-12">
        <Gta6Section />

        <div className="reveal">
          <ChallengeBanner challenge={challenge} />
        </div>

        <section aria-labelledby="jeux-titre" className="reveal">
          <div className="flex items-end justify-between gap-3">
            <h2 id="jeux-titre" className="display text-3xl">
              À toi de jouer
            </h2>
            <Link href="/mini-jeux" className="text-sm text-cyan underline">
              Tous les mini-jeux
            </Link>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {MINI_GAMES.map((g) => (
              <li key={g.slug}>
                <GameCard game={g} ready={availability[g.kind].ready} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="devine-titre" className="reveal">
          <GuessTeaser rounds={teaser} />
        </section>

        <section aria-labelledby="joueurs-titre" className="reveal">
          <div className="flex items-end justify-between gap-3">
            <h2 id="joueurs-titre" className="display text-3xl">
              Disponibles pour jouer
            </h2>
            <Link href="/joueurs?dispo=maintenant" className="text-sm text-cyan underline">
              Voir tous les joueurs
            </Link>
          </div>
          {players.length > 0 ? (
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {players.map((p) => (
                <li key={p.id}>
                  <PlayerCard player={p} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="relative mt-5 flex flex-col gap-4 overflow-hidden rounded-[var(--radius-card)] border border-line p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <Photo name="promeneurs" sizes="(min-width: 1216px) 76rem, 100vw" position="center 60%" />
              <div className="absolute inset-0 bg-gradient-to-r from-night via-night/85 to-night/40" aria-hidden="true" />
              <div className="relative">
                <p className="text-lg font-bold">Personne n&apos;a encore déclaré de session pour ce soir.</p>
                <p className="mt-1 max-w-xl text-muted">
                  Le club démarre : indique quand tu joues et sur quelle plateforme, et les prochains inscrits te trouveront ici.
                </p>
              </div>
              <Link href={viewer ? "/compte/profil#h-dispo" : "/inscription"} className={buttonClass("pink", "md", "relative shrink-0")}>
                {viewer ? "Déclarer ma dispo" : "Créer mon profil"}
              </Link>
            </div>
          )}
        </section>

        <section aria-labelledby="bande-titre" className="reveal">
          <h2 id="bande-titre" className="display text-3xl sm:text-4xl">
            Ici, personne ne roule seul.
          </h2>
          <p className="mt-2 max-w-xl text-ink/80">Indique ta plateforme, ton style et tes créneaux : le club te propose les joueurs qui te correspondent.</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {(
              [
                ["skateurCoucher", "Les noctambules", "Ils lancent la session quand le soleil se couche.", "/joueurs?dispo=maintenant"],
                ["skateurPalmiers", "Les chill", "Balade, photos, garage : sans pression.", "/joueurs"],
                ["longboardSoleil", "Les compétiteurs", "Défi du jour, classements et records.", "/classements"],
              ] as const
            ).map(([photo, title, text, href]) => (
              <li key={title}>
                <TiltCard>
                  <Link href={href} className="group relative flex aspect-[16/10] flex-col justify-end overflow-hidden rounded-[var(--radius-card)] border border-line p-5 sm:aspect-[3/4]">
                    <Photo name={photo} sizes="(min-width: 640px) 25rem, 100vw" imgClassName="photo-zoom" />
                    <div className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-transparent" aria-hidden="true" />
                    <div className="relative">
                      <h3 className="display text-2xl">{title}</h3>
                      <p className="mt-1 text-sm text-ink/85">{text}</p>
                    </div>
                  </Link>
                </TiltCard>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="garage-titre" className="reveal parallax relative overflow-hidden rounded-[var(--radius-card)] border border-line">
          <GameArt art="garage" sizes="(min-width: 1216px) 76rem, 100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-night via-night/75 to-transparent" aria-hidden="true" />
          <div className="relative grid min-h-[22rem] gap-6 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-xl self-end">
              <p className="inline-flex rounded-full bg-pink px-3 py-1 text-xs font-bold text-white shadow-[0_0_18px_rgb(255_62_138/0.6)]">Garage de rêve</p>
              <h2 id="garage-titre" className="display mt-3 text-4xl sm:text-5xl">
                Ton garage ultime
              </h2>
              <p className="mt-3 text-ink/85">
                {settings.garageMaxVehicles} places, {formatVc(settings.garageBudget)} de budget fictif. Compose ta sélection, garde-la privée ou affiche-la sur ton
                profil et partage son lien.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <Link href="/mon-garage" className={buttonClass("primary", "lg")}>
                Composer mon garage
              </Link>
              <GameArtCredit art="garage" />
            </div>
          </div>
          <span className="neon-sweep" aria-hidden="true" />
        </section>
      </div>
    </>
  );
}
