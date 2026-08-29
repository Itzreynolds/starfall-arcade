import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authentication required" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: "Invalid session" }, 401);

    const service = createClient(url, serviceRole);
    const userId = authData.user.id;
    const { gameId = null, eventType, metadata = {} } = await req.json();

    if (!eventType || typeof eventType !== "string") return jsonResponse({ error: "eventType is required" }, 400);

    const { data: profile } = await service.from("profiles").select("account_status").eq("id", userId).single();
    if (!profile || profile.account_status !== "active") return jsonResponse({ error: "Account is not active" }, 403);

    const eventTitles: Record<string,string> = {
      first_login: "Signed in to Starfall Arcade",
      profile_ready: "Completed Starfall profile",
      game_launch: gameId ? `Launched ${gameId}` : "Launched a Starfall game",
      cloud_save: gameId ? `Created a ${gameId} cloud save` : "Created a cloud save"
    };

    if (eventTitles[eventType]) {
      await service.from("activity_events").insert({
        user_id: userId,
        game_id: gameId || null,
        event_type: eventType,
        title: eventTitles[eventType],
        detail: "",
        metadata
      });
    }

    const { data: achievements } = await service.from("achievements")
      .select("id,code,game_id,metadata")
      .eq("active", true);

    const awardIds: string[] = [];
    for (const achievement of achievements || []) {
      const trigger = achievement.metadata?.event;
      if (trigger !== eventType) continue;
      if (achievement.game_id && achievement.game_id !== gameId) continue;

      // Generic "first game" achievement should not be awarded by platform-only events.
      if (achievement.code === "starfall_first_game" && !gameId) continue;
      awardIds.push(achievement.id);
    }

    let unlocked = 0;
    for (const achievementId of awardIds) {
      const { error } = await service.from("user_achievements").upsert(
        { user_id: userId, achievement_id: achievementId, metadata: { source_event: eventType, game_id: gameId } },
        { onConflict: "user_id,achievement_id", ignoreDuplicates: true }
      );
      if (!error) unlocked += 1;
    }

    return jsonResponse({ ok: true, matchedAchievements: awardIds.length, processed: unlocked });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
