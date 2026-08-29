import { requireSession, getSupabase, formatDateTime, safeText, toast } from "./supabase-client.js";
const state = await requireSession("login.html");
if (!state.configured) document.querySelector("[data-setup-required]").hidden = false;
else if (state.user) {
  document.querySelector("[data-inbox-content]").hidden = false;
  const supabase = getSupabase();
  const { data, error } = await supabase.from("inbox_messages")
    .select("id,read_at,created_at,announcements(id,title,body,published_at,category)")
    .eq("user_id", state.user.id).order("created_at", { ascending:false });
  if (error) toast(error.message, "error");
  const host = document.querySelector("[data-inbox-list]");
  const rows = data || [];
  host.innerHTML = rows.length ? rows.map(m => `<button type="button" class="mail-row ${m.read_at ? "" : "unread"}" data-message-id="${m.id}">
    <span class="mail-dot"></span><span><strong>${safeText(m.announcements?.title, "Starfall Announcement")}</strong>
    <small>${safeText(m.announcements?.category, "Announcement")} • ${formatDateTime(m.created_at)}</small></span>
    <span class="mail-preview">${safeText(m.announcements?.body, "")}</span></button>`).join("") :
    `<div class="empty-state">Your Starfall inbox is empty.</div>`;
  host.addEventListener("click", async e => {
    const row = e.target.closest("[data-message-id]");
    if (!row) return;
    const item = rows.find(x => String(x.id) === row.dataset.messageId);
    if (!item) return;
    document.querySelector("[data-mail-title]").textContent = safeText(item.announcements?.title);
    document.querySelector("[data-mail-body]").textContent = safeText(item.announcements?.body, "");
    document.querySelector("[data-mail-date]").textContent = formatDateTime(item.created_at);
    document.querySelector("[data-mail-reader]").hidden = false;
    row.classList.remove("unread");
    if (!item.read_at) {
      await supabase.from("inbox_messages").update({ read_at: new Date().toISOString() }).eq("id", item.id);
      item.read_at = new Date().toISOString();
    }
  });
}
