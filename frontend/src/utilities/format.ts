export function formatPrice(value: number | undefined) {
  return value === undefined ? "—" : `$${value.toFixed(2)}`;
}

export function formatTime(value: string | undefined) {
  return value === undefined ? "—" : new Date(value).toLocaleTimeString();
}
