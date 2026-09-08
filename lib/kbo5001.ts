import dailyPuzzles from "@/data/questions/kbo5001/index.json";
import { getPlayerProfileByName } from "@/lib/player-catalog";

export const KBO5001_LAUNCH_DATE = "2026-09-06";

export interface Kbo5001Candidate {
  playerId?: number;
  name: string;
  value: number;
  status: "active" | "retired" | "inactive";
}

export interface Kbo5001Puzzle {
  id: string;
  game: "kbo5001";
  publishDate: string;
  revision: number;
  title: string;
  prompt: string;
  statLabel: string;
  scopeLabel: string;
  target: number;
  selectionCount: number;
  maxSubmissions: number;
  candidates: Kbo5001Candidate[];
  solutions: string[][];
  sources: Array<{ name: string; url: string; accessedAt: string; role: "primary" }>;
  review: { status: "verified"; reviewedAt: string; note: string };
}

export function getDailyKbo5001Puzzle(dateKey: string): Kbo5001Puzzle {
  const puzzle = (dailyPuzzles as Kbo5001Puzzle[]).find((candidate) => candidate.publishDate === dateKey);
  if (!puzzle) throw new Error(`${dateKey} 크보 5001 문제를 찾을 수 없습니다.`);
  return {
    ...puzzle,
    candidates: puzzle.candidates.map((candidate) => {
      const profile = getPlayerProfileByName(candidate.name);
      return { ...candidate, playerId: profile?.id, status: profile?.status === "retired" ? "retired" : candidate.status };
    }),
  };
}
