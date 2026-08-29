import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok({ error: "Method not allowed" }, 405);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) return ok({ error: "Stripe webhook is not configured" }, 503);

  const signature = req.headers.get("stripe-signature");
  if (!signature) return ok({ error: "Missing signature" }, 400);

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const body = await req.text();
    const cryptoProvider = Stripe.createSubtleCryptoProvider();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, cryptoProvider);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.starfall_user_id;
      const productId = session.metadata?.starfall_product_id;
      if (userId && productId) {
        const { data: product } = await service.from("products").select("*").eq("id", productId).single();

        await service.from("purchases").upsert({
          user_id: userId,
          product_id: productId,
          provider: "stripe",
          provider_session_id: session.id,
          provider_payment_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
          status: session.payment_status === "paid" ? "paid" : "complete",
          amount_total: session.amount_total,
          currency: session.currency,
          metadata: { mode: session.mode }
        }, { onConflict: "provider_session_id" });

        const entitlements = Array.isArray(product?.entitlements) ? product.entitlements : [];
        for (const key of entitlements) {
          await service.from("entitlements").upsert({
            user_id: userId,
            entitlement_key: key,
            source: "stripe",
            source_ref: session.id,
            metadata: { product_id: productId }
          }, { onConflict: "user_id,entitlement_key,source,source_ref" });
        }

        if (session.mode === "subscription" && typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await service.from("subscriptions").upsert({
            user_id: userId,
            product_id: productId,
            provider: "stripe",
            provider_subscription_id: subscription.id,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            metadata: { customer: String(subscription.customer) }
          }, { onConflict: "provider_subscription_id" });

          await service.from("profiles").update({
            premium_tier: productId,
            premium_until: new Date(subscription.current_period_end * 1000).toISOString()
          }).eq("id", userId);
        }
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.starfall_user_id;
      const productId = subscription.metadata?.starfall_product_id;
      if (userId) {
        await service.from("subscriptions").upsert({
          user_id: userId,
          product_id: productId || null,
          provider: "stripe",
          provider_subscription_id: subscription.id,
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          metadata: { customer: String(subscription.customer) }
        }, { onConflict: "provider_subscription_id" });

        const active = ["active","trialing"].includes(subscription.status);
        await service.from("profiles").update({
          premium_tier: active ? (productId || "premium") : "free",
          premium_until: active ? new Date(subscription.current_period_end * 1000).toISOString() : null
        }).eq("id", userId);
      }
    }

    return ok({ received: true });
  } catch (error) {
    console.error(error);
    return ok({ error: error instanceof Error ? error.message : "Webhook error" }, 400);
  }
});
