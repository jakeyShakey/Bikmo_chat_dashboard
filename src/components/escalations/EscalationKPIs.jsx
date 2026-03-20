import { AlertTriangle, TrendingUp, MessageSquare, Users } from "lucide-react";
import { StatCard } from "../common/StatCard.jsx";

export function EscalationKPIs({ summary, loading }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      <StatCard icon={AlertTriangle} label="Total Escalations" value={loading ? "—" : summary?.totalEscalations ?? 0} sub="Within selected period" accent="#f97316" />
      <StatCard icon={TrendingUp} label="Escalation Rate" value={loading ? "—" : summary?.escalationRate != null ? `${summary.escalationRate}%` : "N/A"} sub="Of total conversations" accent="#f97316" />
      <StatCard icon={MessageSquare} label="Avg Messages at Escalation" value={loading ? "—" : summary?.avgMessagesAtEscalation != null ? summary.avgMessagesAtEscalation : "N/A"} sub="Message depth before escalation" accent="#60a5fa" />
      <StatCard icon={Users} label="Unique Customers" value={loading ? "—" : summary?.uniqueCustomers ?? 0} sub="Distinct customers escalated" accent="#a78bfa" />
    </div>
  );
}
