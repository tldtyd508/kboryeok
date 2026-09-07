import fs from "node:fs/promises";

const questionDirectory = "data/questions/kboten";
const indexes = {
  PA: JSON.parse(await fs.readFile("data/player-index/historical.json", "utf8")),
  IP: JSON.parse(await fs.readFile("data/player-index/historical-pitchers.json", "utf8")),
};
const files = (await fs.readdir(questionDirectory))
  .filter((file) => file.endsWith(".json") && file !== "index.json");

for (const file of files) {
  const puzzle = JSON.parse(await fs.readFile(`${questionDirectory}/${file}`, "utf8"));
  if (puzzle.answers.length !== 10) throw new Error(`${file}: 답은 정확히 10명이어야 합니다.`);
  if (puzzle.review?.status !== "verified") throw new Error(`${file}: verified 검수가 필요합니다.`);
  if (!puzzle.sources?.some((source) => source.role === "primary" && source.url.includes("koreabaseball.com"))) {
    throw new Error(`${file}: KBO 공식 1차 출처가 필요합니다.`);
  }
  const recordType = puzzle.eligibility?.recordType;
  const supportedRecordTypes = new Set([
    "career-rate",
    "career-counting",
    "season-rate",
    "season-counting",
    "award-list",
    "award-counting",
  ]);
  if (!supportedRecordTypes.has(recordType)) throw new Error(`${file}: 지원하지 않는 출제 유형 ${recordType}`);
  if (recordType.startsWith("award-") && puzzle.eligibility.minimum !== null) {
    throw new Error(`${file}: 수상 내역 문제에는 타석·이닝 최소 표본을 적용하지 않습니다.`);
  }
  const ranks = puzzle.answers.map((answer) => answer.rank);
  if (new Set(ranks).size !== 10 || ranks.some((rank, index) => rank !== index + 1)) {
    throw new Error(`${file}: 순위는 중복 없이 1~10이어야 합니다.`);
  }
  const answerNames = puzzle.answers.map((answer) => answer.name);
  if (new Set(answerNames).size !== 10) throw new Error(`${file}: 답안 선수 이름에 중복이 있습니다.`);

  if (!recordType.startsWith("award-")) {
    const unit = puzzle.eligibility?.minimum?.unit;
    const candidatePlayers = indexes[unit]?.players ?? [...indexes.PA.players, ...indexes.IP.players];
    const indexedNames = new Set(candidatePlayers.map((player) => player.name));
    const missing = puzzle.answers.filter((answer) => !indexedNames.has(answer.name));
    if (missing.length) throw new Error(`${file}: 공식 후보 풀에 없는 답: ${missing.map((answer) => answer.name).join(", ")}`);
  }
}

console.log(`크보텐 문제 ${files.length}개 검증 완료: 공식 후보 풀과 답안 분리 정상`);
