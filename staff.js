import { getSupabase, backendConfigured, formatDateTime, safeText, toast } from "../assets/js/supabase-client.js";

const noBackend = document.querySelector("[data-staff-no-backend]");
const denied = document.querySelector("[data-staff-denied]");
const app = document.querySelector("[data-staff-app]");
const supabase = getSupabase();
let context = null;
let selectedUser = null;

function can(permission) {
  return context?.role === "owner" || context?.permissions?.includes("*") || context?.permissions?.includes(permission);
}
function json(value){ try { return JSON.stringify(value ?? {}, null, 2); } catch { return "{}"; } }

if (!backendConfigured()) {
  noBackend.hidden = false;
} else {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    location.href = "../login.html?next=staff/index.html";
  } else {
    const { data, error } = await supabase.rpc("current_staff_context");
    if (error || !data?.active) {
      denied.hidden = false;
    } else {
      context = data;
      app.hidden = false;
      document.querySelector("[data-staff-role]").textContent = context.role;
      await loadOverview();
      await loadAudit();
      await loadGames();
      await loadProducts();
      await loadStaff();
    }
  }
}

document.querySelectorAll("[data-staff-tab]").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll("[data-staff-tab]").forEach(b => b.classList.toggle("active", b === btn));
  document.querySelectorAll("[data-staff-pane]").forEach(p => p.hidden = p.dataset.staffPane !== btn.dataset.staffTab);
}));

async function loadOverview() {
  const { data, error } = await supabase.rpc("staff_dashboard_stats");
  if (error) return toast(error.message, "error");
  const stats = data || {};
  const map = {
    users_total: "usersTotal", users_24h: "users24h", active_7d: "active7d",
    premium_active: "premiumActive", purchases_30d: "purchases30d",
    game_events_24h: "events24h", unread_inbox: "unreadInbox",
    cloud_saves: "cloudSaves", achievements_unlocked: "achievementsUnlocked",
    staff_count: "staffCount"
  };
  for (const [key,id] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.textContent = Number(stats[key] || 0).toLocaleString();
  }
  const series = stats.registrations_7d || [];
  const max = Math.max(1, ...series.map(x => Number(x.count || 0)));
  document.querySelector("[data-registration-bars]").innerHTML = series.map(x =>
    `<div class="mini-bar-col"><div class="mini-bar" style="height:${Math.max(5, Number(x.count||0)/max*100)}%"></div><small>${x.label}</small><b>${x.count}</b></div>`
  ).join("");
}

const userSearchForm = document.querySelector("#userSearchForm");
userSearchForm?.addEventListener("submit", async e => {
  e.preventDefault();
  const q = userSearchForm.q.value.trim();
  const { data, error } = await supabase.rpc("staff_search_users", { search_text: q, result_limit: 50, result_offset: 0 });
  if (error) return toast(error.message, "error");
  const host = document.querySelector("[data-user-results]");
  host.innerHTML = (data || []).length ? data.map(u => `<button type="button" class="user-result" data-user-id="${u.id}">
    <span class="avatar mini">${(u.display_name || u.email_hint || "?").slice(0,1).toUpperCase()}</span>
    <span><strong>${safeText(u.display_name, "Unnamed user")}</strong><small>${u.handle ? "@"+u.handle+" • " : ""}${safeText(u.email_hint, "")}</small></span>
    <span><small>${u.account_status}</small><b>${Number(u.arcade_xp||0).toLocaleString()} XP</b></span></button>`).join("") :
    `<div class="empty-state">No users found.</div>`;
});

document.querySelector("[data-user-results]")?.addEventListener("click", async e => {
  const row = e.target.closest("[data-user-id]");
  if (!row) return;
  const { data, error } = await supabase.rpc("staff_user_detail", { target_user: row.dataset.userId });
  if (error) return toast(error.message, "error");
  selectedUser = data;
  const panel = document.querySelector("[data-user-detail]");
  panel.hidden = false;
  panel.querySelector("[data-detail-name]").textContent = safeText(data.profile?.display_name, "Unnamed user");
  panel.querySelector("[data-detail-id]").textContent = data.profile?.id || "";
  panel.querySelector("[data-detail-handle]").textContent = data.profile?.handle ? "@"+data.profile.handle : "—";
  panel.querySelector("[data-detail-status]").textContent = data.profile?.account_status || "active";
  panel.querySelector("[data-detail-xp]").textContent = Number(data.profile?.arcade_xp||0).toLocaleString();
  panel.querySelector("[data-detail-premium]").textContent = data.profile?.premium_tier || "free";
  panel.querySelector("[data-detail-created]").textContent = formatDateTime(data.profile?.created_at);
  panel.querySelector("[data-detail-lastseen]").textContent = formatDateTime(data.profile?.last_seen_at);
  panel.querySelector("[data-detail-staff]").textContent = data.staff?.role || "Not staff";
  panel.querySelector("[data-detail-counts]").textContent = `${data.counts?.saves||0} saves • ${data.counts?.achievements||0} achievements • ${data.counts?.purchases||0} purchases`;
  panel.querySelector("[data-detail-activity]").textContent = json(data.recent_activity || []);
});

