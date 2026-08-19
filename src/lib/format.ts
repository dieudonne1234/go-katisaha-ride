export function formatRwf(amount: number): string {
  return `${new Intl.NumberFormat("en-RW").format(amount)} RWF`;
}

export function formatTime(value: string): string {
  const [h, m] = value.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(display).padStart(2, "0")}:${m} ${suffix}`;
}

export function formatDate(value: string): string {
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(value: string): string {
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
