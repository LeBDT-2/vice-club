"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth/viewer";
import { KIND_TO_SLUG } from "@/lib/games/catalog";
import type { GameKind } from "@/lib/games/scoring";
import { RateLimitError, enforceRateLimits } from "@/lib/security/rate-limit";
import { clientIpFingerprint } from "@/lib/security/request";
import { type AnswerOutcome, startGame, submitAnswer } from "@/server/games/engine";

const kindSchema = z.enum(["where", "mystery", "higher_lower", "reality"]);
const modeSchema = z.enum(["training", "daily"]);

/** Démarre (ou reprend) une partie puis redirige vers son écran. */
export async function startGameAction(form: FormData) {
  const kind = kindSchema.parse(form.get("kind"));
  const mode = modeSchema.parse(form.get("mode"));
  const slug = KIND_TO_SLUG[kind as GameKind];
  const viewer = await getViewer();
  try {
    const ip = await clientIpFingerprint();
    await enforceRateLimits(
      viewer
        ? [{ key: `game_start:user:${viewer.id}`, max: 60, windowSeconds: 3600 }]
        : [{ key: `game_start:ip:${ip}`, max: 40, windowSeconds: 3600 }],
    );
  } catch (e) {
    if (e instanceof RateLimitError) redirect(`/mini-jeux/${slug}?erreur=rate_limited`);
    throw e;
  }
  const result = await startGame(kind, mode, viewer);
  if ("error" in result) {
    if (result.error === "already_played" && result.sessionId) redirect(`/mini-jeux/${slug}/partie/${result.sessionId}`);
    redirect(`/mini-jeux/${slug}?erreur=${result.error}`);
  }
  redirect(`/mini-jeux/${slug}/partie/${result.sessionId}`);
}

const answerSchema = z.object({
  sessionId: z.uuid(),
  position: z.number().int().min(1).max(100),
  input: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("where"), x: z.number().finite().min(-1e6).max(1e6), y: z.number().finite().min(-1e6).max(1e6) }),
    z.object({ kind: z.literal("mystery"), vehicleId: z.uuid() }),
    z.object({ kind: z.literal("higher_lower"), choice: z.enum(["a", "b", "equal"]) }),
    z.object({ kind: z.literal("reality"), answer: z.enum(["gta", "reality"]) }),
  ]),
});

/**
 * Soumet UNE réponse. Le navigateur n'envoie que le choix du joueur : le score,
 * la validité et la progression sont calculés exclusivement côté serveur.
 */
export async function submitAnswerAction(payload: unknown): Promise<AnswerOutcome | { ok: false; error: "rate_limited" }> {
  const parsed = answerSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const viewer = await getViewer();
  try {
    await enforceRateLimits([
      { key: `game_answer:session:${parsed.data.sessionId}`, max: 120, windowSeconds: 3600 },
      viewer
        ? { key: `game_answer:user:${viewer.id}`, max: 600, windowSeconds: 3600 }
        : { key: `game_answer:ip:${await clientIpFingerprint()}`, max: 600, windowSeconds: 3600 },
    ]);
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: "rate_limited" };
    throw e;
  }
  return submitAnswer(parsed.data.sessionId, parsed.data.position, parsed.data.input, viewer);
}
