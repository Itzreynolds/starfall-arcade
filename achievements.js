import { requireSession, getSupabase, formatDate, safeText } from "./supabase-client.js";
const state = await requireSession("login.html");
if (!state.configured) document.querySelector("[data-setup-required]").hidden = false;
else if (state.user) {
  document.querySelector("[data-achievements-content]").hidden = false;
  const supabase = getSupabase();
  const [{ data: defs }, { data: unlocked }] = await Promise.all([
    supabase.from("achievements").select("*").eq("active", true).order("sort_order"),
    supabase.from("user_achievements").select("achievement_id,unlocked_at").eq("user_id", state.user.id)
  ]);
  const unlockedMap = new Map((unlocked || []).map(x => [x.achievement_id, x]));
  const visibleDefs = (defs || []).filter(a => !a.hidden || unlockedMap.has(a.id));
  document.querySelector("[data-achievement-grid]").innerHTML = visibleDefs.map(a => {
    const hit = unlockedMap.get(a.id);
    return `<article class="achievement-card ${hit ? "unlocked" : "locked"}">
      <div class="achievement-big-icon">${a.icon || "🏆"}</div>
      <div><span class="pill">${hit ? "UNLOCKED" : "LOCKED"}</span>
      <h3>${safeText(a.name)}</h3><p>${safeText(a.description, hit ? "" : "Keep playing to discover this achievement.")}</p>
      <small>${a.xp} XP${hit ? " • " + formatDate(hit.unlocked_at) : ""}</small></div></article>`;
  }).join("");
  document.querySelector("[data-achievement-count]").textContent = `${unlockedMap.size} / ${visibleDefs.length}`;
}
