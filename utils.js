export function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
}

export function formatDate(dateStr) {
  // Normalizes "2026-01-14T13:34:54__535Z" to standard ISO if needed
  // or just returns a Date object
  if (!dateStr) return null;
  const normalized = dateStr.replace(/__/, ".");
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
}

export function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return "N/A";
  const start = formatDate(startTime);
  const end = formatDate(endTime);

  if (!start || !end) return "N/A";

  const diffMs = end - start;
  if (diffMs < 0) return "0s";

  const minutes = Math.floor(diffMs / 60000);
  const seconds = ((diffMs % 60000) / 1000).toFixed(3);

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
