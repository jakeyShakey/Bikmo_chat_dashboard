import { useOverviewData } from "../hooks/useOverviewData.js";
import { Section } from "../components/common/Section.jsx";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton.jsx";
import { OverviewKPIs } from "../components/overview/OverviewKPIs.jsx";
import { ConvoTrendChart } from "../components/overview/ConvoTrendChart.jsx";
import { FeedbackTrendChart } from "../components/overview/FeedbackTrendChart.jsx";
import { ComplianceSummaryWidget } from "../components/overview/ComplianceSummaryWidget.jsx";
import { AlertCircle } from "lucide-react";

export function OverviewPage() {
  const { data, loading, error } = useOverviewData();

  return (
    <div>
      {error && (
        <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 10, alignItems: "center" }}>
          <AlertCircle size={16} color="#f87171" />
          <span style={{ color: "#f87171", fontSize: 13 }}>Failed to load overview data. <strong>{error}</strong></span>
        </div>
      )}

      <Section title="Overview">
        {loading ? <LoadingSkeleton rows={1} height={96} /> : <OverviewKPIs data={data} loading={loading} />}
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
        {loading ? (
          <>
            <LoadingSkeleton rows={1} height={220} />
            <LoadingSkeleton rows={1} height={220} />
          </>
        ) : (
          <>
            <ConvoTrendChart data={data?.convosByDay} />
            <FeedbackTrendChart data={data?.feedbackByDay} />
          </>
        )}
      </div>

      <Section title="Compliance Summary">
        {loading ? <LoadingSkeleton rows={3} height={40} /> : <ComplianceSummaryWidget data={data} />}
      </Section>
    </div>
  );
}
