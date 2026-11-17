"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

type Item = { href: string; label: string };

export function UserMenu({ trigger, items, signOut }: { trigger: React.ReactNode; items: Item[]; signOut: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-transparent pl-1 pr-2 hover:border-line"
      >
        {trigger}
        <svg viewBox="0 0 20 20" className="size-4 text-muted" aria-hidden="true" fill="currentColor">
          <path d="M5 7l5 6 5-6z" />
        </svg>
      </button>
      {open && (
        <div id={id} className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-line bg-panel p-2 shadow-[var(--shadow-lift)]">
          <ul>
            {items.map((it) => (
              <li key={it.href}>
                <Link href={it.href} onClick={() => setOpen(false)} className="flex min-h-10 items-center rounded-lg px-3 text-sm text-ink hover:bg-panel-2">
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-1 border-t border-line pt-1">{signOut}</div>
        </div>
      )}
    </div>
  );
}
