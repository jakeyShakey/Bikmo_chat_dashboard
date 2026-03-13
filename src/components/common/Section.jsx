export function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <p style={{ color: "#8a8f9e", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>{title}</p>
      {children}
    </div>
  );
}
