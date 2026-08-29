import { STARFALL_CONFIG } from "./config.js";
import { getSupabase, backendConfigured } from "./supabase-client.js";

const year = document.querySelector("[data-year]");
if (year) year.textContent = new Date().getFullYear();

document.querySelectorAll("[data-site-version]").forEach(el => {
  el.textContent = STARFALL_CONFIG.version;
});

const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
navToggle?.addEventListener("click", () => nav?.classList.toggle("open"));

document.querySelectorAll("[data-discord]").forEach(link => {
  if (STARFALL_CONFIG.discordUrl) {
    link.href = STARFALL_CONFIG.discordUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
  } else {
    link.href = "community.html";
    link.title = "Discord invite has not been configured yet.";
  }
});

const current = location.pathname.split("/").pop() || "index.html";
document.querySelectorAll("[data-nav] a").forEach(link => {
  const href = link.getAttribute("href") || "";
  if (href === current || (current === "" && href === "index.html")) {
    link.classList.add("active");
  }
});

const backendBanner = document.querySelector("[data-backend-banner]");
if (backendBanner && !backendConfigured()) {
  backendBanner.hidden = false;
}

const authSlot = document.querySelector("[data-auth-slot]");
if (authSlot) {
  const supabase = getSupabase();
  if (!supabase) {
    authSlot.innerHTML = `<a class="button small" href="login.html">Sign in</a>`;
  } else {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      authSlot.innerHTML = `
        <a class="button small secondary" href="dashboard.html">My Arcade</a>
        <button class="button small ghost" type="button" data-sign-out>Sign out</button>`;
      authSlot.querySelector("[data-sign-out]")?.addEventListener("click", async () => {
        await supabase.auth.signOut();
        location.href = "index.html";
      });
    } else {
      authSlot.innerHTML = `<a class="button small" href="login.html">Sign in</a>`;
    }
  }
}

const starHost = document.querySelector(".star-layer");
if (starHost) {
  const count = Math.min(90, Math.max(35, Math.floor(innerWidth / 20)));
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const star = document.createElement("i");
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    const s = 1 + Math.random() * 1.8;
    star.style.width = `${s}px`;
    star.style.height = `${s}px`;
    star.style.opacity = String(.18 + Math.random() * .65);
    star.style.animationDelay = `${Math.random() * 4}s`;
    frag.append(star);
  }
  starHost.append(frag);
}
