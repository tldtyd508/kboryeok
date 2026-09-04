export type DailyPlayerProgress = "not-started" | "playing" | "completed";

export function getKstDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getDailyPlayerStorageKey(date = new Date()) {
  return `kboryeok:daily-player:${getKstDateKey(date)}`;
}
