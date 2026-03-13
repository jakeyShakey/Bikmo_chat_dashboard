import { MessageSquare, ThumbsUp, TrendingUp, ShieldCheck } from "lucide-react";
import { StatCard } from "../common/StatCard.jsx";

export function OverviewKPIs({ data, loading }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      <StatCard icon={MessageSquare} label="Total Conversations" value={loading ? "—" : (data?.totalConversations ?? 0).toLocaleString()} sub="Within selected period" accent="#60a5fa" />
      <StatCard icon={ThumbsUp} label="CSAT Score" value={loading ? "—" : data?.csat != null ? `${data.csat}%` : "N/A"} sub={`Feedback rate: ${data?.feedbackRate ?? 0}%`} accent="#4ade80" />
      <StatCard icon={ShieldCheck} label="Compliance Rate" value={loading ? "—" : data?.complianceRate != null ? `${data.complianceRate}%` : "N/A"} sub="Audited conversations" accent="#fbbf24" />
      <StatCard icon={TrendingUp} label="Avg Confidence" value={loading ? "—" : data?.avgConfidence != null ? `${data.avgConfidence}%` : "N/A"} sub="Compliance confidence score" accent="#a78bfa" />
    </div>
  );
}
