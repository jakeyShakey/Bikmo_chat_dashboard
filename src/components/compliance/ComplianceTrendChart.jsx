import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { ChartCard } from "../common/ChartCard.jsx";
import { fmt } from "../../utils/formatters.js";

const tooltipStyle = { background: "#1a1d27", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f0f2f7", fontSize: 12 };

export function ComplianceTrendChart({ data }) {
  const chartData = (data ?? []).map(d => ({ ...d, date: fmt(d.date) }));
  return (
    <ChartCard title="Compliance / Day">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#8a8f9e" }} />
          <Bar dataKey="yes" stackId="a" fill="#4ade80" name="Compliant" />
          <Bar dataKey="review" stackId="a" fill="#fbbf24" name="Review" />
          <Bar dataKey="no" stackId="a" fill="#f87171" name="Non-Compliant" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
