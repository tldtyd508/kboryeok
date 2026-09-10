import fs from "node:fs/promises";
import { resolveAttributeRulePlayerIds } from "./lib/kbo-bingo-rules.mjs";

const teams = JSON.parse(await fs.readFile("data/relations/teams.json", "utf8"));
const players = JSON.parse(await fs.readFile("data/players/index.json", "utf8"));
const playerById = new Map(players.map((player) => [player.id, player]));
const teamIds = new Set(teams.teams.map((team) => team.id));
if (teams.schemaVersion !== 1 || teams.teams.length !== 10 || teamIds.size !== 10) throw new Error("구단 기준 정보는 고유한 10개 구단이어야 합니다.");

const teamSeasonFiles = (await fs.readdir("data/relations/team-seasons")).filter((file) => file.endsWith(".json"));
const coveredActiveIds = new Set();
for (const file of teamSeasonFiles) {
  const document = JSON.parse(await fs.readFile(`data/relations/team-seasons/${file}`, "utf8"));
  if (document.schemaVersion !== 1 || !Number.isInteger(document.season)) throw new Error(`${file}: 시즌 스키마가 올바르지 않습니다.`);
  if (document.teams.length !== 10 || new Set(document.teams.map((team) => team.teamId)).size !== 10) throw new Error(`${file}: 10개 구단이 필요합니다.`);
  const seen = new Set();
  for (const team of document.teams) {
    if (!teamIds.has(team.teamId) || !team.manager?.name) throw new Error(`${file}: 구단 또는 감독 정보가 올바르지 않습니다.`);
    for (const playerId of team.playerIds) {
      if (seen.has(playerId)) throw new Error(`${file}: 선수 ${playerId}가 여러 구단에 중복됩니다.`);
      seen.add(playerId);
      const player = playerById.get(playerId);
      if (!player) throw new Error(`${file}: 선수 인덱스에 ${playerId}가 없습니다.`);
      if (document.season === 2026 && player.current?.team !== team.team) throw new Error(`${file}: ${player.name}의 현재 구단이 다릅니다.`);
      if (document.season === 2026) coveredActiveIds.add(playerId);
    }
  }
  if (!document.sources?.some((source) => source.role === "primary" && source.url?.includes("koreabaseball.com"))) {
    throw new Error(`${file}: KBO 공식 1차 출처가 필요합니다.`);
  }
}
const activeIds = players.filter((player) => player.status === "active").map((player) => player.id);
const missingActiveIds = activeIds.filter((id) => !coveredActiveIds.has(id));
if (missingActiveIds.length) throw new Error(`2026 팀 시즌에 없는 현역 선수: ${missingActiveIds.join(", ")}`);

const awardFiles = (await fs.readdir("data/relations/awards")).filter((file) => file.endsWith(".json"));
const awardKeys = new Set();
let awardCount = 0;
for (const file of awardFiles) {
  const document = JSON.parse(await fs.readFile(`data/relations/awards/${file}`, "utf8"));
  if (document.schemaVersion !== 1 || document.review?.status !== "verified") throw new Error(`${file}: 검수된 수상 스키마가 필요합니다.`);
  if (!document.sources?.some((source) => source.role === "primary" && source.url?.includes("koreabaseball.com"))) {
    throw new Error(`${file}: KBO 공식 1차 출처가 필요합니다.`);
  }
  for (const award of document.records) {
    if (!award.awardId || !Number.isInteger(award.year) || !award.playerName) throw new Error(`${file}: 수상 기록 필수값이 없습니다.`);
    const key = `${award.awardId}:${award.year}:${award.category ?? ""}:${award.playerName}`;
    if (awardKeys.has(key)) throw new Error(`${file}: 중복 수상 기록 ${key}`);
    awardKeys.add(key);
    if (award.playerId !== null && !playerById.has(award.playerId)) throw new Error(`${file}: 수상 선수 ID ${award.playerId}가 없습니다.`);
    awardCount += 1;
  }
}

const relationIndex = JSON.parse(await fs.readFile("data/relations/index.json", "utf8"));
const firstSeason = relationIndex.teamSeasons[0];
const firstTeam = firstSeason.teams.find((team) => team.playerIds.length >= 2);
const otherTeam = firstSeason.teams.find((team) => team.teamId !== firstTeam.teamId && team.playerIds.length);
const [targetId, teammateId] = firstTeam.playerIds;
const ruleDeck = [targetId, teammateId, otherTeam.playerIds[0]];
const teammateMatches = resolveAttributeRulePlayerIds(
  { type: "teammate", playerId: targetId, seasons: [firstSeason.season] },
  ruleDeck,
  playerById,
  relationIndex,
);
if (teammateMatches.length !== 1 || teammateMatches[0] !== teammateId) throw new Error("팀메이트 관계 규칙 자체 검증에 실패했습니다.");
const managerMatches = resolveAttributeRulePlayerIds(
  { type: "managedBy", values: [firstTeam.manager.name], seasons: [firstSeason.season] },
  ruleDeck,
  playerById,
  relationIndex,
);
if (!managerMatches.includes(targetId) || !managerMatches.includes(teammateId) || managerMatches.includes(otherTeam.playerIds[0])) {
  throw new Error("감독 관계 규칙 자체 검증에 실패했습니다.");
}
const resolvedAward = relationIndex.awards.find((award) => award.playerId !== null);
const awardMatches = resolveAttributeRulePlayerIds(
  { type: "award", values: [resolvedAward.awardId], years: [resolvedAward.year] },
  [resolvedAward.playerId, otherTeam.playerIds[0]],
  playerById,
  relationIndex,
);
if (!awardMatches.includes(resolvedAward.playerId)) throw new Error("수상 관계 규칙 자체 검증에 실패했습니다.");

console.log(`선수 관계 검증 완료: 구단 10개·현역 ${coveredActiveIds.size}명·수상 ${awardCount}건·빙고 관계 규칙 정상`);
