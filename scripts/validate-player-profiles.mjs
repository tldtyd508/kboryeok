import fs from "node:fs/promises";

const directory = "data/players/profiles";
const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".json"));
const activePlayers = JSON.parse(await fs.readFile("public/players.json", "utf8"));
const historicalHitters = JSON.parse(await fs.readFile("data/player-index/historical.json", "utf8"));
const historicalPitchers = JSON.parse(await fs.readFile("data/player-index/historical-pitchers.json", "utf8"));
const indexedPlayers = new Map(
  [...activePlayers, ...historicalHitters.players, ...historicalPitchers.players]
    .map((player) => [player.id, player.name]),
);
const seenIds = new Set();

for (const file of files) {
  const profile = JSON.parse(await fs.readFile(`${directory}/${file}`, "utf8"));
  if (`${profile.id}.json` !== file) throw new Error(`${file}: 파일명과 선수 ID가 다릅니다.`);
  if (seenIds.has(profile.id)) throw new Error(`${file}: 중복 선수 ID입니다.`);
  seenIds.add(profile.id);
  if (indexedPlayers.get(profile.id) !== profile.name) throw new Error(`${file}: 기본 선수 인덱스의 ID·이름과 일치하지 않습니다.`);
  if (!profile.name || profile.status !== "retired") throw new Error(`${file}: 은퇴 선수 이름 또는 상태가 올바르지 않습니다.`);
  if (!profile.positionGroup || !profile.throws || !profile.bats || !Number.isInteger(profile.birthYear)) {
    throw new Error(`${file}: 포지션·투타·출생연도 이력이 필요합니다.`);
  }
  const numbers = profile.career?.jerseyNumbers;
  if (!Array.isArray(numbers) || numbers.length === 0 || numbers.some((number) => !Number.isInteger(number) || number < 0 || number > 99)) {
    throw new Error(`${file}: KBO 선수 시절 등번호 이력이 올바르지 않습니다.`);
  }
  if (new Set(numbers).size !== numbers.length) throw new Error(`${file}: 등번호 이력에 중복이 있습니다.`);
  if (!profile.sources?.some((source) => source.role === "primary" && source.url.includes("koreabaseball.com"))) {
    throw new Error(`${file}: KBO 공식 1차 출처가 필요합니다.`);
  }
  if (profile.review?.status !== "verified") throw new Error(`${file}: verified 검수가 필요합니다.`);
}

console.log(`개별 은퇴 선수 프로필 ${files.length}개 검증 완료`);
