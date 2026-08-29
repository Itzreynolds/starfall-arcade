import { requireSession, getSupabase, safeText, formatDate, toast } from "./supabase-client.js";
const supabase = getSupabase();
const state = await requireSession("login.html");
if (!state.configured) document.querySelector("[data-setup-required]").hidden = false;
else if (state.user) {
  document.querySelector("[data-store-content]").hidden = false;
  const [{ data: products }, { data: entitlements }, { data: subscriptions }, { data: profile }] = await Promise.all([
    supabase.from("products").select("*").eq("active", true).order("sort_order"),
    supabase.from("entitlements").select("*").eq("user_id", state.user.id),
    supabase.from("subscriptions").select("*").eq("user_id", state.user.id).order("created_at", {ascending:false}),
    supabase.from("profiles").select("premium_tier,premium_until").eq("id", state.user.id).single()
  ]);
  document.querySelector("[data-plan]").textContent = profile?.premium_tier && profile.premium_tier !== "free" ? profile.premium_tier : "Free";
  document.querySelector("[data-plan-expiry]").textContent = profile?.premium_until ? `Until ${formatDate(profile.premium_until)}` : "No active paid plan";

  const owned = new Set((entitlements || []).filter(e => !e.expires_at || new Date(e.expires_at) > new Date()).map(e => e.entitlement_key));
  const host = document.querySelector("[data-product-grid]");
  host.innerHTML = (products || []).length ? products.map(p => {
    const keys = Array.isArray(p.entitlements) ? p.entitlements : [];
    const already = keys.some(key => owned.has(key));
    const purchasable = Boolean(p.stripe_price_id);
    return `<article class="product-card">
      <span class="pill">${p.product_type === "subscription" ? "MEMBERSHIP" : "PURCHASE"}</span>
      <h3>${safeText(p.name)}</h3><p>${safeText(p.description, "")}</p>
      <div class="product-price">${safeText(p.price_display, "Price set in Stripe")}</div>
      <button class="button ${already ? "secondary" : "primary"}" type="button" data-buy="${p.id}" ${already || !purchasable ? "disabled" : ""}>
        ${already ? "Owned" : purchasable ? "Continue to secure checkout" : "Checkout not configured"}
      </button></article>`;
  }).join("") : `<div class="empty-state">No products are live yet.</div>`;

  host.addEventListener("click", async e => {
    const button = e.target.closest("[data-buy]");
    if (!button) return;
    button.disabled = true;
    const { data, error } = await supabase.functions.invoke("create-checkout", { body: { productId: button.dataset.buy } });
    if (error) {
      button.disabled = false;
      return toast(error.message || "Could not start checkout.", "error");
    }
    if (data?.url) location.href = data.url;
    else {
      button.disabled = false;
      toast("Checkout did not return a URL.", "error");
    }
  });
}
