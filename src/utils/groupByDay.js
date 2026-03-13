import { fmt } from "./formatters.js";

export function groupByDay(rows, dateField) {
  const map = {};
  rows.forEach((r) => {
    const day = r[dateField]?.slice(0, 10);
    if (day) map[day] = (map[day] || 0) + 1;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: fmt(date), count }));
}
