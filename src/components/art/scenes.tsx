/**
 * Illustrations originales VICE CLUB (SVG dessinés à la main pour ce projet).
 * Aucune ressource de Rockstar Games n'est utilisée. Décoratives : aria-hidden.
 */
import type { SVGProps } from "react";

type ArtProps = SVGProps<SVGSVGElement> & { idPrefix?: string };

function Palm({ x, y, s = 1, flip = false, color = "#0b0716" }: { x: number; y: number; s?: number; flip?: boolean; color?: string }) {
  const sx = flip ? -s : s;
  return (
    <g transform={`translate(${x} ${y}) scale(${sx} ${s})`} fill={color}>
      <path d="M2 0 C 6 -60, 10 -120, 22 -190 L 28 -190 C 18 -120, 14 -60, 12 0 Z" />
      <path d="M25 -192 C 0 -205, -40 -200, -70 -170 C -40 -190, -5 -192, 22 -186 Z" />
      <path d="M25 -192 C 10 -215, -20 -235, -55 -232 C -20 -222, 5 -208, 20 -188 Z" />
      <path d="M26 -193 C 40 -225, 70 -240, 100 -232 C 70 -224, 45 -210, 30 -188 Z" />
      <path d="M27 -191 C 60 -205, 100 -195, 125 -160 C 95 -185, 60 -192, 30 -186 Z" />
      <path d="M26 -190 C 35 -170, 40 -140, 30 -110 C 38 -140, 32 -168, 22 -186 Z" />
      <path d="M24 -190 C 5 -180, -15 -155, -20 -125 C -8 -155, 8 -176, 26 -186 Z" />
    </g>
  );
}

function Skyline({ y, color, windows }: { y: number; color: string; windows: string }) {
  const towers = [
    [520, 120, 40], [565, 170, 34], [604, 95, 30], [640, 210, 46], [692, 150, 28], [725, 185, 38],
    [768, 110, 30], [805, 230, 52], [862, 140, 34], [902, 175, 40], [948, 100, 30], [984, 150, 36],
  ];
  return (
    <g>
      {towers.map(([x, h, w], i) => (
        <g key={i}>
          <rect x={x} y={y - h} width={w} height={h} fill={color} />
          {i % 3 === 1 && <rect x={x + w / 2 - 2} y={y - h - 18} width={4} height={18} fill={color} />}
          {Array.from({ length: Math.floor(h / 22) }).map((_, r) => (
            <rect key={r} x={x + 6} y={y - h + 10 + r * 22} width={w - 12} height={3} fill={windows} opacity={0.55 - (r % 3) * 0.12} />
          ))}
        </g>
      ))}
    </g>
  );
}

function Coupe({ x, y, s = 1, body = "#151028", glow = "#ff3e8a" }: { x: number; y: number; s?: number; body?: string; glow?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="160" cy="92" rx="170" ry="10" fill="#000" opacity="0.45" />
      <path
        d="M10 70 C 12 55, 30 48, 70 44 L 120 20 C 140 10, 200 8, 230 18 L 280 42 C 310 46, 322 56, 322 72 L 318 84 L 14 86 Z"
        fill={body}
      />
      <path d="M128 24 L 104 44 L 200 42 L 196 20 C 170 16, 145 17, 128 24 Z" fill="#2a2350" />
      <path d="M206 20 L 210 42 L 262 40 L 232 24 C 224 21, 215 20, 206 20 Z" fill="#2a2350" />
      <path d="M14 66 L 322 64" stroke={glow} strokeWidth="2.5" opacity="0.9" />
      <rect x="300" y="52" width="20" height="6" rx="3" fill="#ffd166" />
      <rect x="10" y="58" width="16" height="6" rx="3" fill="#ff3e5b" />
      <circle cx="78" cy="84" r="22" fill="#07050d" />
      <circle cx="78" cy="84" r="11" fill="#3b3560" />
      <circle cx="252" cy="84" r="22" fill="#07050d" />
      <circle cx="252" cy="84" r="11" fill="#3b3560" />
    </g>
  );
}

