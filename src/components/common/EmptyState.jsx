import { InboxIcon } from "lucide-react";

export function EmptyState({ message = "No data for the selected period" }) {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "#555" }}>
      <InboxIcon size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
      <p style={{ margin: 0, fontSize: 13 }}>{message}</p>
    </div>
  );
}
