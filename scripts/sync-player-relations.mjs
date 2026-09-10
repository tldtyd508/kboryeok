import fs from "node:fs/promises";
import ExcelJS from "exceljs";

const season = 2026;
const rosterSourceUrl = "https://www.koreabaseball.com/MediaNews/Notice/View.aspx?bdSe=11831";
const teamsDocument = JSON.parse(await fs.readFile("data/relations/teams.json", "utf8"));
const teamByCompactName = new Map(teamsDocument.teams.map((team) => [team.name.replace(/\s+/g, ""), team]));
const profileDirectory = "data/players/profiles";
const profileFiles = (await fs.readdir(profileDirectory)).filter((file) => file.endsWith(".json"));
const profiles = await Promise.all(profileFiles.map(async (file) =>
  JSON.parse(await fs.readFile(`${profileDirectory}/${file}`, "utf8"))));

function cellText(cell) {
  const value = cell?.value;
  if (value == null) return "";
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text ?? "").join("").trim();
    if (value.result != null) return String(value.result).trim();
    if (value.text != null) return String(value.text).trim();
  }
  return String(value).trim();
}

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile("data/source/kbo-team-rosters-2026.xlsx");
const managerByTeam = new Map();
for (const sheet of workbook.worksheets) {
  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    for (let column = 1; column <= 9; column += 1) {
      const team = teamByCompactName.get(cellText(row.getCell(column)).replace(/\s+/g, ""));
      if (!team || managerByTeam.has(team.name)) continue;
      const managerName = cellText(sheet.getRow(rowNumber + 2).getCell(2)).replace(/\s+/g, "");
      if (!managerName) throw new Error(`${team.name}: 감독 이름을 찾지 못했습니다.`);
      managerByTeam.set(team.name, managerName);
    }
  }
}

const teamSeason = {
  schemaVersion: 1,
  season,
  teams: teamsDocument.teams.map((team) => ({
    teamId: team.id,
    team: team.name,
    manager: { name: managerByTeam.get(team.name) },
    playerIds: profiles
      .filter((profile) => profile.current?.season === season && profile.current.teamId === team.id)
      .map((profile) => profile.id)
      .sort((a, b) => a - b),
  })),
  sources: [{
    name: "KBO 2026 구단별 코칭스태프 및 소속선수 명단",
    url: rosterSourceUrl,
    accessedAt: "2026-09-10",
    role: "primary"
  }],
  review: { status: "verified", reviewedAt: "2026-09-10" }
};
if (teamSeason.teams.some((team) => !team.manager.name)) throw new Error("감독 이름이 비어 있는 구단이 있습니다.");
await fs.mkdir("data/relations/team-seasons", { recursive: true });
await fs.writeFile(`data/relations/team-seasons/${season}.json`, `${JSON.stringify(teamSeason, null, 2)}\n`);

const runtimePlayers = JSON.parse(await fs.readFile("data/players/index.json", "utf8"));
const playerIdByName = new Map();
for (const player of runtimePlayers) {
  for (const name of [player.name, ...(player.aliases ?? [])]) {
    const key = name.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/[\s.·_-]/g, "");
    if (!playerIdByName.has(key) || player.status === "active") playerIdByName.set(key, player.id);
  }
}
const normalizeName = (name) => name.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/[\s.·_-]/g, "");
const questionDirectory = "data/questions/kboten";
const questionFiles = (await fs.readdir(questionDirectory)).filter((file) => file.endsWith(".json") && file !== "index.json");
const awardRecords = [];
const awardSources = new Map();
for (const file of questionFiles) {
  const question = JSON.parse(await fs.readFile(`${questionDirectory}/${file}`, "utf8"));
  if (question.review?.status !== "verified" || question.eligibility?.recordType !== "award-list") continue;
  const isGoldenGlove = question.eligibility.ruleSource?.includes("골든글러브");
  const isMvp = question.title?.includes("MVP");
  if (!isGoldenGlove && !isMvp) continue;
  const fixedYear = isGoldenGlove ? Number(question.title.match(/\d{4}/)?.[0]) : null;
  for (const answer of question.answers) {
    awardRecords.push({
      awardId: isGoldenGlove ? "golden-glove" : "regular-season-mvp",
      award: isGoldenGlove ? "KBO 골든글러브" : "KBO 정규시즌 MVP",
      year: isGoldenGlove ? fixedYear : Number(answer.value),
      ...(isGoldenGlove ? { category: answer.value } : {}),
      playerId: playerIdByName.get(normalizeName(answer.name)) ?? null,
      playerName: answer.name,
      sourceQuestionId: question.id,
    });
  }
  for (const source of question.sources ?? []) awardSources.set(source.url, source);
}
awardRecords.sort((a, b) => a.year - b.year || a.awardId.localeCompare(b.awardId) || a.playerName.localeCompare(b.playerName, "ko"));
const awards = {
  schemaVersion: 1,
  records: awardRecords,
  sources: [...awardSources.values()],
  review: {
    status: "verified",
    reviewedAt: "2026-09-10",
    note: "KBO 공식 출처로 검수된 기존 문제 스냅샷에서 관계형 수상 이력을 초기 이관했다."
  }
};
await fs.mkdir("data/relations/awards", { recursive: true });
await fs.writeFile("data/relations/awards/history.json", `${JSON.stringify(awards, null, 2)}\n`);

console.log(`관계 원본 동기화: ${season} 팀 10개·선수 ${teamSeason.teams.reduce((sum, team) => sum + team.playerIds.length, 0)}명·수상 ${awardRecords.length}건`);
