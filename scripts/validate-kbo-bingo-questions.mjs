import fs from "node:fs/promises";
import {
  resolvePuzzleAttributeBoard,
} from "./lib/kbo-bingo-rules.mjs";

const directory = "data/questions/kbo-bingo";
const players = JSON.parse(await fs.readFile("public/players.json", "utf8"));
const historicalHitters = JSON.parse(await fs.readFile("data/player-index/historical.json", "utf8"));
const historicalPitchers = JSON.parse(await fs.readFile("data/player-index/historical-pitchers.json", "utf8"));
const playerById = new Map([
  ...historicalHitters.players.map((player) => [player.id, player]),
  ...historicalPitchers.players.map((player) => [player.id, player]),
  ...players.map((player) => [player.id, player]),
]);
const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".json") && file !== "index.json");

function canComplete(board, availableIds) {
  const available = new Set(availableIds);
  const playerToCell = new Map();

  function assign(cellIndex, visited) {
    for (const playerId of board[cellIndex].validPlayerIds) {
      if (!available.has(playerId) || visited.has(playerId)) continue;
      visited.add(playerId);
      const previousCell = playerToCell.get(playerId);
      if (previousCell === undefined || assign(previousCell, visited)) {
        playerToCell.set(playerId, cellIndex);
        return true;
      }
    }
    return false;
  }

  return board.every((_, cellIndex) => assign(cellIndex, new Set()));
}

function* removedSets(ids, count, start = 0, chosen = []) {
  if (chosen.length === count) {
    yield chosen;
    return;
  }
  for (let index = start; index <= ids.length - (count - chosen.length); index += 1) {
    yield* removedSets(ids, count, index + 1, [...chosen, ids[index]]);
  }
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

for (const file of files) {
  const puzzle = JSON.parse(await fs.readFile(`${directory}/${file}`, "utf8"));
  if (puzzle.game !== "kbo-bingo") throw new Error(`${file}: game 값이 kbo-bingo가 아닙니다.`);
  if (puzzle.board?.length !== 16) throw new Error(`${file}: 조건은 정확히 16개여야 합니다.`);
  if (puzzle.deck?.length !== 36 || puzzle.maxCards !== 36) throw new Error(`${file}: 선수 덱은 정확히 36장이어야 합니다.`);
  if (new Set(puzzle.deck).size !== 36) throw new Error(`${file}: 선수 덱에 중복이 있습니다.`);
  if (new Set(puzzle.board.map((cell) => cell.id)).size !== 16) throw new Error(`${file}: 조건 ID에 중복이 있습니다.`);
  if (puzzle.review?.status !== "verified") throw new Error(`${file}: verified 검수가 필요합니다.`);
  if (!puzzle.sources?.some((source) => source.role === "primary" && source.url.includes("koreabaseball.com"))) {
    throw new Error(`${file}: KBO 공식 1차 출처가 필요합니다.`);
  }

  const missingPlayers = puzzle.deck.filter((id) => !playerById.has(id));
  if (missingPlayers.length) throw new Error(`${file}: 선수 인덱스에 없는 ID ${missingPlayers.join(", ")}`);
  const deckIds = new Set(puzzle.deck);
  const resolvedBoard = resolvePuzzleAttributeBoard(puzzle, file);

  for (const cell of resolvedBoard) {
    if (!Array.isArray(cell.validPlayerIds)) throw new Error(`${file}: ${cell.label}의 판정 집합이 없습니다.`);
    const invalidIds = cell.validPlayerIds.filter((id) => !deckIds.has(id));
    if (invalidIds.length) throw new Error(`${file}: ${cell.label}에 덱 밖의 선수 ID가 있습니다: ${invalidIds.join(", ")}`);
    if (cell.validPlayerIds.length < 5) throw new Error(`${file}: ${cell.label}의 유효 선수가 5명 미만입니다.`);
    if (!cell.validPlayerIds.includes(cell.examplePlayerId)) throw new Error(`${file}: ${cell.label}의 대표 정답이 판정 집합에 없습니다.`);
  }
  if (!canComplete(resolvedBoard, puzzle.deck)) throw new Error(`${file}: 16칸 전체를 채우는 해답이 없습니다.`);

  for (const removed of removedSets(puzzle.deck, 4)) {
    const removedIds = new Set(removed);
    if (!canComplete(resolvedBoard, puzzle.deck.filter((id) => !removedIds.has(id)))) {
      throw new Error(`${file}: 카드 4장 제거 내성 실패 (${removed.join(", ")})`);
    }
  }

  const random = seededRandom(Number(puzzle.publishDate.replaceAll("-", "")));
  let successfulSamples = 0;
  for (let sample = 0; sample < 10_000; sample += 1) {
    const shuffled = [...puzzle.deck].sort(() => random() - 0.5);
    const removedIds = new Set(shuffled.slice(0, 8));
    if (canComplete(resolvedBoard, puzzle.deck.filter((id) => !removedIds.has(id)))) successfulSamples += 1;
  }
  if (successfulSamples < 9_900) throw new Error(`${file}: 카드 8장 제거 표본 성공률이 ${(successfulSamples / 100).toFixed(2)}%입니다.`);
}

console.log(`크보 빙고 문제 ${files.length}개 검증 완료: 4×4 판, 36장 덱, 제거 내성 정상`);
