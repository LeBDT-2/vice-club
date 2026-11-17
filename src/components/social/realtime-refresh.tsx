"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Écoute les nouveaux messages d'UNE conversation via Supabase Realtime.
 * La diffusion respecte la politique RLS de lecture des messages : seuls les
 * participants reçoivent les événements. On se contente de rafraîchir la page.
 */
export function RealtimeRefresh({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, () =>
        router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, router]);
  return null;
}
