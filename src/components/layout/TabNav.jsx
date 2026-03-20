import { useDashboard } from "../../context/DashboardContext.jsx";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "compliance", label: "Compliance" },
  { id: "conversations", label: "Conversations" },
  { id: "feedback", label: "Feedback" },
  { id: "escalations", label: "Escalations" },
];

export function TabNav() {
  const { activeTab, setActiveTab } = useDashboard();

  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 32px", display: "flex", gap: 4 }}>
      {TABS.map(tab => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${active ? "#60a5fa" : "transparent"}`,
              padding: "14px 20px",
              color: active ? "#60a5fa" : "#8a8f9e",
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: active ? 500 : 400,
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
