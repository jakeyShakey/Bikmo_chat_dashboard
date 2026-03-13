import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartCard } from "../common/ChartCard.jsx";

const tooltipStyle = { background: "#1a1d27", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f0f2f7", fontSize: 12 };

export function FlagFrequencyChart({ data }) {
  const chartData = (data ?? []).slice(0, 10);
  return (
    <ChartCard title="Flag Frequency">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical">
          <XAxis type="number" tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis dataKey="flag" type="category" tick={{ fill: "#8a8f9e", fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill="#f87171" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
