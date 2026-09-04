export type DailyPlayerProgress = "not-started" | "playing" | "completed";
export type DailyGameStatus = "playing" | "won" | "lost";
export type DailyGameId = "daily-player" | "kboten";

interface StoredDailyPlayerGame {
  version: 1;
  guessIds: number[];
  gameStatus: DailyGameStatus;
}

interface StoredDailyStats {
  version: 1;
  completedDates: string[];
}

interface StoredDailyStatsV2 {
  version: 2;
  completedGamesByDate: Record<string, DailyGameId[]>;
}

export interface StoredKboTenGame {
  version: 1;
  puzzleId: string;
  correctNames: string[];
  wrongNames: string[];
  gameStatus: DailyGameStatus;
}

export interface StreakSummary {
  current: number;
  best: number;
  totalDays: number;
  completedToday: boolean;
}

const LEGACY_STATS_KEY = "kboryeok:stats:v1";
const STATS_KEY = "kboryeok:stats:v2";
const PROGRESS_EVENT = "kboryeok:progress";
const EMPTY_DASHBOARD_SNAPSHOT = "not-started|0|2|0|0|0";
const EMPTY_KBOTEN_SNAPSHOT = '{"gameStatus":"playing","correctNames":[],"wrongNames":[]}';
export const DAILY_GAME_COUNT = 2;

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

export function getKboTenStorageKey(dateKey = getKstDateKey()) {
  return `kboryeok:kboten:v1:${dateKey}`;
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

function loadCompletedGamesByDate(): Record<string, DailyGameId[]> {
  if (!isBrowser()) return {};

  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredDailyStatsV2>;
      if (parsed.version === 2 && parsed.completedGamesByDate) {
        return Object.fromEntries(
          Object.entries(parsed.completedGamesByDate)
            .filter(([date, games]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(games))
            .map(([date, games]) => [
              date,
              Array.from(new Set(games.filter((game): game is DailyGameId => game === "daily-player" || game === "kboten"))),
            ]),
        );
      }
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_STATS_KEY);
    if (!legacyRaw) return {};
    const legacy = JSON.parse(legacyRaw) as Partial<StoredDailyStats>;
    if (legacy.version !== 1 || !Array.isArray(legacy.completedDates)) return {};
    return Object.fromEntries(
      legacy.completedDates
        .filter((date): date is string => /^\d{4}-\d{2}-\d{2}$/.test(date))
        .map((date) => [date, ["daily-player"] satisfies DailyGameId[]]),
    );
  } catch {
    return {};
  }
}

function loadCompletedDates() {
  return Object.entries(loadCompletedGamesByDate())
    .filter(([, games]) => games.length > 0)
    .map(([date]) => date);
}

export function markDailyGameCompleted(gameId: DailyGameId, dateKey = getKstDateKey()) {
  if (!isBrowser()) return;
  const completedGamesByDate = loadCompletedGamesByDate();
  completedGamesByDate[dateKey] = Array.from(
    new Set([...(completedGamesByDate[dateKey] ?? []), gameId]),
  );
  const recentEntries = Object.entries(completedGamesByDate).sort(([a], [b]) => a.localeCompare(b)).slice(-400);
  const stats: StoredDailyStatsV2 = { version: 2, completedGamesByDate: Object.fromEntries(recentEntries) };
  window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
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
    markDailyGameCompleted("daily-player", dateKey);
  }

  emitProgressChange();
}

export function loadKboTenGame(dateKey = getKstDateKey()): StoredKboTenGame | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(getKboTenStorageKey(dateKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredKboTenGame>;
    if (
      parsed.version !== 1 ||
      typeof parsed.puzzleId !== "string" ||
      !Array.isArray(parsed.correctNames) ||
      !Array.isArray(parsed.wrongNames) ||
      (parsed.gameStatus !== "playing" && parsed.gameStatus !== "won" && parsed.gameStatus !== "lost")
    ) return null;
    return {
      version: 1,
      puzzleId: parsed.puzzleId,
      correctNames: parsed.correctNames.filter((name): name is string => typeof name === "string"),
      wrongNames: parsed.wrongNames.filter((name): name is string => typeof name === "string"),
      gameStatus: parsed.gameStatus,
    };
  } catch {
    return null;
  }
}

export function getKboTenGameSnapshot(puzzleId: string, dateKey = getKstDateKey()) {
  const game = loadKboTenGame(dateKey);
  if (!game || game.puzzleId !== puzzleId) return EMPTY_KBOTEN_SNAPSHOT;
  return JSON.stringify({
    gameStatus: game.gameStatus,
    correctNames: game.correctNames,
    wrongNames: game.wrongNames,
  });
}

export function getServerKboTenGameSnapshot() {
  return EMPTY_KBOTEN_SNAPSHOT;
}

export function saveKboTenGame(game: Omit<StoredKboTenGame, "version">, dateKey = getKstDateKey()) {
  if (!isBrowser()) return;
  window.localStorage.setItem(getKboTenStorageKey(dateKey), JSON.stringify({ version: 1, ...game }));
  if (game.gameStatus === "won" || game.gameStatus === "lost") markDailyGameCompleted("kboten", dateKey);
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
  const todayKey = getKstDateKey();
  const completedCount = loadCompletedGamesByDate()[todayKey]?.length ?? 0;
  if (completedCount >= DAILY_GAME_COUNT) return "completed";

  const game = loadDailyPlayerGame();
  const kboTenGame = loadKboTenGame();
  return completedCount > 0 || (game && game.guessIds.length > 0) || (kboTenGame && (kboTenGame.correctNames.length > 0 || kboTenGame.wrongNames.length > 0))
    ? "playing"
    : "not-started";
}

export function getDashboardSnapshot() {
  if (!isBrowser()) return EMPTY_DASHBOARD_SNAPSHOT;
  const progress = getDailyProgress();
  const streak = getStreakSummary();
  const completedToday = loadCompletedGamesByDate()[getKstDateKey()]?.length ?? 0;
  return [progress, completedToday, DAILY_GAME_COUNT, streak.current, streak.best, streak.totalDays].join("|");
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
