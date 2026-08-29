import { STARFALL_CONFIG } from "./config.js";
import { getSupabase, backendConfigured, toast } from "./supabase-client.js";

const status = document.querySelector("[data-auth-status]");
const signupForm = document.querySelector("#signupForm");
const loginForm = document.querySelector("#loginForm");
const forgotForm = document.querySelector("#forgotForm");
const tabs = [...document.querySelectorAll("[data-auth-tab]")];
const panes = [...document.querySelectorAll("[data-auth-pane]")];

function showStatus(message, kind = "info") {
  if (!status) return;
  status.textContent = message;
  status.className = `notice ${kind}`;
  status.hidden = !message;
}

function switchPane(name) {
  tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.authTab === name));
  panes.forEach(pane => pane.hidden = pane.dataset.authPane !== name);
}

tabs.forEach(tab => tab.addEventListener("click", () => switchPane(tab.dataset.authTab)));

if (!backendConfigured()) {
  showStatus("Accounts are built into this package, but the Supabase project still needs to be connected. Follow docs/SETUP.md after uploading the site.", "warning");
  document.querySelectorAll("form button[type='submit']").forEach(btn => btn.disabled = true);
}

const supabase = getSupabase();

signupForm?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!supabase) return;
  const form = new FormData(signupForm);
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const displayName = String(form.get("display_name") || "").trim();
  const handle = String(form.get("handle") || "").trim().replace(/^@/, "");
  const marketing = form.get("marketing") === "on";
  const terms = form.get("terms") === "on";

  if (!terms) return showStatus("You must accept the Terms and Privacy Policy to create an account.", "error");
  if (password.length < 8) return showStatus("Use a password with at least 8 characters.", "error");
  if (!/^[A-Za-z0-9_]{3,24}$/.test(handle)) return showStatus("Handle must be 3–24 characters using letters, numbers, or underscores.", "error");

  showStatus("Creating your Starfall account…");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${STARFALL_CONFIG.siteUrl}/dashboard.html`,
      data: {
        display_name: displayName,
        handle,
        email_marketing_opt_in: marketing,
        terms_accepted_at: new Date().toISOString()
      }
    }
  });
  if (error) return showStatus(error.message, "error");

  if (data.session) {
    location.href = "dashboard.html";
  } else {
    showStatus("Account created. Check your email to confirm your address, then sign in.", "success");
    signupForm.reset();
  }
});

loginForm?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!supabase) return;
  const form = new FormData(loginForm);
  showStatus("Signing in…");
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") || "").trim(),
    password: String(form.get("password") || "")
  });
  if (error) return showStatus(error.message, "error");
  const next = new URLSearchParams(location.search).get("next");
  location.href = next || "dashboard.html";
});

forgotForm?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!supabase) return;
  const form = new FormData(forgotForm);
  const email = String(form.get("email") || "").trim();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${STARFALL_CONFIG.siteUrl}/reset-password.html`
  });
  if (error) return showStatus(error.message, "error");
  showStatus("Password reset email sent.", "success");
});

document.querySelector("[data-show-forgot]")?.addEventListener("click", event => {
  event.preventDefault();
  switchPane("forgot");
});
