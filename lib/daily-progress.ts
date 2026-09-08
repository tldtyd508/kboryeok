export type DailyPlayerProgress = "not-started" | "playing" | "completed";
export type DailyGameStatus = "playing" | "won" | "lost";
export type DailyGameId = "daily-player" | "kboten" | "kbo5001" | "kbo-bingo";

interface StoredDailyPlayerGame {
  version: 2;
  puzzleId: string;
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

export interface Kbo5001Submission {
  names: string[];
  sum: number;
}

export interface StoredKbo5001Game {
  version: 1;
  puzzleId: string;
  selectedNames: string[];
  submissions: Kbo5001Submission[];
  gameStatus: DailyGameStatus;
}

export interface KboBingoTurn {
  playerId: number;
  cellId: string | null;
  correct: boolean;
}

export interface StoredKboBingoGame {
  version: 1;
  puzzleId: string;
  turns: KboBingoTurn[];
  gameStatus: DailyGameStatus;
}

export interface StreakSummary {
  current: number;
  best: number;
  totalDays: number;
  completedToday: boolean;
}

export interface GameStatsSummary {
  played: number;
  wins: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  averageWinningScore: number | null;
}

interface StoredGameResult {
  status: "won" | "lost";
  score: number;
}

interface StoredGameResults {
  version: 1;
  resultsByDate: Record<string, Partial<Record<DailyGameId, StoredGameResult>>>;
}

const LEGACY_STATS_KEY = "kboryeok:stats:v1";
const STATS_KEY = "kboryeok:stats:v2";
const RESULTS_KEY = "kboryeok:game-results:v1";
const PROGRESS_EVENT = "kboryeok:progress";
const EMPTY_DASHBOARD_SNAPSHOT = "not-started|0|4|0|0|0";
const EMPTY_KBOTEN_SNAPSHOT = '{"gameStatus":"playing","correctNames":[],"wrongNames":[]}';
const EMPTY_KBO5001_SNAPSHOT = '{"gameStatus":"playing","selectedNames":[],"submissions":[]}';
const EMPTY_KBO_BINGO_SNAPSHOT = '{"gameStatus":"playing","turns":[]}';
export const DAILY_GAME_COUNT = 4;

export function getKstDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getDailyPlayerStorageKey(dateKey = getKstDateKey()) {
  return `kboryeok:daily-player:v2:${dateKey}`;
}

export function getKboTenStorageKey(dateKey = getKstDateKey()) {
  return `kboryeok:kboten:v1:${dateKey}`;
}

export function getKbo5001StorageKey(dateKey = getKstDateKey()) {
  return `kboryeok:kbo5001:v1:${dateKey}`;
}

export function getKboBingoStorageKey(dateKey = getKstDateKey()) {
  return `kboryeok:kbo-bingo:v1:${dateKey}`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function emitProgressChange() {
  if (isBrowser()) window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function loadDailyPlayerGame(dateKey = getKstDateKey(), expectedPuzzleId?: string): StoredDailyPlayerGame | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(getDailyPlayerStorageKey(dateKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDailyPlayerGame>;
    if (parsed.version !== 2 || typeof parsed.puzzleId !== "string" || !Array.isArray(parsed.guessIds)) return null;
    if (expectedPuzzleId && parsed.puzzleId !== expectedPuzzleId) return null;
    if (parsed.gameStatus !== "playing" && parsed.gameStatus !== "won" && parsed.gameStatus !== "lost") return null;

    return {
      version: 2,
      puzzleId: parsed.puzzleId,
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
              Array.from(new Set(games.filter((game): game is DailyGameId => game === "daily-player" || game === "kboten" || game === "kbo5001" || game === "kbo-bingo"))),
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

function loadGameResults(): StoredGameResults["resultsByDate"] {
  if (!isBrowser()) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RESULTS_KEY) ?? "null") as Partial<StoredGameResults> | null;
    const resultsByDate = parsed?.version === 1 && parsed.resultsByDate
      ? structuredClone(parsed.resultsByDate)
      : {};
    const legacyKeys: Array<{ prefix: string; gameId: DailyGameId; scoreKey: "guessIds" | "correctNames" | "submissions" | "turns" }> = [
      { prefix: "kboryeok:daily-player:v2:", gameId: "daily-player", scoreKey: "guessIds" },
      { prefix: "kboryeok:kboten:v1:", gameId: "kboten", scoreKey: "wrongNames" },
      { prefix: "kboryeok:kbo5001:v1:", gameId: "kbo5001", scoreKey: "submissions" },
      { prefix: "kboryeok:kbo-bingo:v1:", gameId: "kbo-bingo", scoreKey: "turns" },
    ];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      const config = legacyKeys.find((candidate) => key?.startsWith(candidate.prefix));
      if (!key || !config) continue;
      const date = key.slice(config.prefix.length);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || resultsByDate[date]?.[config.gameId]) continue;
      const game = JSON.parse(window.localStorage.getItem(key) ?? "null") as Record<string, unknown> | null;
      if (game?.gameStatus !== "won" && game?.gameStatus !== "lost") continue;
      const scoreValue = game[config.scoreKey];
      const score = Array.isArray(scoreValue) ? scoreValue.length : 0;
      resultsByDate[date] = { ...resultsByDate[date], [config.gameId]: { status: game.gameStatus, score } };
    }
    return resultsByDate;
  } catch {
    return {};
  }
}

function saveGameResult(gameId: DailyGameId, status: "won" | "lost", score: number, dateKey: string) {
  const resultsByDate = loadGameResults();
  resultsByDate[dateKey] = { ...resultsByDate[dateKey], [gameId]: { status, score } };
  const recentEntries = Object.entries(resultsByDate).sort(([a], [b]) => a.localeCompare(b)).slice(-400);
  const stats: StoredGameResults = { version: 1, resultsByDate: Object.fromEntries(recentEntries) };
  window.localStorage.setItem(RESULTS_KEY, JSON.stringify(stats));
}

export function markDailyGameCompleted(
  gameId: DailyGameId,
  status: "won" | "lost",
  score: number,
  dateKey = getKstDateKey(),
) {
  if (!isBrowser()) return;
  const completedGamesByDate = loadCompletedGamesByDate();
  completedGamesByDate[dateKey] = Array.from(
    new Set([...(completedGamesByDate[dateKey] ?? []), gameId]),
  );
  const recentEntries = Object.entries(completedGamesByDate).sort(([a], [b]) => a.localeCompare(b)).slice(-400);
  const stats: StoredDailyStatsV2 = { version: 2, completedGamesByDate: Object.fromEntries(recentEntries) };
  window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  saveGameResult(gameId, status, score, dateKey);
}

export function saveDailyPlayerGame(
  guessIds: number[],
  gameStatus: DailyGameStatus,
  puzzleId: string,
  dateKey = getKstDateKey(),
) {
  if (!isBrowser()) return;

  const game: StoredDailyPlayerGame = { version: 2, puzzleId, guessIds, gameStatus };
  window.localStorage.setItem(getDailyPlayerStorageKey(dateKey), JSON.stringify(game));

  if (gameStatus === "won" || gameStatus === "lost") {
    markDailyGameCompleted("daily-player", gameStatus, guessIds.length, dateKey);
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
  if (game.gameStatus === "won" || game.gameStatus === "lost") {
    markDailyGameCompleted("kboten", game.gameStatus, game.wrongNames.length, dateKey);
  }
  emitProgressChange();
}

export function loadKbo5001Game(dateKey = getKstDateKey()): StoredKbo5001Game | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(getKbo5001StorageKey(dateKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredKbo5001Game>;
    if (
      parsed.version !== 1 ||
      typeof parsed.puzzleId !== "string" ||
      !Array.isArray(parsed.selectedNames) ||
      !Array.isArray(parsed.submissions) ||
      (parsed.gameStatus !== "playing" && parsed.gameStatus !== "won" && parsed.gameStatus !== "lost")
    ) return null;
    return {
      version: 1,
      puzzleId: parsed.puzzleId,
      selectedNames: parsed.selectedNames.filter((name): name is string => typeof name === "string"),
      submissions: parsed.submissions
        .filter((submission): submission is Kbo5001Submission =>
          Boolean(submission && Array.isArray(submission.names) && Number.isFinite(submission.sum)))
        .map((submission) => ({
          names: submission.names.filter((name): name is string => typeof name === "string"),
          sum: submission.sum,
        })),
      gameStatus: parsed.gameStatus,
    };
  } catch {
    return null;
  }
}

export function getKbo5001GameSnapshot(puzzleId: string, dateKey = getKstDateKey()) {
  const game = loadKbo5001Game(dateKey);
  if (!game || game.puzzleId !== puzzleId) return EMPTY_KBO5001_SNAPSHOT;
  return JSON.stringify({
    gameStatus: game.gameStatus,
    selectedNames: game.selectedNames,
    submissions: game.submissions,
  });
}

export function getServerKbo5001GameSnapshot() {
  return EMPTY_KBO5001_SNAPSHOT;
}

export function saveKbo5001Game(game: Omit<StoredKbo5001Game, "version">, dateKey = getKstDateKey()) {
  if (!isBrowser()) return;
  window.localStorage.setItem(getKbo5001StorageKey(dateKey), JSON.stringify({ version: 1, ...game }));
  if (game.gameStatus === "won" || game.gameStatus === "lost") {
    markDailyGameCompleted("kbo5001", game.gameStatus, game.submissions.length, dateKey);
  }
  emitProgressChange();
}

export function loadKboBingoGame(dateKey = getKstDateKey()): StoredKboBingoGame | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(getKboBingoStorageKey(dateKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredKboBingoGame>;
    if (
      parsed.version !== 1 ||
      typeof parsed.puzzleId !== "string" ||
      !Array.isArray(parsed.turns) ||
      (parsed.gameStatus !== "playing" && parsed.gameStatus !== "won" && parsed.gameStatus !== "lost")
    ) return null;
    return {
      version: 1,
      puzzleId: parsed.puzzleId,
      turns: parsed.turns
        .filter((turn): turn is KboBingoTurn => Boolean(
          turn && Number.isInteger(turn.playerId) &&
          (turn.cellId === null || typeof turn.cellId === "string") &&
          typeof turn.correct === "boolean",
        )),
      gameStatus: parsed.gameStatus,
    };
  } catch {
    return null;
  }
}

export function getKboBingoGameSnapshot(puzzleId: string, dateKey = getKstDateKey()) {
  const game = loadKboBingoGame(dateKey);
  if (!game || game.puzzleId !== puzzleId) return EMPTY_KBO_BINGO_SNAPSHOT;
  return JSON.stringify({ gameStatus: game.gameStatus, turns: game.turns });
}

export function getServerKboBingoGameSnapshot() {
  return EMPTY_KBO_BINGO_SNAPSHOT;
}

export function saveKboBingoGame(game: Omit<StoredKboBingoGame, "version">, dateKey = getKstDateKey()) {
  if (!isBrowser()) return;
  window.localStorage.setItem(getKboBingoStorageKey(dateKey), JSON.stringify({ version: 1, ...game }));
  if (game.gameStatus === "won" || game.gameStatus === "lost") {
    markDailyGameCompleted("kbo-bingo", game.gameStatus, game.turns.length, dateKey);
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

export function getGameStatsSummary(gameId: DailyGameId, todayKey = getKstDateKey()): GameStatsSummary {
  const results = Object.entries(loadGameResults())
    .flatMap(([date, games]) => {
      const result = games[gameId];
      return result ? [{ date, ...result }] : [];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const wins = results.filter((result) => result.status === "won");
  const winDates = new Set(wins.map((result) => dateOrdinal(result.date)));
  const today = dateOrdinal(todayKey);
  const todayResult = results.find((result) => result.date === todayKey);

  let currentStreak = 0;
  let cursor = todayResult?.status === "won" ? today : todayResult?.status === "lost" ? Number.NaN : today - 1;
  while (Number.isFinite(cursor) && winDates.has(cursor)) {
    currentStreak += 1;
    cursor -= 1;
  }

  let bestStreak = 0;
  let run = 0;
  let previous: number | null = null;
  for (const ordinal of [...winDates].sort((a, b) => a - b)) {
    run = previous !== null && ordinal === previous + 1 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    previous = ordinal;
  }

  return {
    played: results.length,
    wins: wins.length,
    winRate: results.length ? Math.round((wins.length / results.length) * 100) : 0,
    currentStreak,
    bestStreak,
    averageWinningScore: wins.length
      ? wins.reduce((sum, result) => sum + result.score, 0) / wins.length
      : null,
  };
}

export function getGameStatsSnapshot(gameId: DailyGameId, todayKey = getKstDateKey()) {
  return JSON.stringify(getGameStatsSummary(gameId, todayKey));
}

export function getServerGameStatsSnapshot() {
  return '{"played":0,"wins":0,"winRate":0,"currentStreak":0,"bestStreak":0,"averageWinningScore":null}';
}

export function getDailyProgress(): DailyPlayerProgress {
  const todayKey = getKstDateKey();
  const completedCount = loadCompletedGamesByDate()[todayKey]?.length ?? 0;
  if (completedCount >= DAILY_GAME_COUNT) return "completed";

  const game = loadDailyPlayerGame();
  const kboTenGame = loadKboTenGame();
  const kbo5001Game = loadKbo5001Game();
  const kboBingoGame = loadKboBingoGame();
  return completedCount > 0 || (game && game.guessIds.length > 0) || (kboTenGame && (kboTenGame.correctNames.length > 0 || kboTenGame.wrongNames.length > 0)) || (kbo5001Game && (kbo5001Game.selectedNames.length > 0 || kbo5001Game.submissions.length > 0)) || (kboBingoGame && kboBingoGame.turns.length > 0)
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
