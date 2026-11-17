import { getViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { roundImagePath } from "@/server/games/engine";

/**
 * Image de la manche en cours, servie depuis le bucket privé game-media après
 * contrôle de propriété de la partie. Le nom de fichier réel n'est jamais exposé
 * et aucune manche future n'est accessible.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string; position: string }> }) {
  const { sessionId, position } = await params;
  const pos = Number(position);
  if (!Number.isInteger(pos) || pos < 1 || pos > 100) return new Response(null, { status: 404 });
  const viewer = await getViewer();
  const path = await roundImagePath(sessionId, pos, viewer);
  if (!path) return new Response(null, { status: 404 });
  const { data, error } = await createAdminClient().storage.from("game-media").download(path);
  if (error || !data) return new Response(null, { status: 404 });
  return new Response(data.stream(), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline; filename=manche.webp",
    },
  });
}
