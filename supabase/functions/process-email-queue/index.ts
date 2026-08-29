import { createClient } from "npm:@supabase/supabase-js@2.49.4";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function sendEmail(apiKey: string, from: string, to: string, subject: string, text: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend ${response.status}: ${detail.slice(0,300)}`);
  }
}

Deno.serve(async (req) => {
  const expected = Deno.env.get("EMAIL_WORKER_SECRET");
  const supplied = req.headers.get("x-starfall-worker-secret");
  if (!expected || supplied !== expected) return json({ error: "Unauthorized" }, 401);

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  if (!resendKey || !from) return json({ error: "Resend is not configured" }, 503);

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: jobs, error } = await service
    .from("email_queue")
    .select("id,user_id,announcement_id,attempts,announcements(title,body)")
    .in("status", ["queued","failed"])
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) return json({ error: error.message }, 500);

  let sent = 0;
  let failed = 0;

  for (const job of jobs || []) {
    await service.from("email_queue").update({
      status: "sending",
      attempts: Number(job.attempts || 0) + 1,
      last_error: null
    }).eq("id", job.id);

    try {
      const { data: userData } = await service.auth.admin.getUserById(job.user_id);
      const email = userData.user?.email;
      if (!email) throw new Error("User has no email address");

      const announcement: any = (job as any).announcements;
      await sendEmail(resendKey, from, email, announcement?.title || "Starfall Arcade", announcement?.body || "");

      const now = new Date().toISOString();
      await service.from("email_queue").update({ status: "sent", sent_at: now }).eq("id", job.id);
      await service.from("inbox_messages").update({ email_delivered_at: now })
        .eq("user_id", job.user_id).eq("announcement_id", job.announcement_id);
      sent += 1;
    } catch (err) {
      await service.from("email_queue").update({
        status: "failed",
        last_error: err instanceof Error ? err.message.slice(0,1000) : "Unknown email error"
      }).eq("id", job.id);
      failed += 1;
    }
  }

  return json({ processed: (jobs || []).length, sent, failed });
});
