import fs from "node:fs/promises";

const teams = JSON.parse(await fs.readFile("data/relations/teams.json", "utf8"));
const teamSeasonDirectory = "data/relations/team-seasons";
const awardDirectory = "data/relations/awards";
const teamSeasonFiles = (await fs.readdir(teamSeasonDirectory)).filter((file) => file.endsWith(".json") && file !== "index.json").sort();
const awardFiles = (await fs.readdir(awardDirectory)).filter((file) => file.endsWith(".json") && file !== "index.json").sort();
const teamSeasons = await Promise.all(teamSeasonFiles.map(async (file) =>
  JSON.parse(await fs.readFile(`${teamSeasonDirectory}/${file}`, "utf8"))));
const awardDocuments = await Promise.all(awardFiles.map(async (file) =>
  JSON.parse(await fs.readFile(`${awardDirectory}/${file}`, "utf8"))));
const awards = awardDocuments.flatMap((document) => document.records);
const byPlayer = {};

function playerRelations(playerId) {
  byPlayer[playerId] ??= { teamSeasons: [], awards: [] };
  return byPlayer[playerId];
}

for (const seasonDocument of teamSeasons) {
  for (const team of seasonDocument.teams) {
    for (const playerId of team.playerIds) {
      playerRelations(playerId).teamSeasons.push({
        season: seasonDocument.season,
        teamId: team.teamId,
        manager: team.manager.name,
      });
    }
  }
}
for (const award of awards) {
  if (award.playerId === null) continue;
  playerRelations(award.playerId).awards.push({
    awardId: award.awardId,
    year: award.year,
    ...(award.category ? { category: award.category } : {}),
  });
}

const output = {
  schemaVersion: 1,
  teams: teams.teams,
  teamSeasons: teamSeasons.map((document) => ({ season: document.season, teams: document.teams })),
  awards,
  byPlayer,
};
await fs.writeFile("data/relations/index.json", `${JSON.stringify(output, null, 2)}\n`);
console.log(`관계 인덱스 생성: 팀 시즌 ${teamSeasons.length}개·수상 ${awards.length}건·연결 선수 ${Object.keys(byPlayer).length}명`);
