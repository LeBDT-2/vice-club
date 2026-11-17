import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { GamePlayer } from "@/components/games/player";
import { getViewer } from "@/lib/auth/viewer";
import { KIND_TO_SLUG } from "@/lib/games/catalog";
import { getGameState } from "@/server/games/engine";

export const metadata: Metadata = { title: "Partie en cours", robots: { index: false, follow: false } };

export default async function GameSessionPage({ params }: { params: Promise<{ slug: string; sessionId: string }> }) {
  const { slug, sessionId } = await params;
  const viewer = await getViewer();
  const state = await getGameState(sessionId, viewer);
  if (!state) notFound();
  if (KIND_TO_SLUG[state.kind] !== slug) redirect(`/mini-jeux/${KIND_TO_SLUG[state.kind]}/partie/${sessionId}`);
  const account = !viewer ? "guest" : !viewer.username ? "no_username" : "member";
  return <GamePlayer state={state} account={account} />;
}
