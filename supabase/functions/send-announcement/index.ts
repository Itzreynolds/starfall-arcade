import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authentication required" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });

    const { title, body, category = "Platform", audience = { type: "all" }, sendEmail = false } = await req.json();

    const { data, error } = await userClient.rpc("staff_create_announcement", {
      announcement_title: title,
      announcement_body: body,
      announcement_category: category,
      announcement_audience: audience,
      should_email: Boolean(sendEmail)
    });

    if (error) return jsonResponse({ error: error.message }, 403);

    return jsonResponse({
      ok: true,
      announcement_id: data?.announcement_id,
      recipients: data?.recipients || 0,
      email_queued: data?.email_queued || 0
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Announcement failed" }, 500);
  }
});
