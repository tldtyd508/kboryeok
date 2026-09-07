import fs from "node:fs/promises";
import process from "node:process";

function kstMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

const metadata = JSON.parse(await fs.readFile("data/roster-metadata.json", "utf8"));
const generatedRoster = JSON.parse(await fs.readFile(`data/generated/roster-${metadata.season}.json`, "utf8"));
const publicPlayers = JSON.parse(await fs.readFile("public/players.json", "utf8"));
const dailyPuzzles = JSON.parse(await fs.readFile("public/daily_puzzles.json", "utf8"));
const reviewedMonth = metadata.lastReviewedAt.slice(0, 7);
const currentMonth = kstMonth();

const publicIds = new Set(publicPlayers.map((player) => player.id));
const eligibleRoster = generatedRoster.filter((player) => player.quizEligible);
const duplicateIds = publicPlayers.filter((player, index, players) =>
  players.findIndex((candidate) => candidate.id === player.id) !== index);
const incompletePlayers = publicPlayers.filter((player) =>
  !player.name || !player.team || !player.positionDetail || !player.throws || !player.bats ||
  !/^\d{4}-\d{2}-\d{2}$/.test(player.birthDate) || !Number.isInteger(player.jerseyNumber));
const brokenPuzzleDates = Object.entries(dailyPuzzles)
  .filter(([, playerId]) => !publicIds.has(playerId))
  .map(([date]) => date);

if (generatedRoster.length !== metadata.rosterCount) {
  throw new Error(`메타데이터 선수 수 ${metadata.rosterCount}명과 생성 명단 ${generatedRoster.length}명이 다릅니다.`);
}
if (publicPlayers.length !== metadata.quizEligibleCount || publicPlayers.length !== eligibleRoster.length) {
  throw new Error(`공개 후보 수가 일치하지 않습니다: 공개 ${publicPlayers.length}, 메타데이터 ${metadata.quizEligibleCount}, 출제 가능 ${eligibleRoster.length}`);
}
if (duplicateIds.length) throw new Error(`공개 후보에 중복 ID가 있습니다: ${duplicateIds.map((player) => player.id).join(", ")}`);
if (incompletePlayers.length) throw new Error(`필수 프로필이 비어 있는 공개 후보가 있습니다: ${incompletePlayers.map((player) => player.name).join(", ")}`);
if (brokenPuzzleDates.length) throw new Error(`선수 명단에 없는 일일 문제 정답이 있습니다: ${brokenPuzzleDates.join(", ")}`);

if (reviewedMonth !== currentMonth) {
  console.error(
    `선수 명단의 마지막 검수 월은 ${reviewedMonth}입니다. ` +
    `${currentMonth} 변동분을 data/manual/roster-deltas.json에 반영한 뒤 data:import를 실행하세요.`
  );
  process.exitCode = 1;
} else {
  console.log(`선수 명단 검수 상태 정상: ${metadata.lastReviewedAt} · 공개 후보 ${publicPlayers.length}명 · 일일 문제 참조 정상`);
}
