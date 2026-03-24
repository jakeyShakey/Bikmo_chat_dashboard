import { useState, useEffect } from "react";
import { EDGE_FN } from "../config.js";
import { useDashboard } from "../context/DashboardContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export function useComplianceData() {
  const { dateRange, refreshToken, setLastUpdated } = useDashboard();
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ endpoint: "compliance" });
    if (dateRange.from) params.set("from", dateRange.from);
    if (dateRange.to) params.set("to", dateRange.to);

    fetch(`${EDGE_FN}?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLastUpdated(new Date());
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [dateRange.from, dateRange.to, refreshToken, session]);

  return { data, loading, error };
}
