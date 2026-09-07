import dailyPuzzles from "@/data/questions/kbo-bingo/index.json";
import historicalHitters from "@/data/player-index/historical.json";
import historicalPitchers from "@/data/player-index/historical-pitchers.json";
import activePlayers from "@/public/players.json";

export const KBO_BINGO_LAUNCH_DATE = "2026-09-07";

export interface KboBingoCell {
  id: string;
  label: string;
  validPlayerIds: number[];
  examplePlayerId: number;
}

export interface KboBingoPuzzle {
  id: string;
  game: "kbo-bingo";
  publishDate: string;
  revision: number;
  title: string;
  prompt: string;
  board: KboBingoCell[];
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

const playersById = new Map<number, KboBingoPlayer>();

for (const player of historicalHitters.players) {
  playersById.set(player.id, { id: player.id, name: player.name, team: "역대 선수", positionDetail: "타자" });
}
for (const player of historicalPitchers.players) {
  playersById.set(player.id, { id: player.id, name: player.name, team: "역대 선수", positionDetail: "투수" });
}
for (const player of activePlayers) {
  playersById.set(player.id, { id: player.id, name: player.name, team: player.team, positionDetail: player.positionDetail });
}

export function getDailyKboBingoPuzzle(dateKey: string): KboBingoPuzzle {
  const puzzle = (dailyPuzzles as KboBingoPuzzle[]).find((candidate) => candidate.publishDate === dateKey);
  if (!puzzle) throw new Error(`${dateKey} 크보 빙고 문제를 찾을 수 없습니다.`);
  return puzzle;
}

export function toPublicKboBingoPuzzle(puzzle: KboBingoPuzzle): KboBingoPublicPuzzle {
  return {
    ...puzzle,
    players: puzzle.deck.map((id) => {
      const player = playersById.get(id);
      if (!player) throw new Error(`크보 빙고 선수 ${id}를 찾을 수 없습니다.`);
      return player;
    }),
  };
}
