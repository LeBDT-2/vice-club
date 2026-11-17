export default function Loading() {
  return (
    <div className="container-site py-16" role="status" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <div aria-hidden="true" className="space-y-4">
        <div className="h-10 w-2/3 max-w-md animate-pulse rounded-lg bg-panel motion-reduce:animate-none" />
        <div className="h-4 w-1/2 max-w-sm animate-pulse rounded bg-panel motion-reduce:animate-none" />
        <div className="grid gap-3 pt-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-[var(--radius-card)] bg-panel motion-reduce:animate-none" />
          ))}
        </div>
      </div>
    </div>
  );
}
