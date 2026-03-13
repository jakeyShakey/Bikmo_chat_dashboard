import { ShieldCheck, ShieldX, Clock, TrendingUp } from "lucide-react";
import { StatCard } from "../common/StatCard.jsx";

export function ComplianceKPIs({ summary, loading }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      <StatCard icon={ShieldCheck} label="Compliant" value={loading ? "—" : summary?.compliantPct != null ? `${summary.compliantPct}%` : "N/A"} sub={`${summary?.totalAudits ?? 0} total audits`} accent="#4ade80" />
      <StatCard icon={ShieldX} label="Non-Compliant" value={loading ? "—" : summary?.nonCompliantPct != null ? `${summary.nonCompliantPct}%` : "N/A"} sub="Flagged conversations" accent="#f87171" />
      <StatCard icon={Clock} label="Needs Review" value={loading ? "—" : summary?.reviewPct != null ? `${summary.reviewPct}%` : "N/A"} sub="Pending review" accent="#fbbf24" />
      <StatCard icon={TrendingUp} label="Avg Confidence" value={loading ? "—" : summary?.avgConfidence != null ? `${summary.avgConfidence}%` : "N/A"} sub="Model confidence score" accent="#a78bfa" />
    </div>
  );
}
