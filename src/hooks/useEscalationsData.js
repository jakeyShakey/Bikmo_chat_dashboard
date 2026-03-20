import { useState, useEffect } from "react";
import { EDGE_FN, SUPABASE_ANON_KEY } from "../config.js";
import { useDashboard } from "../context/DashboardContext.jsx";

export function useEscalationsData() {
  const { dateRange, refreshToken, setLastUpdated } = useDashboard();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ endpoint: "escalations" });
    if (dateRange.from) params.set("from", dateRange.from);
    if (dateRange.to) params.set("to", dateRange.to);

    fetch(`${EDGE_FN}?${params}`, {
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    })
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLastUpdated(new Date());
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [dateRange.from, dateRange.to, refreshToken]);

  return { data, loading, error };
}
