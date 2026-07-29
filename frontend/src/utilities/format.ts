export function formatPrice(value: number | undefined) {
  return value === undefined ? "—" : `$${value.toFixed(2)}`;
}

export function formatTime(value: string | undefined) {
  return value === undefined ? "—" : new Date(value).toLocaleTimeString();
}

export function formatVolume(value: number | undefined) {
  if (value === undefined) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}
