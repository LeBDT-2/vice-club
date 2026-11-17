import type { ReactNode } from "react";
import { setContentStatusAction } from "@/server/actions/admin-content";
import { Notice, Tag } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";

export function AdminFlash({ ok, erreur }: { ok?: string; erreur?: string }) {
  if (erreur) return <Notice tone="danger">{erreur}</Notice>;
  if (ok) return <Notice tone="success">{ok}</Notice>;
  return null;
}

export function StatusTag({ status }: { status: string }) {
  if (status === "published") return <Tag tone="cyan">Publié</Tag>;
  if (status === "archived") return <Tag>Archivé</Tag>;
  return <Tag tone="gold">Brouillon</Tag>;
}

export function MediaStatusTag({ status }: { status: string }) {
  if (status === "approved") return <Tag tone="cyan">Validé</Tag>;
  if (status === "rejected") return <Tag tone="pink">Refusé</Tag>;
  return <Tag tone="gold">À vérifier</Tag>;
}

/** Boutons de changement de statut (publication soumise aux contrôles en base). */
export function StatusButtons({ table, id, status, back }: { table: string; id: string; status: string; back: string }) {
  const targets = (["published", "draft", "archived"] as const).filter((s) => s !== status);
  const label = { published: "Publier", draft: "Brouillon", archived: "Archiver" };
  return (
    <div className="flex flex-wrap gap-1.5">
      {targets.map((s) => (
        <form key={s} action={setContentStatusAction}>
          <input type="hidden" name="table" value={table} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={s} />
          <input type="hidden" name="back" value={back} />
          <Button type="submit" size="sm" variant={s === "published" ? "primary" : "ghost"}>
            {label[s]}
          </Button>
        </form>
      ))}
    </div>
  );
}

export function AdminSection({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="mb-1 block font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="text-xs text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="border-b border-line px-2 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
