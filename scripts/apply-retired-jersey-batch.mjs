import fs from "node:fs/promises";
import path from "node:path";

const batchPath = process.argv[2];
if (!batchPath) {
  throw new Error("사용법: node scripts/apply-retired-jersey-batch.mjs <batch.json>");
}

const batch = JSON.parse(await fs.readFile(batchPath, "utf8"));
if (batch.schemaVersion !== 1 || !batch.batchId || !batch.reviewedAt) {
  throw new Error(`${batchPath}: 배치 메타데이터가 올바르지 않습니다.`);
}
if (!Array.isArray(batch.players) || batch.players.length !== batch.selection.requestedCount) {
  throw new Error(`${batchPath}: 요청 인원과 선수 수가 일치하지 않습니다.`);
}

const seenIds = new Set();
for (const player of batch.players) {
  if (seenIds.has(player.id)) throw new Error(`${batchPath}: 중복 선수 ID ${player.id}`);
  seenIds.add(player.id);
  if (!Array.isArray(player.jerseyNumbers) || player.jerseyNumbers.length === 0) {
    throw new Error(`${batchPath}: ${player.name}의 등번호가 비어 있습니다.`);
  }
  if (new Set(player.jerseyNumbers).size !== player.jerseyNumbers.length) {
    throw new Error(`${batchPath}: ${player.name}의 등번호 목록에 중복이 있습니다.`);
  }
  if (!Array.isArray(player.jerseyNumberHistory) || player.jerseyNumberHistory.length === 0) {
    throw new Error(`${batchPath}: ${player.name}의 등번호 이력이 비어 있습니다.`);
  }
  const historyNumbers = new Set(player.jerseyNumberHistory.map((entry) => entry.number));
  if (!player.jerseyNumbers.every((number) => historyNumbers.has(number))) {
    throw new Error(`${batchPath}: ${player.name}의 등번호 목록과 기간별 이력이 일치하지 않습니다.`);
  }
  if (!player.profileUrl?.startsWith("https://www.koreabaseball.com/") || !player.namuUrl?.startsWith("https://namu.wiki/w/")) {
    throw new Error(`${batchPath}: ${player.name}의 출처 URL이 올바르지 않습니다.`);
  }

  const profilePath = path.join("data/players/profiles", `${player.id}.json`);
  const profile = JSON.parse(await fs.readFile(profilePath, "utf8"));
  if (profile.name !== player.name || profile.status !== "retired") {
    throw new Error(`${profilePath}: 은퇴 선수 ID·이름이 배치와 일치하지 않습니다.`);
  }

  profile.bio.birthYear ??= player.birthYear;
  profile.career.debutYear = player.debutYear;
  profile.career.retirementYear = player.retirementYear;
  profile.career.jerseyNumbers = player.jerseyNumbers;
  profile.career.jerseyNumberHistory = player.jerseyNumberHistory;
  profile.career.jerseyNumberSources = [{
    name: `나무위키 ${player.namuTitle}`,
    url: player.namuUrl,
    accessedAt: batch.reviewedAt,
  }];
  profile.review = {
    ...profile.review,
    status: "verified",
    reviewedAt: batch.reviewedAt,
    note: `${batch.batchId}: KBO 활동기간과 나무위키 등번호 이력을 대조함.`,
  };

  await fs.writeFile(profilePath, `${JSON.stringify(profile, null, 2)}\n`);
}

console.log(`${batch.batchId}: 은퇴 선수 프로필 ${batch.players.length}명 반영 완료`);
