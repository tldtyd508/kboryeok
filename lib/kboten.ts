import careerAveragePuzzle from "@/data/questions/kboten/2026-09-04-career-average.json";
import historicalIndex from "@/data/player-index/historical.json";
import activePlayers from "@/public/players.json";

export type PlayerStatus = "active" | "retired" | "inactive" | "unknown";

export interface KboTenAnswer {
  rank: number;
  name: string;
  value: string;
  status: PlayerStatus;
  aliases: string[];
}

export interface KboTenPlayerOption {
  id: string;
  name: string;
  aliases: string[];
  detail: string;
}

export interface KboTenPuzzle {
  id: string;
  game: "kboten";
  publishDate: string;
  revision: number;
  title: string;
  prompt: string;
  statLabel: string;
  scopeLabel: string;
  maxWrongGuesses: number;
  answers: KboTenAnswer[];
  sources: Array<{
    name: string;
    url: string;
    accessedAt: string;
    role: "primary" | "secondary";
  }>;
  review: {
    status: "verified" | "pending";
    reviewedAt: string;
    note: string;
  };
}

export function getDailyKboTenPuzzle(dateKey: string): KboTenPuzzle {
  const puzzles = [careerAveragePuzzle];
  const ordinal = dateKey.split("-").reduce((sum, part) => sum + Number(part), 0);
  return puzzles[ordinal % puzzles.length] as KboTenPuzzle;
}

export function normalizePlayerName(name: string) {
  return name.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/[\s.·_-]/g, "");
}

export function getKboTenPlayerOptions(puzzle: KboTenPuzzle): KboTenPlayerOption[] {
  const options = new Map<string, KboTenPlayerOption>();

  for (const player of historicalIndex.players) {
    options.set(normalizePlayerName(player.name), {
      id: `historical:${normalizePlayerName(player.name)}`,
      name: player.name,
      aliases: player.aliases,
      detail: "역대 선수",
    });
  }

  for (const player of activePlayers) {
    options.set(normalizePlayerName(player.name), {
      id: `kbo:${player.id}`,
      name: player.name,
      aliases: player.aliases ?? [],
      detail: player.team,
    });
  }

  for (const answer of puzzle.answers) {
    const key = normalizePlayerName(answer.name);
    const existing = options.get(key);
    options.set(key, {
      id: existing?.id ?? `answer:${key}`,
      name: answer.name,
      aliases: Array.from(new Set([...(existing?.aliases ?? []), ...answer.aliases])),
      detail: existing?.detail ?? (answer.status === "active" ? "현역 선수" : answer.status === "retired" ? "역대 선수" : "KBO 경력 선수"),
    });
  }

  return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));
}