/** Grande scène de la bannière : coucher de soleil, front de mer, palmiers, voiture. */
export function HeroScene({ idPrefix = "hero", ...props }: ArtProps) {
  const g = (n: string) => `${idPrefix}-${n}`;
  return (
    <svg viewBox="0 0 1200 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" {...props}>
      <defs>
        <linearGradient id={g("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#140b33" />
          <stop offset="0.38" stopColor="#4a1a63" />
          <stop offset="0.62" stopColor="#c23a7a" />
          <stop offset="0.8" stopColor="#ff8a5c" />
          <stop offset="1" stopColor="#ffc07a" />
        </linearGradient>
        <linearGradient id={g("sun")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="0.55" stopColor="#ff9a4d" />
          <stop offset="1" stopColor="#ff3e8a" />
        </linearGradient>
        <linearGradient id={g("sea")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4b2470" />
          <stop offset="1" stopColor="#0d0b22" />
        </linearGradient>
        <linearGradient id={g("road")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1430" />
          <stop offset="1" stopColor="#07060f" />
        </linearGradient>
        <linearGradient id={g("fade")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0a0f1f" stopOpacity="0.92" />
          <stop offset="0.45" stopColor="#0a0f1f" stopOpacity="0.55" />
          <stop offset="0.75" stopColor="#0a0f1f" stopOpacity="0" />
        </linearGradient>
        <clipPath id={g("sunclip")}>
          <rect x="0" y="0" width="1200" height="388" />
        </clipPath>
      </defs>
      <rect width="1200" height="640" fill={`url(#${g("sky")})`} />
      <g opacity="0.7">
        {[[120, 70], [260, 40], [420, 95], [980, 60], [1110, 110], [760, 30], [640, 80]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i % 2 ? 1.4 : 1} fill="#fff" />
        ))}
      </g>
      <g clipPath={`url(#${g("sunclip")})`}>
        <circle cx="760" cy="350" r="150" fill={`url(#${g("sun")})`} />
        {[290, 312, 332, 350, 366, 380].map((y, i) => (
          <rect key={y} x="600" y={y} width="320" height={4 + i * 1.6} fill="#c23a7a" opacity="0.85" />
        ))}
      </g>
      <Skyline y={388} color="#2a1446" windows="#ffb3d9" />
      <rect y="388" width="1200" height="120" fill={`url(#${g("sea")})`} />
      {[400, 418, 440, 466].map((y, i) => (
        <rect key={y} x={700 - i * 30} y={y} width={120 + i * 60} height="2" fill="#ffb07a" opacity={0.5 - i * 0.1} />
      ))}
      <path d="M0 500 L1200 470 L1200 640 L0 640 Z" fill={`url(#${g("road")})`} />
      <path d="M0 520 L1200 490" stroke="#2de2d0" strokeWidth="2" opacity="0.5" />
      <path d="M0 560 L1200 530" stroke="#ff3e8a" strokeWidth="1.5" opacity="0.35" strokeDasharray="38 26" />
      <Palm x={1040} y={500} s={1.45} />
      <Palm x={1150} y={505} s={1.1} flip />
      <Palm x={560} y={478} s={0.85} flip color="#1a0d2c" />
      <Palm x={470} y={480} s={0.7} color="#1a0d2c" />
      <Coupe x={740} y={470} s={1.05} />
      <rect width="1200" height="640" fill={`url(#${g("fade")})`} />
    </svg>
  );
}

/** Bandeau du défi du jour : phares dans la nuit. */
export function ChallengeScene({ idPrefix = "chal", ...props }: ArtProps) {
  const g = (n: string) => `${idPrefix}-${n}`;
  return (
    <svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" {...props}>
      <defs>
        <radialGradient id={g("l")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff6d6" />
          <stop offset="0.35" stopColor="#ffd166" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffd166" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g("bg")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#171d33" />
          <stop offset="1" stopColor="#2a1446" />
        </linearGradient>
      </defs>
      <rect width="600" height="220" fill={`url(#${g("bg")})`} />
      <path d="M150 220 C 200 120, 300 80, 420 70 C 520 64, 600 90, 600 90 L600 220 Z" fill="#0e0a1c" />
      <path d="M260 140 C 330 112, 470 104, 560 120" stroke="#ff3e8a" strokeWidth="3" fill="none" opacity="0.8" />
      <circle cx="330" cy="160" r="70" fill={`url(#${g("l")})`} />
      <circle cx="510" cy="156" r="62" fill={`url(#${g("l")})`} />
      <circle cx="330" cy="160" r="18" fill="#fffbe8" />
      <circle cx="510" cy="156" r="16" fill="#fffbe8" />
      <rect x="380" y="170" width="90" height="10" rx="5" fill="#2de2d0" opacity="0.7" />
    </svg>
  );
}

/** Illustrations des cartes de mini-jeux (compositions distinctes). */
export function GameArt({ kind, ...props }: ArtProps & { kind: string }) {
  const id = `ga-${kind}`;
  switch (kind) {
    case "garage":
      return (
        <svg viewBox="0 0 300 380" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" {...props}>
          <defs>
            <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3a1250" />
              <stop offset="1" stopColor="#0d0a1f" />
            </linearGradient>
          </defs>
          <rect width="300" height="380" fill={`url(#${id}-bg)`} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x="30" y={40 + i * 26} width="240" height="18" fill="#22183d" />
          ))}
          <rect x="30" y="34" width="240" height="4" fill="#ff3e8a" />
          <rect x="0" y="250" width="300" height="130" fill="#120d24" />
          <path d="M0 250 L300 250" stroke="#2de2d0" strokeWidth="2" opacity="0.6" />
          <Coupe x={-8} y={190} s={0.95} body="#c21d4f" glow="#ffd166" />
        </svg>
      );
    case "where":
      return (
        <svg viewBox="0 0 300 380" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" {...props}>
          <rect width="300" height="380" fill="#0f2a3a" />
          <path d="M40 80 C 90 50, 170 60, 220 100 C 260 135, 270 200, 240 250 C 210 300, 140 330, 90 300 C 40 270, 20 200, 30 150 Z" fill="#1d4a4f" />
          <path d="M70 120 C 110 100, 170 110, 200 140 C 225 170, 220 220, 190 250 C 160 275, 110 270, 85 240 C 60 210, 55 160, 70 120 Z" fill="#2a6a5c" />
          {[90, 130, 170, 210, 250, 290].map((y) => (
            <path key={y} d={`M0 ${y} L300 ${y - 40}`} stroke="#0f2a3a" strokeWidth="1" opacity="0.4" />
          ))}
          <path d="M150 210 C 150 170, 120 160, 120 135 C 120 115, 135 100, 150 100 C 165 100, 180 115, 180 135 C 180 160, 150 170, 150 210 Z" fill="#ff3e8a" />
          <circle cx="150" cy="135" r="11" fill="#0f2a3a" />
          <ellipse cx="150" cy="214" rx="18" ry="5" fill="#000" opacity="0.4" />
          <Palm x={240} y={380} s={0.9} color="#0a1b26" />
        </svg>
      );
    case "mystery":
      return (
        <svg viewBox="0 0 300 380" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" {...props}>
          <defs>
            <radialGradient id={`${id}-spot`} cx="0.5" cy="0.55" r="0.6">
              <stop offset="0" stopColor="#3b3a6e" />
              <stop offset="1" stopColor="#0c0b1d" />
            </radialGradient>
          </defs>
          <rect width="300" height="380" fill={`url(#${id}-spot)`} />
          <path d="M20 250 C 40 190, 120 170, 190 175 C 250 180, 285 205, 290 250 L 290 270 L 20 270 Z" fill="#232041" />
          <path d="M20 250 C 40 190, 120 170, 190 175 C 250 180, 285 205, 290 250" stroke="#2de2d0" strokeWidth="2" fill="none" opacity="0.7" />
          <text x="150" y="150" textAnchor="middle" fontSize="120" fontWeight="900" fontStyle="italic" fill="#ff3e8a" opacity="0.9" fontFamily="Arial, sans-serif">?</text>
          <circle cx="80" cy="272" r="22" fill="#07050d" />
          <circle cx="232" cy="272" r="22" fill="#07050d" />
        </svg>
      );
    case "price":
      return (
        <svg viewBox="0 0 300 380" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" {...props}>
          <defs>
            <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3b2a12" />
              <stop offset="1" stopColor="#120c1f" />
            </linearGradient>
          </defs>
          <rect width="300" height="380" fill={`url(#${id}-bg)`} />
          <g transform="rotate(-12 110 150)">
            <path d="M50 110 L 150 110 L 180 140 L 150 170 L 50 170 Z" fill="#ffd166" />
            <circle cx="150" cy="140" r="7" fill="#3b2a12" />
            <text x="98" y="152" textAnchor="middle" fontSize="34" fontWeight="900" fill="#3b2a12" fontFamily="Arial, sans-serif">$$$</text>
          </g>
          <g transform="rotate(10 190 240)">
            <path d="M130 210 L 230 210 L 260 240 L 230 270 L 130 270 Z" fill="#2de2d0" />
            <circle cx="230" cy="240" r="7" fill="#123b38" />
            <text x="180" y="253" textAnchor="middle" fontSize="34" fontWeight="900" fill="#123b38" fontFamily="Arial, sans-serif">$</text>
          </g>
          <text x="150" y="330" textAnchor="middle" fontSize="44" fontWeight="900" fontStyle="italic" fill="#ff3e8a" fontFamily="Arial, sans-serif">VS</text>
        </svg>
      );
    case "reality":
      return (
        <svg viewBox="0 0 300 380" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" {...props}>
          <defs>
            <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff9a7a" />
              <stop offset="1" stopColor="#5a2a6a" />
            </linearGradient>
            <pattern id={`${id}-px`} width="12" height="12" patternUnits="userSpaceOnUse">
              <rect width="12" height="12" fill="#26315c" />
              <rect width="6" height="6" fill="#2f3b6e" />
              <rect x="6" y="6" width="6" height="6" fill="#2f3b6e" />
            </pattern>
          </defs>
          <rect width="150" height="380" fill={`url(#${id}-a)`} />
          <rect x="150" width="150" height="380" fill={`url(#${id}-px)`} />
          <path d="M150 0 L150 380" stroke="#fff" strokeWidth="3" />
          <Palm x={110} y={380} s={1.1} color="#2a0f2f" />
          <g fill="#2de2d0">
            <rect x="200" y="160" width="12" height="220" />
            <rect x="170" y="140" width="72" height="24" />
            <rect x="158" y="164" width="24" height="12" />
            <rect x="230" y="164" width="24" height="12" />
          </g>
        </svg>
      );
    default:
      return null;
  }
}

/** Petite scène pour l'en-tête des pages Trouver des joueurs / Garage. */
export function BannerScene({ variant = "players", ...props }: ArtProps & { variant?: "players" | "garage" | "games" }) {
  const id = `banner-${variant}`;
  const sky = variant === "garage" ? ["#1c0f3a", "#7a2468", "#ff8a5c"] : variant === "games" ? ["#0d1d3a", "#2b2a6e", "#ff3e8a"] : ["#140b33", "#5a1f6a", "#ff7a6a"];
  return (
    <svg viewBox="0 0 1200 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" {...props}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="0.6" stopColor={sky[1]} />
          <stop offset="1" stopColor={sky[2]} />
        </linearGradient>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0a0f1f" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#0a0f1f" stopOpacity="0.4" />
          <stop offset="1" stopColor="#0a0f1f" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1200" height="260" fill={`url(#${id}-sky)`} />
      <circle cx="920" cy="250" r="90" fill="#ffb26b" opacity="0.85" />
      <Skyline y={260} color="#1b0f33" windows="#ff9fcf" />
      <Palm x={1080} y={262} s={0.95} />
      <Palm x={1150} y={262} s={0.75} flip />
      {variant === "garage" && <Coupe x={820} y={170} s={0.7} body="#22163f" />}
      <rect width="1200" height="260" fill={`url(#${id}-fade)`} />
    </svg>
  );
}
