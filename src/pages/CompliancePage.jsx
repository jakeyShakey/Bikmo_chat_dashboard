import { useComplianceData } from "../hooks/useComplianceData.js";
import { Section } from "../components/common/Section.jsx";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton.jsx";
import { ComplianceKPIs } from "../components/compliance/ComplianceKPIs.jsx";
import { ComplianceTrendChart } from "../components/compliance/ComplianceTrendChart.jsx";
import { FlagFrequencyChart } from "../components/compliance/FlagFrequencyChart.jsx";
import { AuditTable } from "../components/compliance/AuditTable.jsx";
import { AlertCircle } from "lucide-react";

export function CompliancePage() {
  const { data, loading, error } = useComplianceData();

  return (
    <div>
      {error && (
        <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 10, alignItems: "center" }}>
          <AlertCircle size={16} color="#f87171" />
          <span style={{ color: "#f87171", fontSize: 13 }}>Failed to load compliance data. <strong>{error}</strong></span>
        </div>
      )}

      <Section title="Compliance Overview">
        {loading ? <LoadingSkeleton rows={1} height={96} /> : <ComplianceKPIs summary={data?.summary} loading={loading} />}
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
        {loading ? (
          <>
            <LoadingSkeleton rows={1} height={240} />
            <LoadingSkeleton rows={1} height={240} />
          </>
        ) : (
          <>
            <ComplianceTrendChart data={data?.auditsByDay} />
            <FlagFrequencyChart data={data?.flagFrequency} />
          </>
        )}
      </div>

      <Section title="Audit Log">
        {loading ? <LoadingSkeleton rows={10} height={44} /> : <AuditTable audits={data?.audits} />}
      </Section>
    </div>
  );
}
