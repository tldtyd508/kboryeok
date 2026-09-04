import careerAveragePuzzle from "@/data/questions/kboten/2026-09-04-career-average.json";

export type PlayerStatus = "active" | "retired" | "inactive" | "unknown";

export interface KboTenAnswer {
  rank: number;
  name: string;
  value: string;
  status: PlayerStatus;
  aliases: string[];
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
