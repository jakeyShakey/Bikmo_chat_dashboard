import { useState, useMemo } from "react";
import { useConversationsData } from "../hooks/useConversationsData.js";
import { Section } from "../components/common/Section.jsx";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton.jsx";
import { ConversationFilters } from "../components/conversations/ConversationFilters.jsx";
import { ConversationTable } from "../components/conversations/ConversationTable.jsx";
import { AlertCircle } from "lucide-react";

export function ConversationsPage() {
  const { data, loading, error } = useConversationsData();
  const [search, setSearch] = useState("");
  const [compliance, setCompliance] = useState("all");
  const [feedback, setFeedback] = useState("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(row => {
      if (search && !row.messages_processed?.toLowerCase().includes(search.toLowerCase())) return false;
      if (compliance !== "all") {
        if (compliance === "none" && row.compliance_status != null) return false;
        if (compliance !== "none" && row.compliance_status !== compliance) return false;
      }
      if (feedback !== "all") {
        if (feedback === "positive" && row.feedback !== true) return false;
        if (feedback === "negative" && row.feedback !== false) return false;
        if (feedback === "none" && row.feedback != null) return false;
      }
      return true;
    });
  }, [data, search, compliance, feedback]);

  return (
    <div>
      {error && (
        <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 10, alignItems: "center" }}>
          <AlertCircle size={16} color="#f87171" />
          <span style={{ color: "#f87171", fontSize: 13 }}>Failed to load conversations. <strong>{error}</strong></span>
        </div>
      )}

      <Section title="Conversations">
        {loading ? (
          <LoadingSkeleton rows={10} height={48} />
        ) : (
          <>
            <ConversationFilters
              search={search} onSearch={setSearch}
              compliance={compliance} onCompliance={setCompliance}
              feedback={feedback} onFeedback={setFeedback}
              total={filtered.length}
            />
            <ConversationTable rows={filtered} />
          </>
        )}
      </Section>
    </div>
  );
}
