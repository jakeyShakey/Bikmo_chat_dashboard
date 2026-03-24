import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

export function UserMenu() {
  const { user, signOut } = useAuth();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ color: "#8a8f9e", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
        {user?.email}
      </span>
      <button
        onClick={signOut}
        title="Sign out"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#c0c4d0", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
      >
        <LogOut size={12} />
        Sign out
      </button>
    </div>
  );
}
