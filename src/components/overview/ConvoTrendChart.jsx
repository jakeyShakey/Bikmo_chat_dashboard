import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ChartCard } from "../common/ChartCard.jsx";
import { fmt } from "../../utils/formatters.js";

const tooltipStyle = { background: "#1a1d27", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f0f2f7", fontSize: 12 };

export function ConvoTrendChart({ data }) {
  const chartData = (data ?? []).map(d => ({ ...d, date: fmt(d.date) }));
  return (
    <ChartCard title="Conversations / Day">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
