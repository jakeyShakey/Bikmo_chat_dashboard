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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

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
        supabase.from("compliance_audits").select("status, confidence, flags, audited_at, conversation_id"),
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

    // Compliance
    const compliant = audits.filter(a => a.status === "yes").length;
    const complianceRate = audits.length > 0 ? Math.round((compliant / audits.length) * 100) : null;
    const avgConfidence = audits.length > 0
      ? Math.round((audits.reduce((s, a) => s + (a.confidence ?? 0), 0) / audits.length) * 100)
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
    const { data: audits } = await applyDateFilter(
      supabase.from("compliance_audits").select("id, conversation_id, status, confidence, flags, reasoning, audited_at"),
      from, to, "audited_at"
    );

    const rows = audits ?? [];
    const total = rows.length;
    const compliant = rows.filter(a => a.status === "yes").length;
    const nonCompliant = rows.filter(a => a.status === "no").length;
    const review = rows.filter(a => a.status === "review").length;
    const avgConfidence = total > 0
      ? Math.round((rows.reduce((s, a) => s + (a.confidence ?? 0), 0) / total) * 100)
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

    // Full audit list sorted desc
    const sortedAudits = [...rows].sort((a, b) => new Date(b.audited_at).getTime() - new Date(a.audited_at).getTime());

    return json({ summary, auditsByDay, flagFrequency, audits: sortedAudits });
  }

  // ── CONVERSATIONS (new, with compliance + feedback join) ──────────────────
  if (endpoint === "conversations") {
    const [convoRes, feedbackRes, auditRes] = await Promise.all([
      applyDateFilter(
        supabase.from("chat_responses").select("id, conversation_id, messages_processed, created_at"),
        from, to
      ).order("created_at", { ascending: false }),
      applyDateFilter(
        supabase.from("feedback_responses").select("feedback, created_at, conversation_id"),
        from, to
      ),
      applyDateFilter(
        supabase.from("compliance_audits").select("conversation_id, status, confidence, flags, audited_at"),
        from, to, "audited_at"
      ),
    ]);

    const convos = convoRes.data ?? [];
    const feedback = feedbackRes.data ?? [];
    const audits = auditRes.data ?? [];

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
