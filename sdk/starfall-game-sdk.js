import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm";

/**
 * Starfall Arcade Game SDK — Version 1
 *
 * Use this from future games to connect one Starfall account to cloud saves,
 * activity, entitlements and centralized achievements.
 *
 * NEVER place a Supabase service-role key or Stripe secret in a browser game.
 */
export class StarfallGameSDK {
  constructor({ supabaseUrl, supabaseAnonKey, gameId, saveVersion = "1" }) {
    if (!supabaseUrl || !supabaseAnonKey || !gameId) throw new Error("Missing Starfall SDK configuration.");
    this.gameId = gameId;
    this.saveVersion = String(saveVersion);
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  async session() {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async user() {
    const session = await this.session();
    return session?.user || null;
  }

  async save(slotKey, saveData) {
    const user = await this.user();
    if (!user) throw new Error("STARFALL_AUTH_REQUIRED");
    const payload = {
      user_id: user.id,
      game_id: this.gameId,
      slot_key: String(slotKey || "main"),
      save_version: this.saveVersion,
      save_data: saveData,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await this.supabase.from("game_saves")
      .upsert(payload, { onConflict: "user_id,game_id,slot_key" }).select().single();
    if (error) throw error;
    return data;
  }

  async load(slotKey = "main") {
    const user = await this.user();
    if (!user) throw new Error("STARFALL_AUTH_REQUIRED");
    const { data, error } = await this.supabase.from("game_saves")
      .select("*").eq("user_id", user.id).eq("game_id", this.gameId)
      .eq("slot_key", String(slotKey)).maybeSingle();
    if (error) throw error;
    return data;
  }

  async backups(slotKey = "main", limit = 10) {
    const user = await this.user();
    if (!user) throw new Error("STARFALL_AUTH_REQUIRED");
    const { data, error } = await this.supabase.from("save_backups")
      .select("id,save_version,created_at").eq("user_id", user.id)
      .eq("game_id", this.gameId).eq("slot_key", String(slotKey))
      .order("created_at", { ascending: false }).limit(Math.max(1, Math.min(25, limit)));
    if (error) throw error;
    return data || [];
  }

  async activity(eventType, title, detail = "", metadata = {}) {
    const user = await this.user();
    if (!user) return null;
    const { data, error } = await this.supabase.from("activity_events").insert({
      user_id: user.id,
      game_id: this.gameId,
      event_type: String(eventType),
      title: String(title),
      detail: String(detail || ""),
      metadata
    }).select().single();
    if (error) throw error;
    return data;
  }

  async event(eventType, metadata = {}) {
    const { data, error } = await this.supabase.functions.invoke("game-event", {
      body: { gameId: this.gameId, eventType, metadata }
    });
    if (error) throw error;
    return data;
  }

  async entitlements() {
    const user = await this.user();
    if (!user) return [];
    const { data, error } = await this.supabase.from("entitlements")
      .select("entitlement_key,expires_at,metadata").eq("user_id", user.id);
    if (error) throw error;
    return (data || []).filter(e => !e.expires_at || new Date(e.expires_at) > new Date());
  }

  async owns(entitlementKey) {
    const items = await this.entitlements();
    return items.some(item => item.entitlement_key === entitlementKey);
  }
}
