export const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
export const fmtFull = (d) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const toDateStr = (d) => d.toISOString().slice(0, 10);
