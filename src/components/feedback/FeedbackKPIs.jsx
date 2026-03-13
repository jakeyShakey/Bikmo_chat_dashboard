import { MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { StatCard } from "../common/StatCard.jsx";

export function FeedbackKPIs({ data, loading }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      <StatCard icon={MessageSquare} label="Total Feedback" value={loading ? "—" : (data?.totalFeedback ?? 0).toLocaleString()} sub="Feedback responses received" accent="#60a5fa" />
      <StatCard icon={ThumbsUp} label="Positive" value={loading ? "—" : data?.positivePct != null ? `${data.positivePct}%` : "N/A"} sub="Positive feedback" accent="#4ade80" />
      <StatCard icon={ThumbsDown} label="Negative" value={loading ? "—" : data?.negativePct != null ? `${data.negativePct}%` : "N/A"} sub="Negative feedback" accent="#f87171" />
    </div>
  );
}
