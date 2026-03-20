import { DashboardProvider, useDashboard } from "./context/DashboardContext.jsx";
import { Header } from "./components/layout/Header.jsx";
import { TabNav } from "./components/layout/TabNav.jsx";
import { DateRangeSelector } from "./components/layout/DateRangeSelector.jsx";
import { OverviewPage } from "./pages/OverviewPage.jsx";
import { CompliancePage } from "./pages/CompliancePage.jsx";
import { ConversationsPage } from "./pages/ConversationsPage.jsx";
import { FeedbackPage } from "./pages/FeedbackPage.jsx";
import { EscalationsPage } from "./pages/EscalationsPage.jsx";

function AppShell() {
  const { activeTab } = useDashboard();

  return (
    <div style={{ minHeight: "100vh", background: "#0e1018", color: "#f0f2f7", fontFamily: "'DM Sans', sans-serif", padding: "0 0 60px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <Header />
      <TabNav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 0" }}>
        <DateRangeSelector />
        {activeTab === "overview" && <OverviewPage />}
        {activeTab === "compliance" && <CompliancePage />}
        {activeTab === "conversations" && <ConversationsPage />}
        {activeTab === "feedback" && <FeedbackPage />}
        {activeTab === "escalations" && <EscalationsPage />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DashboardProvider>
      <AppShell />
    </DashboardProvider>
  );
}
