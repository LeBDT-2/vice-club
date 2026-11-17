"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/joueurs", label: "Trouver des joueurs" },
  { href: "/mini-jeux", label: "Mini-jeux" },
  { href: "/mon-garage", label: "Mon garage" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ orientation = "row", onNavigate }: { orientation?: "row" | "col"; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className={cn(orientation === "row" ? "flex items-center gap-1" : "flex flex-col gap-1")}>
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex min-h-11 items-center rounded-lg px-3 text-[0.95rem] font-semibold transition-colors",
                orientation === "col" && "w-full",
                active ? "text-white" : "text-muted hover:text-ink",
              )}
            >
              {item.label}
              {active && (
                <span aria-hidden="true" className={cn("absolute rounded-full bg-pink", orientation === "row" ? "inset-x-3 -bottom-0.5 h-[3px]" : "left-0 top-2 bottom-2 w-[3px]")} />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
