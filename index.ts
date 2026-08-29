import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const siteUrl = (Deno.env.get("SITE_URL") || "https://itzreynolds.github.io/starfall-arcade").replace(/\/$/,"");

    if (!stripeKey) return jsonResponse({ error: "Stripe is not configured" }, 503);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: "Invalid session" }, 401);

    const service = createClient(supabaseUrl, serviceRole);
    const user = authData.user;
    const { productId } = await req.json();
    if (!productId) return jsonResponse({ error: "productId is required" }, 400);

    const [{ data: profile }, { data: product, error: productError }] = await Promise.all([
      service.from("profiles").select("account_status,stripe_customer_id").eq("id", user.id).single(),
      service.from("products").select("*").eq("id", productId).eq("active", true).single()
    ]);

    if (!profile || profile.account_status !== "active") return jsonResponse({ error: "Account is not active" }, 403);
    if (productError || !product) return jsonResponse({ error: "Product is not available" }, 404);
    if (!product.stripe_price_id) return jsonResponse({ error: "Stripe price is not configured for this product" }, 503);

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { starfall_user_id: user.id }
      });
      customerId = customer.id;
      await service.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const metadata = { starfall_user_id: user.id, starfall_product_id: product.id };
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: product.product_type === "subscription" ? "subscription" : "payment",
      line_items: [{ price: product.stripe_price_id, quantity: 1 }],
      success_url: `${siteUrl}/premium.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/premium.html?checkout=cancelled`,
      metadata,
      ...(product.product_type === "subscription" ? { subscription_data: { metadata } } : {})
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to create checkout" }, 500);
  }
});
