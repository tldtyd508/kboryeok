import fs from "node:fs/promises";

const questionDirectory = "data/questions/kboten";
const indexes = {
  PA: JSON.parse(await fs.readFile("data/player-index/historical.json", "utf8")),
  IP: JSON.parse(await fs.readFile("data/player-index/historical-pitchers.json", "utf8")),
};
const files = (await fs.readdir(questionDirectory)).filter((file) => file.endsWith(".json"));

for (const file of files) {
  const puzzle = JSON.parse(await fs.readFile(`${questionDirectory}/${file}`, "utf8"));
  if (puzzle.answers.length !== 10) throw new Error(`${file}: 답은 정확히 10명이어야 합니다.`);
  if (puzzle.review?.status !== "verified") throw new Error(`${file}: verified 검수가 필요합니다.`);
  if (!puzzle.sources?.some((source) => source.role === "primary" && source.url.includes("koreabaseball.com"))) {
    throw new Error(`${file}: KBO 공식 1차 출처가 필요합니다.`);
  }
  const ranks = puzzle.answers.map((answer) => answer.rank);
  if (new Set(ranks).size !== 10 || ranks.some((rank, index) => rank !== index + 1)) {
    throw new Error(`${file}: 순위는 중복 없이 1~10이어야 합니다.`);
  }
  const unit = puzzle.eligibility?.minimum?.unit;
  const index = indexes[unit];
  if (index) {
    const indexedNames = new Set(index.players.map((player) => player.name));
    const missing = puzzle.answers.filter((answer) => !indexedNames.has(answer.name));
    if (missing.length) throw new Error(`${file}: 공식 후보 풀에 없는 답: ${missing.map((answer) => answer.name).join(", ")}`);
  }
}

console.log(`크보텐 문제 ${files.length}개 검증 완료: 공식 후보 풀과 답안 분리 정상`);
