"use client";

/* Dernier recours si la mise en page racine elle-même échoue : styles en ligne, sans dépendance. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: "100vh", background: "#0a0f1f", color: "#f5f0ff", fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center" }}>
        <main style={{ maxWidth: 480, padding: 24 }}>
          <h1 style={{ fontSize: 28, fontStyle: "italic" }}>VICE CLUB est momentanément indisponible.</h1>
          <p style={{ color: "#aaa5c4", lineHeight: 1.6 }}>Une erreur empêche l&apos;affichage du site. Réessaie dans quelques instants.</p>
          <button
            onClick={reset}
            style={{ marginTop: 16, minHeight: 44, padding: "0 20px", borderRadius: 999, border: 0, background: "#2de2d0", color: "#0a0f1f", fontWeight: 700, cursor: "pointer" }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
