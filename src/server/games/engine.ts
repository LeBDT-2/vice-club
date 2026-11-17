import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import type { Viewer } from "@/lib/auth/viewer";
import { isProduction } from "@/lib/env";
import {
  type GameKind,
  HIGHER_LOWER_TRAINING_MAX,
  MYSTERY_MAX_ATTEMPTS,
  REALITY_ROUNDS,
  WHERE_ROUNDS,
  clampToMap,
  formatDistance,
  higherLowerCorrect,
  mapDistance,
  maxScoreFor,
  mysteryScore,
  mysteryShareGrid,
  realityScore,
  whereScore,
  type PriceChoice,
} from "@/lib/games/scoring";
import { KIND_LABEL } from "@/lib/games/catalog";
import { nextChallengeReset, parisDate } from "@/lib/utils/paris-time";
import { publicEnv } from "@/lib/env";
import {
  NotEnoughContentError,
  loadGeoLocation,
  loadMysteryPuzzle,
  loadPriceItem,
  loadRealityItem,
  pickPricePair,
  pickTrainingRounds,
  type RoundRef,
} from "./content";

const GUEST_COOKIE = "vc_guest";
const TRAINING_TTL_MS = 2 * 3600_000;

// ------------------------------------------------------------------ Propriétaire
export type Owner = { userId: string | null; guestHash: string | null; ranked: boolean };

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function readGuestHash(): Promise<string | null> {
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  return token && /^[A-Za-z0-9_-]{40,64}$/.test(token) ? hashToken(token) : null;
}

