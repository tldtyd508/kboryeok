import dailyPuzzles from "@/data/questions/kbo-bingo/index.json";
import { playerProfileById } from "@/lib/player-catalog";

export const KBO_BINGO_LAUNCH_DATE = "2026-09-07";

export interface KboBingoCell {
  id: string;
  label: string;
  validPlayerIds: number[];
  examplePlayerId: number;
  rule?:
    | { type: "team" | "position" | "bats" | "throws"; values: string[] }
    | { type: "birthYear" | "jerseyNumber"; min?: number; max?: number };
}

export interface KboBingoPuzzle {
  id: string;
  game: "kbo-bingo";
  publishDate: string;
  revision: number;
  title: string;
  prompt: string;
  board: KboBingoCell[];
  deckOrder?: "balanced-shuffle";
  deck: number[];
  maxCards: number;
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

export interface KboBingoPlayer {
  id: number;
  name: string;
  team: string;
  positionDetail: string;
}

export type KboBingoPublicPuzzle = KboBingoPuzzle & {
  players: KboBingoPlayer[];
};

export function getDailyKboBingoPuzzle(dateKey: string): KboBingoPuzzle {
  const puzzle = (dailyPuzzles as KboBingoPuzzle[]).find((candidate) => candidate.publishDate === dateKey);
  if (!puzzle) throw new Error(`${dateKey} 크보 빙고 문제를 찾을 수 없습니다.`);
  return puzzle;
}

export function toPublicKboBingoPuzzle(puzzle: KboBingoPuzzle): KboBingoPublicPuzzle {
  return {
    ...puzzle,
    players: puzzle.deck.map((id) => {
      const player = playerProfileById.get(id);
      if (!player) throw new Error(`크보 빙고 선수 ${id}를 찾을 수 없습니다.`);
      return {
        id: player.id,
        name: player.name,
        team: player.current?.team ?? "은퇴 선수",
        positionDetail: player.positionDetail ?? (player.positionGroup === "P" ? "투수" : "타자"),
      };
    }),
  };
}
