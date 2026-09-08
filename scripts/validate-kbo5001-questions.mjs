import fs from "node:fs/promises";

const directory = "data/questions/kbo5001";
const files = (await fs.readdir(directory))
  .filter((file) => file.endsWith(".json") && file !== "index.json");

function combinations(items, count, start = 0, picked = []) {
  if (picked.length === count) return [picked];
  const results = [];
  for (let index = start; index <= items.length - (count - picked.length); index += 1) {
    results.push(...combinations(items, count, index + 1, [...picked, items[index]]));
  }
  return results;
}

function shuffledCandidates(candidates, seedText) {
  let state = Array.from(seedText).reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619), 2166136261) >>> 0;
  const shuffled = [...candidates];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = Math.floor((state / 2 ** 32) * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

for (const file of files) {
  const puzzle = JSON.parse(await fs.readFile(`${directory}/${file}`, "utf8"));
  if (puzzle.review?.status !== "verified") throw new Error(`${file}: review.status가 verified가 아닙니다.`);
  if (!Number.isInteger(puzzle.target) || puzzle.target <= 0) throw new Error(`${file}: 목표값이 올바르지 않습니다.`);
  if (!Number.isInteger(puzzle.selectionCount) || puzzle.selectionCount < 2) throw new Error(`${file}: 선택 인원이 올바르지 않습니다.`);
  if (!Number.isInteger(puzzle.maxSubmissions) || puzzle.maxSubmissions < 1) throw new Error(`${file}: 제출 횟수가 올바르지 않습니다.`);
  if (!Array.isArray(puzzle.candidates) || puzzle.candidates.length < puzzle.selectionCount) throw new Error(`${file}: 후보가 부족합니다.`);

  const candidateNames = puzzle.candidates.map((candidate) => candidate.name);
  if (new Set(candidateNames).size !== candidateNames.length) throw new Error(`${file}: 후보 선수 이름이 중복됩니다.`);
  if (puzzle.candidates.some((candidate) => !Number.isInteger(candidate.value) || candidate.value < 0)) throw new Error(`${file}: 후보 기록값이 올바르지 않습니다.`);

  const solutions = combinations(puzzle.candidates, puzzle.selectionCount)
    .filter((combination) => combination.reduce((sum, candidate) => sum + candidate.value, 0) === puzzle.target)
    .map((combination) => combination.map((candidate) => candidate.name).sort((a, b) => a.localeCompare(b, "ko-KR")))
    .sort((a, b) => a.join("|").localeCompare(b.join("|"), "ko-KR"));
  const recordedSolutions = puzzle.solutions
    .map((solution) => [...solution].sort((a, b) => a.localeCompare(b, "ko-KR")))
    .sort((a, b) => a.join("|").localeCompare(b.join("|"), "ko-KR"));
  if (solutions.length === 0 || solutions.length > 3) throw new Error(`${file}: 정답 조합은 1~3개여야 합니다. 현재 ${solutions.length}개입니다.`);
  if (JSON.stringify(solutions) !== JSON.stringify(recordedSolutions)) throw new Error(`${file}: 기록된 정답 조합이 전수 검사 결과와 다릅니다.`);
  const firstDisplayed = shuffledCandidates(puzzle.candidates, `${puzzle.id}:r${puzzle.revision}`)
    .slice(0, puzzle.selectionCount)
    .map((candidate) => candidate.name)
    .sort((a, b) => a.localeCompare(b, "ko-KR"));
  if (solutions.some((solution) => JSON.stringify(solution) === JSON.stringify(firstDisplayed))) {
    throw new Error(`${file}: 화면의 첫 ${puzzle.selectionCount}명이 정답 조합입니다.`);
  }
}

console.log(`크보 5001 문제 ${files.length}개 검증 완료: 후보 조합과 정답 일치`);
