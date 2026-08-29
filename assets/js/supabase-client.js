import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm";
import { STARFALL_CONFIG } from "./config.js";

let client = null;

export function backendConfigured() {
  return Boolean(
    STARFALL_CONFIG.supabaseUrl &&
    STARFALL_CONFIG.supabaseAnonKey &&
    !STARFALL_CONFIG.supabaseUrl.includes("YOUR_") &&
    !STARFALL_CONFIG.supabaseAnonKey.includes("YOUR_")
  );
}

export function getSupabase() {
  if (!backendConfigured()) return null;
  if (!client) {
    client = createClient(
      STARFALL_CONFIG.supabaseUrl,
      STARFALL_CONFIG.supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  }
  return client;
}

export async function requireSession(redirect = "login.html") {
  const supabase = getSupabase();
  if (!supabase) return { configured: false, session: null, user: null };
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    const target = encodeURIComponent(location.pathname.split("/").pop() || "dashboard.html");
    location.href = `${redirect}?next=${target}`;
    return { configured: true, session: null, user: null };
  }
  return { configured: true, session: data.session, user: data.session.user };
}

export function safeText(value, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric", month: "short", day: "numeric"
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit"
  }).format(date);
}

export function toast(message, kind = "info") {
  let host = document.querySelector(".toast-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "toast-host";
    document.body.append(host);
  }
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = message;
  host.append(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, 3400);
}