document.querySelector("#moderationForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  if (!selectedUser) return toast("Select a user first.", "error");
  if (!can("moderation.write")) return toast("Your role cannot moderate users.", "error");
  const f = e.currentTarget;
  const { error } = await supabase.rpc("staff_set_account_status", {
    target_user: selectedUser.profile.id,
    new_status: f.status.value,
    reason_text: f.reason.value.trim(),
    until_time: f.until.value ? new Date(f.until.value).toISOString() : null
  });
  if (error) return toast(error.message, "error");
  toast("Account status updated.", "success");
});

document.querySelector("#entitlementForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  if (!selectedUser) return toast("Select a user first.", "error");
  const f = e.currentTarget;
  const { error } = await supabase.rpc("staff_grant_entitlement", {
    target_user: selectedUser.profile.id,
    entitlement_name: f.entitlement.value.trim(),
    expiry_time: f.expires.value ? new Date(f.expires.value).toISOString() : null,
    reason_text: f.reason.value.trim()
  });
  if (error) return toast(error.message, "error");
  toast("Entitlement granted.", "success");
});

document.querySelector("#staffRoleForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  if (!selectedUser) return toast("Select a user first.", "error");
  const f = e.currentTarget;
  const { error } = await supabase.rpc("staff_set_role", {
    target_user: selectedUser.profile.id,
    new_role: f.role.value,
    custom_permissions: []
  });
  if (error) return toast(error.message, "error");
  toast("Staff role updated.", "success");
  await loadStaff();
});

document.querySelector("#announcementForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.currentTarget;
  const payload = {
    title: f.title.value.trim(),
    body: f.body.value.trim(),
    category: f.category.value,
    audience: { type: f.audience.value, value: f.audience_value.value.trim() || null },
    sendEmail: f.send_email.checked
  };
  const { data, error } = await supabase.functions.invoke("send-announcement", { body: payload });
  if (error) return toast(error.message || "Announcement failed.", "error");
  toast(`Announcement sent to ${data?.recipients ?? "selected"} users.`, "success");
  f.reset();
});

async function loadAudit() {
  if (!can("audit.read")) return;
  const { data } = await supabase.from("audit_logs").select("*").order("created_at", {ascending:false}).limit(50);
  document.querySelector("[data-audit-list]").innerHTML = (data||[]).map(a =>
    `<tr><td>${formatDateTime(a.created_at)}</td><td>${safeText(a.action_type)}</td><td>${safeText(a.target_type)} ${safeText(a.target_id,"")}</td><td><code>${safeText(a.actor_id,"system")}</code></td><td><pre>${json(a.details)}</pre></td></tr>`
  ).join("") || `<tr><td colspan="5">No audit entries yet.</td></tr>`;
}

async function loadGames() {
  const { data } = await supabase.from("games").select("*").order("title");
  document.querySelector("[data-game-admin]").innerHTML = (data||[]).map(g =>
    `<div class="admin-row"><div><strong>${g.title}</strong><small>${g.version_label} • ${g.status}</small></div><div><code>${g.id}</code></div></div>`
  ).join("");
}

async function loadProducts() {
  const { data } = await supabase.from("products").select("*").order("sort_order");
  document.querySelector("[data-product-admin]").innerHTML = (data||[]).map(p =>
    `<div class="admin-row"><div><strong>${p.name}</strong><small>${p.product_type} • ${p.active ? "Live" : "Draft"}</small></div><div><code>${safeText(p.stripe_price_id,"No Stripe price yet")}</code></div></div>`
  ).join("") || `<div class="empty-state">No store products configured.</div>`;
}

async function loadStaff() {
  if (!can("staff.read")) return;
  const { data } = await supabase.from("staff_members").select("user_id,role,permissions,active,created_at").order("created_at");
  document.querySelector("[data-staff-list]").innerHTML = (data||[]).map(s =>
    `<tr><td><code>${s.user_id}</code></td><td>${s.role}</td><td>${s.active ? "Active" : "Disabled"}</td><td>${(s.permissions||[]).join(", ") || "Role defaults"}</td><td>${formatDateTime(s.created_at)}</td></tr>`
  ).join("") || `<tr><td colspan="5">No staff members found.</td></tr>`;
}


document.querySelector("#gameAdminForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  if (!can("games.write")) return toast("Your role cannot edit games.", "error");
  const f = e.currentTarget;
  const payload = {
    id: f.id.value.trim(),
    title: f.title.value.trim(),
    version_label: f.version.value.trim() || "Version 1",
    status: f.status.value,
    play_url: f.play_url.value.trim() || null,
    cover_url: f.cover_url.value.trim() || null,
    description: f.description.value.trim()
  };
  const { error } = await supabase.from("games").upsert(payload, { onConflict: "id" });
  if (error) return toast(error.message, "error");
  toast("Game registry updated.", "success");
  await loadGames();
});

document.querySelector("#productAdminForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  if (!can("store.manage")) return toast("Your role cannot edit store products.", "error");
  const f = e.currentTarget;
  const entitlements = f.entitlements.value.split(",").map(x => x.trim()).filter(Boolean);
  const payload = {
    id: f.id.value.trim(),
    name: f.name.value.trim(),
    description: f.description.value.trim(),
    product_type: f.product_type.value,
    game_id: f.game_id.value.trim() || null,
    stripe_price_id: f.stripe_price_id.value.trim() || null,
    price_display: f.price_display.value.trim() || null,
    entitlements,
    active: f.active.checked
  };
  const { error } = await supabase.from("products").upsert(payload, { onConflict: "id" });
  if (error) return toast(error.message, "error");
  toast("Store product updated.", "success");
  await loadProducts();
});
