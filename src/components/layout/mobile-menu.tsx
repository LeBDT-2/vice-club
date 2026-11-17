"use client";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { NavLinks } from "./nav-links";

export function MobileMenu({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [lastPath, setLastPath] = useState(pathname);

  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="inline-grid size-11 place-items-center rounded-lg border border-line text-ink"
      >
        <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <div id={panelId} className="absolute inset-x-0 top-full z-40 border-b border-line bg-deep/98 px-4 pb-5 pt-2 shadow-[var(--shadow-lift)] backdrop-blur">
          <nav aria-label="Navigation principale (mobile)">
            <NavLinks orientation="col" onNavigate={() => setOpen(false)} />
          </nav>
          {children && <div className="mt-3 border-t border-line pt-3">{children}</div>}
        </div>
      )}
    </div>
  );
}
