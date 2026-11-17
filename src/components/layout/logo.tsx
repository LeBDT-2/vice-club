import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2 rounded-lg" aria-label="VICE CLUB, accueil">
      <svg viewBox="0 0 40 40" className="size-8 drop-shadow-[0_0_6px_rgb(255_62_138/0.8)] transition-transform duration-500 group-hover:rotate-[-8deg]" aria-hidden="true">
        <path d="M19 38 C 20 28, 21 20, 24 10 L 26 10 C 23 20, 22 28, 22 38 Z" fill="#ff3e8a" />
        <path d="M25 10 C 18 5, 9 6, 3 13 C 10 9, 18 9, 25 12 Z" fill="#ff3e8a" />
        <path d="M25 10 C 23 4, 17 0, 10 1 C 17 3, 21 6, 24 11 Z" fill="#ff7fb3" />
        <path d="M25 10 C 29 3, 35 1, 40 3 C 34 4, 30 7, 26 12 Z" fill="#ff7fb3" />
        <path d="M25 10 C 32 9, 37 13, 39 20 C 35 15, 30 12, 25 12 Z" fill="#ff3e8a" />
      </svg>
      <span className="display text-[1.35rem] tracking-tight text-ink">
        VICE <span className="neon-pink">CLUB</span>
      </span>
    </Link>
  );
}
