import dailyPuzzles from "@/data/questions/kboten/index.json";
import { playerCatalog } from "@/lib/player-catalog";

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
  eligibility: {
    recordType: "career-rate" | "career-counting" | "season-rate" | "season-counting" | "award-list" | "award-counting";
    minimum: { unit: "PA" | "IP"; value: number } | null;
    ruleSource: string;
  };
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

export type KboTenPublicPuzzle = Omit<KboTenPuzzle, "answers"> & {
  answers: Array<Omit<KboTenAnswer, "value">>;
};

export function getDailyKboTenPuzzle(dateKey: string): KboTenPuzzle {
  const puzzles = dailyPuzzles as KboTenPuzzle[];
  const puzzle = puzzles.find((candidate) => candidate.publishDate === dateKey);
  if (!puzzle) throw new Error(`${dateKey} 크보텐 문제를 찾을 수 없습니다.`);
  return puzzle;
}

export function toPublicKboTenPuzzle(puzzle: KboTenPuzzle): KboTenPublicPuzzle {
  return {
    ...puzzle,
    answers: puzzle.answers.map((answer) => ({
      rank: answer.rank,
      name: answer.name,
      status: answer.status,
      aliases: answer.aliases,
    })),
  };
}

export function normalizePlayerName(name: string) {
  return name.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/[\s.·_-]/g, "");
}

export function getKboTenPlayerOptions(puzzle: Pick<KboTenPublicPuzzle, "answers">): KboTenPlayerOption[] {
  const options = new Map<string, KboTenPlayerOption>();

  for (const player of playerCatalog) {
    const key = normalizePlayerName(player.name);
    const existing = options.get(key);
    if (existing && player.status !== "active") continue;
    options.set(key, {
      id: `kbo:${player.id}`,
      name: player.name,
      aliases: player.aliases ?? [],
      detail: player.current?.team ?? "은퇴 선수",
    });
  }

  for (const answer of puzzle.answers) {
    const key = normalizePlayerName(answer.name);
    const existing = options.get(key);
    options.set(key, {
      id: existing?.id ?? `answer:${key}`,
      name: answer.name,
      aliases: Array.from(new Set([...(existing?.aliases ?? []), ...answer.aliases])),
      detail: existing?.detail ?? (answer.status === "active" ? "현역 선수" : answer.status === "retired" ? "은퇴 선수" : "KBO 경력 선수"),
    });
  }

  return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));
}
