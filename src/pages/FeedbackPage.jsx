import { useFeedbackData } from "../hooks/useFeedbackData.js";
import { Section } from "../components/common/Section.jsx";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton.jsx";
import { FeedbackKPIs } from "../components/feedback/FeedbackKPIs.jsx";
import { FeedbackTrendChart } from "../components/feedback/FeedbackTrendChart.jsx";
import { FeedbackTable } from "../components/feedback/FeedbackTable.jsx";
import { AlertCircle } from "lucide-react";

export function FeedbackPage() {
  const { data, loading, error } = useFeedbackData();

  return (
    <div>
      {error && (
        <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 10, alignItems: "center" }}>
          <AlertCircle size={16} color="#f87171" />
          <span style={{ color: "#f87171", fontSize: 13 }}>Failed to load feedback data. <strong>{error}</strong></span>
        </div>
      )}

      <Section title="Feedback Overview">
        {loading ? <LoadingSkeleton rows={1} height={96} /> : <FeedbackKPIs data={data} loading={loading} />}
      </Section>

      <Section title="Feedback Trend">
        {loading ? <LoadingSkeleton rows={1} height={220} /> : <FeedbackTrendChart data={data?.feedbackByDay} />}
      </Section>

      <Section title="Individual Feedback">
        {loading ? <LoadingSkeleton rows={10} height={44} /> : <FeedbackTable rows={data?.rows} />}
      </Section>
    </div>
  );
}
