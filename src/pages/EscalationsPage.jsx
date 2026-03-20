import { useEscalationsData } from "../hooks/useEscalationsData.js";
import { Section } from "../components/common/Section.jsx";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton.jsx";
import { EscalationKPIs } from "../components/escalations/EscalationKPIs.jsx";
import { EscalationTrendChart } from "../components/escalations/EscalationTrendChart.jsx";
import { EscalationTable } from "../components/escalations/EscalationTable.jsx";
import { AlertCircle } from "lucide-react";

export function EscalationsPage() {
  const { data, loading, error } = useEscalationsData();

  return (
    <div>
      {error && (
        <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 10, alignItems: "center" }}>
          <AlertCircle size={16} color="#f87171" />
          <span style={{ color: "#f87171", fontSize: 13 }}>Failed to load escalation data. <strong>{error}</strong></span>
        </div>
      )}

      <Section title="Escalation Overview">
        {loading ? <LoadingSkeleton rows={1} height={96} /> : <EscalationKPIs summary={data?.summary} loading={loading} />}
      </Section>

      <div style={{ marginBottom: 32 }}>
        {loading ? <LoadingSkeleton rows={1} height={240} /> : <EscalationTrendChart data={data?.escalationsByDay} />}
      </div>

      <Section title="Escalation Log">
        {loading ? <LoadingSkeleton rows={10} height={44} /> : <EscalationTable rows={data?.escalations} />}
      </Section>
    </div>
  );
}
