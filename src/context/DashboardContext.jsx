import { createContext, useContext, useState, useMemo } from "react";
import { PRESETS } from "../config.js";
import { toDateStr } from "../utils/formatters.js";

export function getPresetRange(days) {
  if (!days) return { from: null, to: null };
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: toDateStr(from), to: toDateStr(to) };
}

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [preset, setPreset] = useState("Last 30 days");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  const dateRange = useMemo(() => {
    if (showCustom && customFrom && customTo) return { from: customFrom, to: customTo };
    const p = PRESETS.find(p => p.label === preset);
    return getPresetRange(p?.days ?? null);
  }, [preset, customFrom, customTo, showCustom]);

  const refresh = () => setRefreshToken(t => t + 1);

  return (
    <DashboardContext.Provider value={{
      activeTab, setActiveTab,
      dateRange,
      preset, setPreset,
      customFrom, setCustomFrom,
      customTo, setCustomTo,
      showCustom, setShowCustom,
      refreshToken, refresh,
      lastUpdated, setLastUpdated,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}
