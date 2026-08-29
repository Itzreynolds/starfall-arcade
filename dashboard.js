import { requireSession, getSupabase, formatDateTime, safeText } from "./supabase-client.js";
import { STARFALL_CONFIG } from "./config.js";

const setup = document.querySelector("[data-setup-required]");
const content = document.querySelector("[data-dashboard-content]");
const state = await requireSession("login.html");

if (!state.configured) {
  setup.hidden = false;
} else if (state.user) {
  content.hidden = false;
  const supabase = getSupabase();

  // Centralized platform event; duplicate achievement awards are ignored server-side.
  supabase.functions.invoke("game-event", { body: { gameId: null, eventType: "first_login", metadata: {} } }).catch(() => {});

  const [profileRes, activityRes, achievementRes, savesRes, inboxRes, entitlementsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", state.user.id).single(),
    supabase.from("activity_events").select("*").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("user_achievements").select("unlocked_at, achievements(code,name,description,icon,xp)").eq("user_id", state.user.id).order("unlocked_at", { ascending: false }).limit(6),
    supabase.from("game_saves").select("game_id,slot_key,save_version,updated_at").eq("user_id", state.user.id).order("updated_at", { ascending: false }),
    supabase.from("inbox_messages").select("id,read_at,created_at,announcements(title,body,published_at)").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("entitlements").select("entitlement_key,expires_at,created_at").eq("user_id", state.user.id)
  ]);

  const profile = profileRes.data || {};
  const accountNotice = document.querySelector("[data-account-status-notice]");
  if (profile.account_status && profile.account_status !== "active") {
    accountNotice.hidden = false;
    accountNotice.textContent = `This Starfall account is currently ${profile.account_status}. Cloud writes, purchases, and some platform actions are restricted until the status is resolved.`;
  }
  document.querySelector("[data-player-name]").textContent = safeText(profile.display_name, "Starfall Player");
  document.querySelector("[data-player-handle]").textContent = profile.handle ? `@${profile.handle}` : "No handle";
  document.querySelector("[data-player-xp]").textContent = Number(profile.arcade_xp || 0).toLocaleString();
  document.querySelector("[data-premium]").textContent = profile.premium_tier && profile.premium_tier !== "free" ? profile.premium_tier : "Free";
  document.querySelector("[data-last-seen]").textContent = formatDateTime(profile.last_seen_at || profile.created_at);

  const avatar = document.querySelector("[data-avatar]");
  if (profile.avatar_url) avatar.style.backgroundImage = `url("${profile.avatar_url}")`;
  else avatar.textContent = (profile.display_name || state.user.email || "S").slice(0,1).toUpperCase();

  const activity = activityRes.data || [];
  document.querySelector("[data-activity-list]").innerHTML = activity.length ? activity.map(item => `
    <li><span class="activity-icon">${item.game_id === "stable-empire" ? "🐎" : "✦"}</span>
      <div><strong>${safeText(item.title, item.event_type)}</strong>
      <small>${safeText(item.detail, "")} ${item.created_at ? "• " + formatDateTime(item.created_at) : ""}</small></div></li>`).join("") :
    `<li class="empty-row">Your recent activity will appear here after you play.</li>`;

  const achievements = achievementRes.data || [];
  document.querySelector("[data-achievement-list]").innerHTML = achievements.length ? achievements.map(row => `
    <li><span class="achievement-icon">${row.achievements?.icon || "🏆"}</span>
      <div><strong>${safeText(row.achievements?.name, "Achievement")}</strong>
      <small>${safeText(row.achievements?.description, "")} • +${Number(row.achievements?.xp || 0)} XP</small></div></li>`).join("") :
    `<li class="empty-row">No achievements unlocked yet.</li>`;

  const saves = savesRes.data || [];
  const stableSave = saves.find(s => s.game_id === "stable-empire");
  const continueCard = document.querySelector("[data-continue-card]");
  if (stableSave) {
    continueCard.querySelector("[data-save-status]").textContent = `Cloud save updated ${formatDateTime(stableSave.updated_at)}`;
  } else {
    continueCard.querySelector("[data-save-status]").textContent = "No cloud save connected yet — your existing browser save remains untouched.";
  }
  continueCard.querySelector("[data-play]").href = STARFALL_CONFIG.games[0].playUrl;

  const unread = (inboxRes.data || []).filter(m => !m.read_at).length;
  document.querySelector("[data-unread]").textContent = String(unread);
  document.querySelector("[data-entitlements]").textContent = String((entitlementsRes.data || []).length);

  await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", state.user.id);
}
