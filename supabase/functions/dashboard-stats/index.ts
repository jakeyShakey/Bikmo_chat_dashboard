import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function applyDateFilter(query: any, from: string | null, to: string | null, field = "created_at") {
  if (from) query = query.gte(field, from);
  if (to) query = query.lte(field, to + "T23:59:59");
  return query;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const token = authHeader.replace("Bearer ", "");
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabase = adminClient;

  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  // ── OVERVIEW ────────────────────────────────────────────────────────────────
  if (endpoint === "overview") {
    const [convoRes, feedbackRes, auditRes] = await Promise.all([
      applyDateFilter(
        supabase.from("chat_responses").select("id, conversation_id, created_at"),
        from, to
      ),
      applyDateFilter(
        supabase.from("feedback_responses").select("feedback, created_at, conversation_id"),
        from, to
      ),
      applyDateFilter(
        // "status:compliant" aliases the actual column name "compliant" as "status"
        supabase.from("compliance_audits").select("status:compliant, confidence, flags, audited_at, conversation_id"),
        from, to, "audited_at"
      ),
    ]);

    const convos = convoRes.data ?? [];
    const feedback = feedbackRes.data ?? [];
    const audits = auditRes.data ?? [];

    const totalConversations = convos.length;

    // CSAT
    const fbMap: Record<string, any> = {};
    feedback.forEach(f => {
      const ex = fbMap[f.conversation_id];
      if (!ex || new Date(f.created_at) > new Date(ex.created_at)) fbMap[f.conversation_id] = f;
    });
    const fbArr = Object.values(fbMap);
    const positive = fbArr.filter(f => f.feedback).length;
    const negative = fbArr.filter(f => !f.feedback).length;
    const csat = fbArr.length > 0 ? Math.round((positive / (positive + negative)) * 100) : null;
    const feedbackRate = totalConversations > 0 ? Math.round((fbArr.length / totalConversations) * 100) : 0;

    // Compliance — confidence is a 1–10 integer, multiply by 10 to get 0–100%
    const compliant = audits.filter(a => a.status === "yes").length;
    const complianceRate = audits.length > 0 ? Math.round((compliant / audits.length) * 100) : null;
    const avgConfidence = audits.length > 0
      ? Math.round((audits.reduce((s, a) => s + (a.confidence ?? 0), 0) / audits.length) * 10)
      : null;

    // Convos by day
    const convoMap: Record<string, number> = {};
    convos.forEach(c => {
      const day = c.created_at?.slice(0, 10);
      if (day) convoMap[day] = (convoMap[day] || 0) + 1;
    });
    const convosByDay = Object.entries(convoMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));

    // Feedback by day
    const fbDayMap: Record<string, { date: string; positive: number; negative: number }> = {};
    feedback.forEach(f => {
      const day = f.created_at?.slice(0, 10);
      if (!day) return;
      if (!fbDayMap[day]) fbDayMap[day] = { date: day, positive: 0, negative: 0 };
      f.feedback ? fbDayMap[day].positive++ : fbDayMap[day].negative++;
    });
    const feedbackByDay = Object.values(fbDayMap).sort((a, b) => a.date.localeCompare(b.date));

    // Compliance breakdown
    const complianceBreakdown = {
      yes: audits.filter(a => a.status === "yes").length,
      no: audits.filter(a => a.status === "no").length,
      review: audits.filter(a => a.status === "review").length,
    };

    // Recent flags (top 5 recent distinct flags)
    const flagSet = new Map<string, string>();
    const sortedAudits = [...audits].sort((a, b) => new Date(b.audited_at).getTime() - new Date(a.audited_at).getTime());
    for (const a of sortedAudits) {
      if (a.flags) {
        for (const flag of a.flags) {
          if (!flagSet.has(flag)) flagSet.set(flag, a.audited_at);
        }
      }
      if (flagSet.size >= 5) break;
    }
    const recentFlags = Array.from(flagSet.entries()).map(([flag, date]) => ({ flag, date }));

    return json({
      totalConversations, feedbackRate, csat, complianceRate, avgConfidence,
      convosByDay, feedbackByDay, complianceBreakdown, recentFlags,
    });
  }

  // ── COMPLIANCE ───────────────────────────────────────────────────────────────
  if (endpoint === "compliance") {
    const { data: audits, error: auditError } = await applyDateFilter(
      // "status:compliant" aliases the actual column name "compliant" as "status"
      supabase.from("compliance_audits").select("id, conversation_id, status:compliant, confidence, flags, reasoning, audited_at, reviewer_verdict, reviewer_notes, reviewed_by, reviewed_at"),
      from, to, "audited_at"
    );

    if (auditError) return json({ error: auditError.message });

    const rows = audits ?? [];
    const total = rows.length;
    const compliant = rows.filter(a => a.status === "yes").length;
    const nonCompliant = rows.filter(a => a.status === "no").length;
    const review = rows.filter(a => a.status === "review").length;
    // confidence is a 1–10 integer, multiply by 10 to get 0–100%
    const avgConfidence = total > 0
      ? Math.round((rows.reduce((s, a) => s + (a.confidence ?? 0), 0) / total) * 10)
      : null;

    const summary = {
      totalAudits: total,
      compliantPct: total > 0 ? Math.round((compliant / total) * 100) : null,
      nonCompliantPct: total > 0 ? Math.round((nonCompliant / total) * 100) : null,
      reviewPct: total > 0 ? Math.round((review / total) * 100) : null,
      avgConfidence,
    };

    // Audits by day (stacked)
    const auditDayMap: Record<string, { date: string; yes: number; no: number; review: number }> = {};
    rows.forEach(a => {
      const day = a.audited_at?.slice(0, 10);
      if (!day) return;
      if (!auditDayMap[day]) auditDayMap[day] = { date: day, yes: 0, no: 0, review: 0 };
      if (a.status === "yes") auditDayMap[day].yes++;
      else if (a.status === "no") auditDayMap[day].no++;
      else if (a.status === "review") auditDayMap[day].review++;
    });
    const auditsByDay = Object.values(auditDayMap).sort((a, b) => a.date.localeCompare(b.date));

    // Flag frequency
    const flagCount: Record<string, number> = {};
    rows.forEach(a => {
      (a.flags ?? []).forEach((f: string) => { flagCount[f] = (flagCount[f] || 0) + 1; });
    });
    const flagFrequency = Object.entries(flagCount)
      .sort(([, a], [, b]) => b - a)
      .map(([flag, count]) => ({ flag, count }));

    // Fetch conversation text for each audit (latest-wins per conversation_id)
    const convIds = rows.map((r: any) => r.conversation_id).filter(Boolean);
    const { data: convoRows } = convIds.length > 0
      ? await supabase
          .from("chat_responses")
          .select("conversation_id, messages_processed")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    // latest-wins: first occurrence wins because results are ordered newest-first
    const convoMap: Record<string, string | null> = {};
    (convoRows ?? []).forEach((c: any) => {
      if (!(c.conversation_id in convoMap)) {
        convoMap[c.conversation_id] = c.messages_processed ?? null;
      }
    });

    // Full audit list sorted desc, with conversation text merged in
    const sortedAudits = [...rows]
      .sort((a: any, b: any) => new Date(b.audited_at).getTime() - new Date(a.audited_at).getTime())
      .map((a: any) => ({ ...a, messages_processed: convoMap[a.conversation_id] ?? null }));

    return json({ summary, auditsByDay, flagFrequency, audits: sortedAudits });
  }

  // ── ESCALATIONS ──────────────────────────────────────────────────────────────
  if (endpoint === "escalations") {
    const [escalationRes, convoCountRes] = await Promise.all([
      applyDateFilter(
        supabase.from("escalations").select("id, conversation_id, zendesk_ticket_id, escalated_at, customer_name, customer_email, issue_description, message_count_at_escalation, previous_messages"),
        from, to, "escalated_at"
      ),
      applyDateFilter(
        supabase.from("chat_responses").select("id", { count: "exact", head: true }),
        from, to
      ),
    ]);

    const rows = escalationRes.data ?? [];
    const totalConversations = convoCountRes.count ?? 0;
    const totalEscalations = rows.length;
    const escalationRate = totalConversations > 0
      ? Math.round((totalEscalations / totalConversations) * 100 * 10) / 10
      : null;

    const msgCounts = rows.filter(r => r.message_count_at_escalation != null).map(r => r.message_count_at_escalation);
    const avgMessagesAtEscalation = msgCounts.length > 0
      ? Math.round(msgCounts.reduce((s, n) => s + n, 0) / msgCounts.length)
      : null;

    const uniqueCustomers = new Set(rows.map(r => r.customer_email).filter(Boolean)).size;

    // Escalations by day
    const dayMap: Record<string, number> = {};
    rows.forEach(r => {
      const day = r.escalated_at?.slice(0, 10);
      if (day) dayMap[day] = (dayMap[day] || 0) + 1;
    });
    const escalationsByDay = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));

    const sortedEscalations = [...rows].sort((a, b) => new Date(b.escalated_at).getTime() - new Date(a.escalated_at).getTime());

    return json({
      summary: { totalEscalations, escalationRate, avgMessagesAtEscalation, uniqueCustomers },
      escalationsByDay,
      escalations: sortedEscalations,
    });
  }

  // ── CONVERSATIONS (new, with compliance + feedback join) ──────────────────
  if (endpoint === "conversations") {
    const [convoRes, feedbackRes] = await Promise.all([
      applyDateFilter(
        supabase.from("chat_responses").select("id, conversation_id, messages_processed, created_at, escalated"),
        from, to
      ).order("created_at", { ascending: false }),
      applyDateFilter(
        supabase.from("feedback_responses").select("feedback, created_at, conversation_id"),
        from, to
      ),
    ]);

    const convos = convoRes.data ?? [];
    const feedback = feedbackRes.data ?? [];

    // Fetch compliance audits scoped to the matched conversation_ids so that
    // audits are never excluded just because audited_at falls outside the
    // selected date window (the date window is already applied to conversations).
    const convIds = convos.map((c: any) => c.conversation_id).filter(Boolean);
    const { data: auditRows } = convIds.length > 0
      ? await supabase
          .from("compliance_audits")
          // "status:compliant" aliases the actual column name "compliant" as "status"
          .select("conversation_id, status:compliant, confidence, flags, audited_at")
          .in("conversation_id", convIds)
      : { data: [] };
    const audits = auditRows ?? [];

    // Resolve latest feedback per convo
    const fbMap: Record<string, any> = {};
    feedback.forEach(f => {
      const ex = fbMap[f.conversation_id];
      if (!ex || new Date(f.created_at) > new Date(ex.created_at)) fbMap[f.conversation_id] = f;
    });

    // Latest audit per convo
    const auditMap: Record<string, any> = {};
    audits.forEach(a => {
      const ex = auditMap[a.conversation_id];
      if (!ex || new Date(a.audited_at) > new Date(ex.audited_at)) auditMap[a.conversation_id] = a;
    });

    const result = convos.map(c => ({
      ...c,
      compliance_status: auditMap[c.conversation_id]?.status ?? null,
      compliance_confidence: auditMap[c.conversation_id]?.confidence ?? null,
      compliance_flags: auditMap[c.conversation_id]?.flags ?? [],
      feedback: fbMap[c.conversation_id]?.feedback ?? null,
      escalated: c.escalated ?? false,
    }));

    return json(result);
  }

  // ── FEEDBACK ─────────────────────────────────────────────────────────────────
  if (endpoint === "feedback") {
    const { data: rows } = await applyDateFilter(
      supabase.from("feedback_responses").select("id, conversation_id, feedback, created_at"),
      from, to
    ).order("created_at", { ascending: false });

    const all = rows ?? [];
    const positive = all.filter(f => f.feedback).length;
    const negative = all.filter(f => !f.feedback).length;
    const total = all.length;

    // Resolve latest per convo for rate purposes (same as existing)
    const fbMap: Record<string, any> = {};
    all.forEach(f => {
      const ex = fbMap[f.conversation_id];
      if (!ex || new Date(f.created_at) > new Date(ex.created_at)) fbMap[f.conversation_id] = f;
    });

    // By day
    const dayMap: Record<string, { date: string; positive: number; negative: number }> = {};
    all.forEach(f => {
      const day = f.created_at?.slice(0, 10);
      if (!day) return;
      if (!dayMap[day]) dayMap[day] = { date: day, positive: 0, negative: 0 };
      f.feedback ? dayMap[day].positive++ : dayMap[day].negative++;
    });
    const feedbackByDay = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    return json({
      totalFeedback: total,
      positivePct: total > 0 ? Math.round((positive / total) * 100) : null,
      negativePct: total > 0 ? Math.round((negative / total) * 100) : null,
      feedbackByDay,
      rows: all,
    });
  }

  // ── AUDIT FEEDBACK ───────────────────────────────────────────────────────────
  if (endpoint === "audit-feedback") {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
    }

    const body = await req.json().catch(() => null);
    const { audit_id, verdict, notes } = body ?? {};

    if (!audit_id || !["agree", "disagree"].includes(verdict)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: corsHeaders });
    }

    // Server-side length guard (matches frontend maxLength=1000)
    if (notes && notes.length > 1000) {
      return new Response(JSON.stringify({ error: "Notes too long (max 1000 chars)" }), { status: 400, headers: corsHeaders });
    }

    // compliance_audits.id is a UUID — no coercion needed
    const reviewedBy = user.email ?? user.id; // fallback to user id if email absent

    const { error: updateError } = await supabase
      .from("compliance_audits")
      .update({
        reviewer_verdict: verdict,
        reviewer_notes: notes ?? null,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", audit_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: corsHeaders });
    }

    return json({ ok: true });
  }

  // ── LEGACY ALIASES ───────────────────────────────────────────────────────────
  if (endpoint === "stats") {
    const [{ count: totalConvos }, { data: feedbackData }] = await Promise.all([
      supabase.from("chat_responses").select("*", { count: "exact", head: true }),
      supabase.from("feedback_responses").select("feedback, created_at, conversation_id"),
    ]);
    const positive = feedbackData?.filter(f => f.feedback).length ?? 0;
    const negative = feedbackData?.filter(f => !f.feedback).length ?? 0;
    return json({ totalConvos, positive, negative, feedbackData });
  }

  return new Response(JSON.stringify({ error: "Unknown endpoint" }), { status: 400, headers: corsHeaders });
});