/** Les invités reçoivent un jeton aléatoire (cookie httpOnly) ; seule son empreinte est stockée. */
async function ensureGuestHash(): Promise<string> {
  const existing = await readGuestHash();
  if (existing) return existing;
  const token = randomBytes(32).toString("base64url");
  (await cookies()).set(GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return hashToken(token);
}

/** Seul un compte avec pseudo et sans sanction peut produire des résultats enregistrés et classés. */
async function ownerFor(viewer: Viewer | null, create: boolean): Promise<Owner> {
  if (viewer && viewer.username && !viewer.sanction) return { userId: viewer.id, guestHash: null, ranked: true };
  const guestHash = create ? await ensureGuestHash() : await readGuestHash();
  return { userId: null, guestHash, ranked: false };
}

type SessionRow = {
  id: string;
  game_kind: string;
  mode: string;
  user_id: string | null;
  guest_token_hash: string | null;
  challenge_id: string | null;
  challenge_date: string | null;
  ranked: boolean;
  status: string;
  current_position: number;
  total_rounds: number | null;
  score: number;
  max_score: number | null;
  meta: unknown;
  started_at: string;
  expires_at: string;
  finished_at: string | null;
};

async function loadOwnedSession(admin: AdminClient, sessionId: string, viewer: Viewer | null): Promise<SessionRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  const { data } = await admin.from("game_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!data) return null;
  if (data.user_id) return viewer?.id === data.user_id ? data : null;
  const guestHash = await readGuestHash();
  return guestHash && data.guest_token_hash === guestHash ? data : null;
}

// ------------------------------------------------------------- Défi du jour
export async function getTodayChallenge(admin: AdminClient = createAdminClient(), at = new Date()) {
  const date = parisDate(at);
  const { data } = await admin
    .from("daily_challenges")
    .select("id, challenge_date, game_kind, title, round_count")
    .eq("challenge_date", date)
    .eq("status", "published")
    .maybeSingle();
  return data ? { ...data, game_kind: data.game_kind as GameKind } : null;
}

// ------------------------------------------------------------ Démarrage
export type StartResult = { sessionId: string } | { error: "no_content" | "no_challenge" | "already_played" | "rate_limited"; sessionId?: string };

export async function startGame(kind: GameKind, mode: "training" | "daily", viewer: Viewer | null): Promise<StartResult> {
  const admin = createAdminClient();
  const owner = await ownerFor(viewer, true);
  const now = new Date();

  let rounds: RoundRef[];
  let challenge: Awaited<ReturnType<typeof getTodayChallenge>> = null;
  let expiresAt = new Date(now.getTime() + TRAINING_TTL_MS);

  if (mode === "daily") {
    challenge = await getTodayChallenge(admin, now);
    if (!challenge || challenge.game_kind !== kind) return { error: "no_challenge" };
    // Reprise d'une partie existante (un seul essai classé par défi).
    const existingQuery = admin.from("game_sessions").select("id, status").eq("challenge_id", challenge.id).eq("mode", "daily");
    const { data: existing } = owner.userId
      ? await existingQuery.eq("user_id", owner.userId).eq("ranked", true).maybeSingle()
      : await existingQuery.eq("guest_token_hash", owner.guestHash!).eq("status", "active").order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (existing) {
      return existing.status === "active" ? { sessionId: existing.id } : { error: "already_played", sessionId: existing.id };
    }
    const { data: items } = await admin
      .from("daily_challenge_items")
      .select("position, ref_type, ref_id, ref_b_type, ref_b_id")
      .eq("challenge_id", challenge.id)
      .order("position");
    if (!items || items.length !== challenge.round_count) return { error: "no_challenge" };
    rounds = items.map((i) => ({ ...i, max_attempts: kind === "mystery" ? MYSTERY_MAX_ATTEMPTS : 1 }));
    expiresAt = nextChallengeReset(now);
  } else {
    try {
      const count = kind === "where" ? WHERE_ROUNDS : kind === "reality" ? REALITY_ROUNDS : 1;
      rounds = await pickTrainingRounds(admin, kind, count);
    } catch (e) {
      if (e instanceof NotEnoughContentError) return { error: "no_content" };
      throw e;
    }
  }

  const total = mode === "training" && kind === "higher_lower" ? null : rounds.length;
  const { data: session, error } = await admin
    .from("game_sessions")
    .insert({
      game_kind: kind,
      mode,
      user_id: owner.userId,
      guest_token_hash: owner.userId ? null : owner.guestHash,
      challenge_id: challenge?.id ?? null,
      challenge_date: challenge?.challenge_date ?? null,
      ranked: mode === "daily" && owner.ranked,
      total_rounds: total,
      max_score: total === null ? null : maxScoreFor(kind, total),
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    // Course entre deux onglets : la contrainte unique protège l'essai classé.
    if (error.code === "23505") return { error: "already_played" };
    throw new Error("session_create_failed");
  }
  const { error: rErr } = await admin.from("game_rounds").insert(rounds.map((r, i) => ({ session_id: session.id, position: i + 1, ...r })));
  if (rErr) {
    await admin.from("game_sessions").delete().eq("id", session.id);
    throw new Error("rounds_create_failed");
  }
  return { sessionId: session.id };
}

// ------------------------------------------------------------ État public
function imageUrl(sessionId: string, position: number, v: number) {
  return `/api/jeux/${sessionId}/image/${position}?v=${v}`;
}
function publicMediaUrl(path: string | null | undefined) {
  return path ? `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public-media/${path}` : null;
}

const PRICE_TYPE_LABEL: Record<string, string> = { standard: "Prix standard", promo: "Prix promotionnel", echange: "Prix d'échange" };

export type PublicRound =
  | { kind: "where"; position: number; imageUrl: string; isDemo: boolean; map: { name: string; width: number; height: number; imageUrl: string | null; scaleVerified: boolean } }
  | { kind: "mystery"; position: number; imageUrl: string; isDemo: boolean; attemptsUsed: number; maxAttempts: number; hints: string[]; guesses: { name: string; correct: boolean }[]; gameId: string }
  | {
      kind: "higher_lower";
      position: number;
      isDemo: boolean;
      priceTypeLabel: string;
      items: { name: string; subtitle: string; imageUrl: string | null; priceNote: string; gameName: string }[];
    }
  | { kind: "reality"; position: number; imageUrl: string; isDemo: boolean };

export type GameState = {
  id: string;
  kind: GameKind;
  mode: "training" | "daily";
  ranked: boolean;
  status: "active" | "finished" | "expired";
  position: number;
  totalRounds: number | null;
  score: number;
  maxScore: number | null;
  expiresAt: string;
  challengeDate: string | null;
  round: PublicRound | null;
  history: { position: number; score: number | null; result: unknown }[];
  shareText: string | null;
  personalBest: number | null;
};

export async function getGameState(sessionId: string, viewer: Viewer | null): Promise<GameState | null> {
  const admin = createAdminClient();
  let s = await loadOwnedSession(admin, sessionId, viewer);
  if (!s) return null;
  if (s.status === "active" && new Date(s.expires_at) <= new Date()) {
    await admin.from("game_sessions").update({ status: "expired" }).eq("id", s.id).eq("status", "active");
    s = { ...s, status: "expired" };
  }
  const kind = s.game_kind as GameKind;
  const { data: rounds } = await admin
    .from("game_rounds")
    .select("position, ref_type, ref_id, ref_b_type, ref_b_id, attempts, max_attempts, answers, result, score, answered_at")
    .eq("session_id", s.id)
    .order("position");

  const history = (rounds ?? []).filter((r) => r.answered_at).map((r) => ({ position: r.position, score: r.score, result: r.result }));
  const current = s.status === "active" ? (rounds ?? []).find((r) => r.position === s!.current_position && !r.answered_at) : undefined;
  let round: PublicRound | null = null;

  if (current) {
    if (kind === "where") {
      const loc = await loadGeoLocation(admin, current.ref_id);
      if (loc?.game_maps) {
        round = {
          kind,
          position: current.position,
          imageUrl: imageUrl(s.id, current.position, 0),
          isDemo: loc.is_demo,
          map: {
            name: loc.game_maps.name,
            width: Number(loc.game_maps.width),
            height: Number(loc.game_maps.height),
            imageUrl: publicMediaUrl(loc.game_maps.image?.path),
            scaleVerified: loc.game_maps.scale_verified,
          },
        };
      }
    } else if (kind === "mystery") {
      const pz = await loadMysteryPuzzle(admin, current.ref_id);
      if (pz?.vehicles) {
        const guessIds = (current.answers as { vehicle_id: string }[]).map((a) => a.vehicle_id);
        const { data: guessed } = guessIds.length ? await admin.from("vehicles").select("id, name").in("id", guessIds) : { data: [] };
        const names = new Map((guessed ?? []).map((g) => [g.id, g.name]));
        round = {
          kind,
          position: current.position,
          imageUrl: imageUrl(s.id, current.position, current.attempts),
          isDemo: pz.is_demo,
          attemptsUsed: current.attempts,
          maxAttempts: current.max_attempts,
          hints: pz.hints.slice(0, current.attempts),
          guesses: guessIds.map((id) => ({ name: names.get(id) ?? "?", correct: false })),
          gameId: pz.vehicles.game_id,
        };
      }
    } else if (kind === "higher_lower") {
      const [a, b] = await Promise.all([loadPriceItem(admin, current.ref_type, current.ref_id), loadPriceItem(admin, current.ref_b_type ?? "", current.ref_b_id ?? "")]);
      if (a && b) {
        round = {
          kind,
          position: current.position,
          isDemo: a.isDemo || b.isDemo,
          priceTypeLabel: PRICE_TYPE_LABEL[a.priceType] ?? a.priceType,
          items: [a, b].map((i) => ({ name: i.name, subtitle: i.subtitle, imageUrl: publicMediaUrl(i.imagePath), priceNote: i.priceNote, gameName: i.gameName })),
        };
      }
    } else if (kind === "reality") {
      const item = await loadRealityItem(admin, current.ref_id);
      if (item) round = { kind, position: current.position, imageUrl: imageUrl(s.id, current.position, 0), isDemo: item.is_demo };
    }
  }

  let shareText: string | null = null;
  let personalBest: number | null = null;
  if (s.status === "finished" && s.user_id) {
    const [{ data: res }, { data: best }] = await Promise.all([
      admin.from("game_results").select("share_text").eq("session_id", s.id).maybeSingle(),
      admin.from("game_results").select("score").eq("user_id", s.user_id).eq("game_kind", kind).order("score", { ascending: false }).limit(1).maybeSingle(),
    ]);
    shareText = res?.share_text ?? null;
    personalBest = best?.score ?? null;
  } else if (s.status === "finished") {
    shareText = buildShareText(s, rounds ?? []);
  }

  return {
    id: s.id,
    kind,
    mode: s.mode as "training" | "daily",
    ranked: s.ranked,
    status: s.status as GameState["status"],
    position: s.current_position,
    totalRounds: s.total_rounds,
    score: s.score,
    maxScore: s.max_score,
    expiresAt: s.expires_at,
    challengeDate: s.challenge_date,
    round,
    history,
    shareText,
    personalBest,
  };
}

function buildShareText(s: Pick<SessionRow, "game_kind" | "mode" | "challenge_date" | "score" | "max_score">, rounds: { answers: unknown; score: number | null; result: unknown }[]) {
  const kind = s.game_kind as GameKind;
  const head = s.mode === "daily" && s.challenge_date ? `VICE CLUB · Défi du ${s.challenge_date.split("-").reverse().slice(0, 2).join("/")}` : "VICE CLUB · Entraînement";
  let detail = "";
  if (kind === "mystery") {
    const r = rounds[0];
    const attempts = Array.isArray(r?.answers) ? (r.answers as unknown[]).length : 0;
    const solved = (r?.score ?? 0) > 0;
    const marks = Array.from({ length: attempts }, (_, i) => solved && i === attempts - 1);
    detail = `${mysteryShareGrid(marks, solved)} ${solved ? `${attempts}/6` : "X/6"}`;
  } else if (kind === "reality") {
    detail = rounds.map((r) => ((r.score ?? 0) > 0 ? "🟩" : "🟥")).join("");
  } else if (kind === "higher_lower") {
    detail = `Série de ${s.score}`;
  } else {
    detail = rounds.map((r) => ((r.score ?? 0) >= 4000 ? "🟩" : (r.score ?? 0) >= 2000 ? "🟨" : "🟥")).join("");
  }
  const score = s.max_score ? `${s.score.toLocaleString("fr-FR")} / ${s.max_score.toLocaleString("fr-FR")}` : `${s.score.toLocaleString("fr-FR")} pts`;
  return `${head}\n${KIND_LABEL[kind]} — ${score}\n${detail}`;
}

// ------------------------------------------------------------ Réponse
export type AnswerInput =
  | { kind: "where"; x: number; y: number }
  | { kind: "mystery"; vehicleId: string }
  | { kind: "higher_lower"; choice: PriceChoice }
  | { kind: "reality"; answer: "gta" | "reality" };

export type AnswerOutcome =
  | { ok: true; roundComplete: boolean; sessionComplete: boolean; score: number; reveal: Record<string, unknown> }
  | { ok: false; error: "not_found" | "closed" | "expired" | "mismatch" | "conflict" | "invalid" };

export async function submitAnswer(sessionId: string, position: number, input: AnswerInput, viewer: Viewer | null): Promise<AnswerOutcome> {
  const admin = createAdminClient();
  const s = await loadOwnedSession(admin, sessionId, viewer);
  if (!s) return { ok: false, error: "not_found" };
  if (s.status !== "active") return { ok: false, error: "closed" };
  if (new Date(s.expires_at) <= new Date()) return { ok: false, error: "expired" };
  if (s.game_kind !== input.kind) return { ok: false, error: "invalid" };
  if (s.current_position !== position) return { ok: false, error: "mismatch" };

  const { data: round } = await admin.from("game_rounds").select("*").eq("session_id", s.id).eq("position", position).maybeSingle();
  if (!round || round.answered_at) return { ok: false, error: "mismatch" };

  const isLast = s.total_rounds !== null && position >= s.total_rounds;
  let roundComplete = true;
  let sessionComplete = isLast;
  let score = 0;
  let reveal: Record<string, unknown> = {};
  let answer: Record<string, unknown> = {};
  let nextRound: RoundRef | null = null;

  if (input.kind === "where") {
    const loc = await loadGeoLocation(admin, round.ref_id);
    if (!loc?.game_maps) return { ok: false, error: "invalid" };
    const map = {
      width: Number(loc.game_maps.width),
      height: Number(loc.game_maps.height),
      scaleVerified: loc.game_maps.scale_verified,
      metersPerUnit: loc.game_maps.meters_per_unit === null ? null : Number(loc.game_maps.meters_per_unit),
    };
    if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) return { ok: false, error: "invalid" };
    const guess = clampToMap({ x: input.x, y: input.y }, map);
    const actual = { x: Number(loc.x), y: Number(loc.y) };
    const d = mapDistance(guess, actual);
    score = whereScore(d, map);
    answer = guess;
    reveal = { guess, actual, distance: formatDistance(d, map), name: loc.name, description: loc.description, score };
  } else if (input.kind === "mystery") {
    const pz = await loadMysteryPuzzle(admin, round.ref_id);
    if (!pz?.vehicles) return { ok: false, error: "invalid" };
    const { data: guessed } = await admin.from("vehicles").select("id, name, game_id").eq("id", input.vehicleId).eq("status", "published").maybeSingle();
    if (!guessed || guessed.game_id !== pz.vehicles.game_id) return { ok: false, error: "invalid" };
    const attemptNumber = round.attempts + 1;
    const correct = guessed.id === pz.vehicle_id;
    roundComplete = correct || attemptNumber >= round.max_attempts;
    sessionComplete = roundComplete && isLast;
    score = roundComplete ? mysteryScore(attemptNumber, correct) : 0;
    answer = { vehicle_id: guessed.id };
    reveal = {
      correct,
      guessName: guessed.name,
      attempt: attemptNumber,
      maxAttempts: round.max_attempts,
      nextHint: !roundComplete ? (pz.hints[attemptNumber - 1] ?? null) : null,
      score,
      // La réponse n'est dévoilée qu'une fois la manche terminée.
      ...(roundComplete ? { answer: { name: pz.vehicles.name, manufacturer: pz.vehicles.manufacturer }, source: pz.source } : {}),
    };
  } else if (input.kind === "higher_lower") {
    const [a, b] = await Promise.all([loadPriceItem(admin, round.ref_type, round.ref_id), loadPriceItem(admin, round.ref_b_type ?? "", round.ref_b_id ?? "")]);
    if (!a || !b) return { ok: false, error: "invalid" };
    const correct = higherLowerCorrect(a.price, b.price, input.choice);
    score = correct ? 1 : 0;
    answer = { choice: input.choice };
    reveal = {
      correct,
      equal: a.price === b.price,
      items: [a, b].map((i) => ({ name: i.name, price: i.price, priceType: i.priceType, note: i.priceNote, source: i.source, verifiedAt: i.verifiedAt })),
      score,
    };
    if (!correct) sessionComplete = true;
    else if (s.total_rounds === null) {
      if (position >= HIGHER_LOWER_TRAINING_MAX) sessionComplete = true;
      else {
        const { data: used } = await admin.from("game_rounds").select("ref_id, ref_b_id").eq("session_id", s.id);
        nextRound = await pickPricePair(admin, (used ?? []).flatMap((u) => [u.ref_id, u.ref_b_id ?? ""]));
        if (!nextRound) sessionComplete = true;
      }
    }
  } else if (input.kind === "reality") {
    const item = await loadRealityItem(admin, round.ref_id);
    if (!item) return { ok: false, error: "invalid" };
    score = realityScore(input.answer, item.answer as "gta" | "reality");
    answer = { answer: input.answer };
    reveal = {
      correct: score > 0,
      truth: item.answer,
      explanation: item.explanation,
      source: item.media ? { source: item.media.source, author: item.media.author, license: item.media.license, aiGenerated: item.media.is_ai_generated } : null,
      score,
    };
  }

  // Texte de partage calculé sur l'état final (sans dévoiler la réponse).
  let shareText = "";
  if (sessionComplete) {
    const { data: rounds } = await admin.from("game_rounds").select("answers, score, result, position").eq("session_id", s.id).order("position");
    const finalRounds = (rounds ?? []).map((r) =>
      r.position === position ? { ...r, answers: [...(r.answers as unknown[]), answer], score } : r,
    );
    shareText = buildShareText({ ...s, score: s.score + score }, finalRounds.filter((r) => r.position <= position));
  }

  const { data: commit, error } = await admin.rpc("game_commit_answer", {
    p_session: s.id,
    p_position: position,
    p_expected_attempts: round.attempts,
    p_answer: answer as never,
    p_result: reveal as never,
    p_round_score: score,
    p_round_complete: roundComplete,
    p_session_complete: sessionComplete,
    p_next_round: (nextRound as never) ?? undefined,
    p_share_text: shareText,
  });
  if (error) {
    if (error.message.includes("stale_attempt") || error.message.includes("round_already_answered") || error.message.includes("round_mismatch")) {
      return { ok: false, error: "conflict" };
    }
    if (error.message.includes("session_closed")) return { ok: false, error: "closed" };
    throw new Error("commit_failed");
  }
  if (commit && typeof commit === "object" && "error" in commit) return { ok: false, error: "expired" };
  return { ok: true, roundComplete, sessionComplete, score, reveal };
}

// ------------------------------------------------------------ Images de manche
/** Chemin de l'image (bucket game-media) à servir pour l'état courant de la manche. */
export async function roundImagePath(sessionId: string, position: number, viewer: Viewer | null): Promise<string | null> {
  const admin = createAdminClient();
  const s = await loadOwnedSession(admin, sessionId, viewer);
  if (!s) return null;
  const { data: round } = await admin.from("game_rounds").select("ref_id, attempts, answered_at").eq("session_id", s.id).eq("position", position).maybeSingle();
  if (!round) return null;
  // Pas d'accès anticipé aux manches suivantes.
  if (position > s.current_position) return null;
  if (s.game_kind === "where") {
    const loc = await loadGeoLocation(admin, round.ref_id);
    return loc?.screenshot?.path ?? null;
  }
  if (s.game_kind === "reality") {
    const item = await loadRealityItem(admin, round.ref_id);
    return item?.media?.path ?? null;
  }
  if (s.game_kind === "mystery") {
    const pz = await loadMysteryPuzzle(admin, round.ref_id);
    if (!pz) return null;
    if (round.answered_at || s.status !== "active") return pz.reveal_path;
    return pz.stage_paths[Math.min(round.attempts, pz.stage_paths.length - 1)] ?? null;
  }
  return null;
}
