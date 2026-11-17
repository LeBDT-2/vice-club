import type { ReactNode } from "react";
import Link from "next/link";
import { Notice } from "@/components/ui/notice";
import { LEGAL, missingLegalFields } from "@/config/legal";
import { formatDateFr } from "@/lib/utils/format";

/** Valeur issue de src/config/legal.ts, ou marqueur visible « à compléter ». */
export function Fill({ value, label }: { value: string | null | undefined; label: string }) {
  if (value) return <>{value}</>;
  return <span className="todo">[{label} : à compléter]</span>;
}

export function ContactEmail() {
  return LEGAL.contactEmail ? <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a> : <Fill value={null} label="e-mail de contact" />;
}

const RELATED = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/conditions", label: "Conditions d'utilisation" },
  { href: "/regles", label: "Règles de la communauté" },
  { href: "/cookies", label: "Cookies" },
  { href: "/contact", label: "Contact et signalement" },
  { href: "/sources", label: "Sources des médias" },
];

export function LegalPage({
  title,
  intro,
  current,
  showMissing = true,
  children,
}: {
  title: string;
  intro?: ReactNode;
  current: string;
  showMissing?: boolean;
  children: ReactNode;
}) {
  const missing = showMissing ? missingLegalFields() : [];
  return (
    <div className="container-site grid gap-10 py-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <nav aria-label="Pages d'information" className="order-2 lg:order-1">
        <ul className="flex flex-wrap gap-2 lg:sticky lg:top-24 lg:flex-col lg:gap-0.5">
          {RELATED.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                aria-current={r.href === current ? "page" : undefined}
                className="inline-flex min-h-9 items-center rounded-lg px-3 text-sm text-muted hover:bg-panel hover:text-ink aria-[current=page]:bg-panel aria-[current=page]:font-semibold aria-[current=page]:text-ink"
              >
                {r.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="order-1 min-w-0 lg:order-2">
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-faint">Dernière mise à jour : {formatDateFr(LEGAL.lastUpdated)}</p>
        {missing.length > 0 && (
          <Notice tone="warning" title="Document en cours de finalisation" className="mt-6 max-w-[44rem]">
            Certaines informations de l&apos;éditeur ne sont pas encore renseignées. Elles apparaissent ci-dessous entre crochets.
          </Notice>
        )}
        {intro && <div className="mt-6 max-w-[44rem] text-lg text-ink/90">{intro}</div>}
        <div className="doc">{children}</div>
      </article>
    </div>
  );
}
