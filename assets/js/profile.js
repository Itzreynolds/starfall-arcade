import { requireSession, getSupabase, toast, safeText } from "./supabase-client.js";
const state = await requireSession("login.html");
const setup = document.querySelector("[data-setup-required]");
const content = document.querySelector("[data-profile-content]");
if (!state.configured) setup.hidden = false;
else if (state.user) {
  content.hidden = false;
  const supabase = getSupabase();
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", state.user.id).single();
  if (error) toast(error.message, "error");
  const form = document.querySelector("#profileForm");
  form.display_name.value = profile?.display_name || "";
  form.handle.value = profile?.handle || "";
  form.bio.value = profile?.bio || "";
  form.favorite_game.value = profile?.favorite_game || "stable-empire";
  form.marketing.checked = Boolean(profile?.email_marketing_opt_in);
  document.querySelector("[data-profile-email]").textContent = state.user.email || "—";

  const avatarPreview = document.querySelector("[data-avatar-preview]");
  if (profile?.avatar_url) avatarPreview.style.backgroundImage = `url("${profile.avatar_url}")`;
  else avatarPreview.textContent = (profile?.display_name || state.user.email || "S").slice(0,1).toUpperCase();

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const handle = form.handle.value.trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{3,24}$/.test(handle)) return toast("Handle must be 3–24 letters, numbers, or underscores.", "error");
    const { error: updateError } = await supabase.from("profiles").update({
      display_name: form.display_name.value.trim(),
      handle,
      bio: form.bio.value.trim().slice(0,500),
      favorite_game: form.favorite_game.value,
      email_marketing_opt_in: form.marketing.checked,
      updated_at: new Date().toISOString()
    }).eq("id", state.user.id);
    if (updateError) return toast(updateError.message, "error");
    toast("Profile saved.", "success");
    supabase.functions.invoke("game-event", { body: { gameId: null, eventType: "profile_ready", metadata: {} } }).catch(() => {});
  });

  document.querySelector("#avatarInput")?.addEventListener("change", async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Choose an image file.", "error");
    if (file.size > 2 * 1024 * 1024) return toast("Avatar must be 2 MB or smaller.", "error");
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${state.user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) return toast(uploadError.message, "error");
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?v=${Date.now()}`;
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", state.user.id);
    if (updateError) return toast(updateError.message, "error");
    avatarPreview.style.backgroundImage = `url("${url}")`;
    avatarPreview.textContent = "";
    toast("Avatar updated.", "success");
  });
}
