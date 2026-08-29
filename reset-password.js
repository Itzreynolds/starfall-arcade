import { getSupabase, backendConfigured } from "./supabase-client.js";
const form = document.querySelector("#resetForm");
const status = document.querySelector("[data-reset-status]");
function say(msg, kind="info"){ status.textContent=msg; status.className=`notice ${kind}`; status.hidden=!msg; }
if (!backendConfigured()) {
  say("Backend configuration is not connected yet.", "warning");
  form.querySelector("button").disabled = true;
}
const supabase = getSupabase();
form?.addEventListener("submit", async e => {
  e.preventDefault();
  const p1 = form.password.value;
  const p2 = form.confirm_password.value;
  if (p1.length < 8) return say("Use at least 8 characters.", "error");
  if (p1 !== p2) return say("Passwords do not match.", "error");
  const { error } = await supabase.auth.updateUser({ password: p1 });
  if (error) return say(error.message, "error");
  say("Password updated. Redirecting…", "success");
  setTimeout(() => location.href = "dashboard.html", 900);
});
