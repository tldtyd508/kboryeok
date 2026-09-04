export type DailyPlayerProgress = "not-started" | "playing" | "completed";
export type DailyGameStatus = "playing" | "won" | "lost";

interface StoredDailyPlayerGame {
  version: 1;
  guessIds: number[];
  gameStatus: DailyGameStatus;
}

interface StoredDailyStats {
  version: 1;
  completedDates: string[];
}

export interface StreakSummary {
  current: number;
  best: number;
  totalDays: number;
  completedToday: boolean;
}

const STATS_KEY = "kboryeok:stats:v1";
const PROGRESS_EVENT = "kboryeok:progress";
const EMPTY_DASHBOARD_SNAPSHOT = "not-started|0|0|0";

export function getKstDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getDailyPlayerStorageKey(dateKey = getKstDateKey()) {
  return `kboryeok:daily-player:v1:${dateKey}`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function emitProgressChange() {
  if (isBrowser()) window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function loadDailyPlayerGame(dateKey = getKstDateKey()): StoredDailyPlayerGame | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(getDailyPlayerStorageKey(dateKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDailyPlayerGame>;
    if (parsed.version !== 1 || !Array.isArray(parsed.guessIds)) return null;
    if (parsed.gameStatus !== "playing" && parsed.gameStatus !== "won" && parsed.gameStatus !== "lost") return null;

    return {
      version: 1,
      guessIds: parsed.guessIds.filter((id): id is number => Number.isInteger(id)),
      gameStatus: parsed.gameStatus,
    };
  } catch {
    return null;
  }
}

function loadCompletedDates(): string[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<StoredDailyStats>;
    if (parsed.version !== 1 || !Array.isArray(parsed.completedDates)) return [];
    return parsed.completedDates.filter((date): date is string => /^\d{4}-\d{2}-\d{2}$/.test(date));
  } catch {
    return [];
  }
}

export function saveDailyPlayerGame(
  guessIds: number[],
  gameStatus: DailyGameStatus,
  dateKey = getKstDateKey(),
) {
  if (!isBrowser()) return;

  const game: StoredDailyPlayerGame = { version: 1, guessIds, gameStatus };
  window.localStorage.setItem(getDailyPlayerStorageKey(dateKey), JSON.stringify(game));

  if (gameStatus === "won" || gameStatus === "lost") {
    const completedDates = Array.from(new Set([...loadCompletedDates(), dateKey])).sort().slice(-400);
    const stats: StoredDailyStats = { version: 1, completedDates };
    window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  emitProgressChange();
}

function dateOrdinal(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function calculateStreakSummary(completedDates: string[], todayKey = getKstDateKey()): StreakSummary {
  const ordinals = Array.from(new Set(completedDates.map(dateOrdinal))).sort((a, b) => a - b);
  const completed = new Set(ordinals);
  const today = dateOrdinal(todayKey);
  const completedToday = completed.has(today);

  let current = 0;
  let cursor = completedToday ? today : today - 1;
  while (completed.has(cursor)) {
    current += 1;
    cursor -= 1;
  }

  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const ordinal of ordinals) {
    run = previous !== null && ordinal === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = ordinal;
  }

  return { current, best, totalDays: ordinals.length, completedToday };
}

export function getStreakSummary() {
  return calculateStreakSummary(loadCompletedDates());
}

export function getDailyProgress(): DailyPlayerProgress {
  const stats = getStreakSummary();
  if (stats.completedToday) return "completed";

  const game = loadDailyPlayerGame();
  return game && game.guessIds.length > 0 ? "playing" : "not-started";
}

export function getDashboardSnapshot() {
  if (!isBrowser()) return EMPTY_DASHBOARD_SNAPSHOT;
  const progress = getDailyProgress();
  const streak = getStreakSummary();
  return [progress, streak.current, streak.best, streak.totalDays].join("|");
}

export function getServerDashboardSnapshot() {
  return EMPTY_DASHBOARD_SNAPSHOT;
}

export function subscribeToProgress(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PROGRESS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PROGRESS_EVENT, callback);
  };
}
