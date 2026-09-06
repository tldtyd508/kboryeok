export const DAILY_LAUNCH_DATE = "2026-09-04";

export function isDateKey(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function addDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

export function resolveDailyDate(requestedDate: string | undefined, todayKey: string, launchDate = DAILY_LAUNCH_DATE) {
  if (!isDateKey(requestedDate)) return todayKey;
  if (requestedDate < launchDate || requestedDate > todayKey) return todayKey;
  return requestedDate;
}

export function getDailyDayNumber(dateKey: string, launchDate = DAILY_LAUNCH_DATE) {
  const start = Date.parse(`${launchDate}T00:00:00Z`);
  const selected = Date.parse(`${dateKey}T00:00:00Z`);
  return Math.floor((selected - start) / 86_400_000) + 1;
}

export function formatDailyDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return `${year}. ${month}. ${day}.`;
}
