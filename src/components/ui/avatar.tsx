import Image from "next/image";
import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/utils/cn";

export function avatarUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

const palettes = [
  ["#ff3e8a", "#2a1446"],
  ["#2de2d0", "#0f2a3a"],
  ["#ff9a4d", "#3b1a2a"],
  ["#ffd166", "#2b2140"],
  ["#a78bfa", "#1e1b3a"],
];

/** Avatar de l'utilisateur ou monogramme coloré (jamais de photo inventée). */
export function Avatar({ username, path, size = 48, className }: { username: string | null; path?: string | null; size?: number; className?: string }) {
  const url = avatarUrl(path);
  const name = username ?? "?";
  const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palettes.length;
  const [fg, bg] = palettes[idx];
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-line", className)}
      style={{ width: size, height: size, background: bg }}
    >
      {url ? (
        <Image src={url} alt="" width={size} height={size} className="size-full object-cover" sizes={`${size}px`} />
      ) : (
        <span aria-hidden="true" className="display" style={{ color: fg, fontSize: size * 0.42 }}>
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}
