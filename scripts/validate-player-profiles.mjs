import fs from "node:fs/promises";

const directory = "data/players/profiles";
const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".json"));
const activePlayers = JSON.parse(await fs.readFile("data/generated/roster-2026.json", "utf8"));
const historicalHitters = JSON.parse(await fs.readFile("data/player-index/historical.json", "utf8"));
const historicalPitchers = JSON.parse(await fs.readFile("data/player-index/historical-pitchers.json", "utf8"));
const expectedById = new Map(
  [...historicalHitters.players, ...historicalPitchers.players, ...activePlayers].map((player) => [player.id, player.name]),
);
const seenIds = new Set();
let gameReady = 0;
let indexOnly = 0;

for (const file of files) {
  const profile = JSON.parse(await fs.readFile(`${directory}/${file}`, "utf8"));
  if (profile.schemaVersion !== 1) throw new Error(`${file}: schemaVersion 1이 필요합니다.`);
  if (`${profile.id}.json` !== file) throw new Error(`${file}: 파일명과 선수 ID가 다릅니다.`);
  if (seenIds.has(profile.id)) throw new Error(`${file}: 중복 선수 ID입니다.`);
  seenIds.add(profile.id);
  if (expectedById.has(profile.id) && expectedById.get(profile.id) !== profile.name) throw new Error(`${file}: 원본 인덱스의 ID·이름과 일치하지 않습니다.`);
  if (!expectedById.has(profile.id) && profile.status === "active") throw new Error(`${file}: 현행 명단에 없는 선수는 active일 수 없습니다.`);
  if (!["active", "retired", "inactive", "unknown"].includes(profile.status)) throw new Error(`${file}: 선수 상태가 올바르지 않습니다.`);
  if (!Array.isArray(profile.aliases) || new Set(profile.aliases).size !== profile.aliases.length) throw new Error(`${file}: 별칭 배열이 올바르지 않습니다.`);
  if (!profile.bio || !profile.career || !profile.review) throw new Error(`${file}: bio·career·review가 필요합니다.`);
  if (profile.bio.birthYear !== null && !Number.isInteger(profile.bio.birthYear)) throw new Error(`${file}: 출생연도가 올바르지 않습니다.`);
  const numbers = profile.career.jerseyNumbers;
  if (!Array.isArray(numbers) || numbers.some((number) => !Number.isInteger(number) || number < 0 || number > 999)) {
    throw new Error(`${file}: 등번호 이력이 올바르지 않습니다.`);
  }
  if (new Set(numbers).size !== numbers.length) throw new Error(`${file}: 등번호 이력에 중복이 있습니다.`);
  const numberHistory = profile.career.jerseyNumberHistory;
  if (numberHistory !== undefined && (!Array.isArray(numberHistory) || numberHistory.some((entry) =>
    !Number.isInteger(entry.number) || entry.number < 0 || entry.number > 999 || typeof entry.period !== "string" || !entry.period
  ))) {
    throw new Error(`${file}: 기간별 등번호 이력이 올바르지 않습니다.`);
  }
  if (!Array.isArray(profile.career.teamStints)) throw new Error(`${file}: teamStints 배열이 필요합니다.`);
  if (!profile.sources?.some((source) => source.role === "primary" && source.url?.startsWith("https://"))) {
    throw new Error(`${file}: KBO 또는 구단 공식 1차 출처가 필요합니다.`);
  }
  if (!["game-ready", "index-only"].includes(profile.review.completeness)) throw new Error(`${file}: 완성도 등급이 올바르지 않습니다.`);
  if (profile.status === "active") {
    if (!profile.current?.teamId || !profile.current?.team) {
      throw new Error(`${file}: 현역 선수의 현재 구단이 필요합니다.`);
    }
    if (profile.review.completeness === "game-ready" && !Number.isInteger(profile.current.jerseyNumber)) {
      throw new Error(`${file}: game-ready 현역 선수의 현재 등번호가 필요합니다.`);
    }
  } else if (profile.current !== null) throw new Error(`${file}: 비현역 선수의 current는 null이어야 합니다.`);
  if (profile.review.completeness === "game-ready") {
    if (!profile.bio.positionGroup || !profile.bio.throws || !profile.bio.bats || !Number.isInteger(profile.bio.birthYear)) {
      throw new Error(`${file}: game-ready 선수의 기본 속성이 부족합니다.`);
    }
    gameReady += 1;
  } else indexOnly += 1;
  if (profile.review.status === "verified" && profile.status === "retired" && numbers.length) {
    const jerseySources = profile.career.jerseyNumberSources;
    if (!Array.isArray(jerseySources) || !jerseySources.some((source) => source.url?.startsWith("https://") && source.accessedAt)) {
      throw new Error(`${file}: 검수된 은퇴 선수 등번호에는 참고 문서와 확인일이 필요합니다.`);
    }
  }
  if (numberHistory?.length && !numberHistory.every((entry) => numbers.includes(entry.number))) {
    throw new Error(`${file}: 기간별 등번호가 등번호 목록과 일치하지 않습니다.`);
  }
}

const missing = [...expectedById.keys()].filter((id) => !seenIds.has(id));
if (missing.length) throw new Error(`개별 프로필이 없는 선수 ID: ${missing.join(", ")}`);
if (files.length < expectedById.size) throw new Error(`프로필 ${files.length}개가 고유 원본 선수 ${expectedById.size}명보다 적습니다.`);

console.log(`개별 선수 프로필 ${files.length}개 검증 완료: game-ready ${gameReady}명 · index-only ${indexOnly}명`);
