import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ChartCard } from "../common/ChartCard.jsx";
import { fmt } from "../../utils/formatters.js";

const tooltipStyle = { background: "#1a1d27", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f0f2f7", fontSize: 12 };

export function FeedbackTrendChart({ data }) {
  const chartData = (data ?? []).map(d => ({ ...d, date: fmt(d.date) }));
  return (
    <ChartCard title="Feedback Sentiment / Day">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="positive" stackId="a" fill="#4ade80" name="Positive" />
          <Bar dataKey="negative" stackId="a" fill="#f87171" name="Negative" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
