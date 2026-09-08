import fs from "node:fs/promises";

const profileDirectory = "data/players/profiles";
const outputPath = "data/players/index.json";
const activePlayers = JSON.parse(await fs.readFile("public/players.json", "utf8"));
const historicalHitters = JSON.parse(await fs.readFile("data/player-index/historical.json", "utf8"));
const historicalPitchers = JSON.parse(await fs.readFile("data/player-index/historical-pitchers.json", "utf8"));
const catalogById = new Map();

for (const player of historicalHitters.players) {
  catalogById.set(player.id, {
    id: player.id,
    name: player.name,
    aliases: player.aliases ?? [],
    status: player.status,
    positionGroup: null,
    throws: null,
    bats: null,
    birthYear: null,
    current: null,
    career: { jerseyNumbers: [] },
    sources: [{ name: "KBO 선수 기록", url: player.profileUrl, role: "primary" }],
  });
}

for (const player of historicalPitchers.players) {
  const existing = catalogById.get(player.id);
  catalogById.set(player.id, {
    ...existing,
    id: player.id,
    name: player.name,
    aliases: Array.from(new Set([...(existing?.aliases ?? []), ...(player.aliases ?? [])])),
    status: player.status,
    positionGroup: "P",
    current: null,
    career: existing?.career ?? { jerseyNumbers: [] },
    sources: [{ name: "KBO 선수 기록", url: player.profileUrl, role: "primary" }],
  });
}

for (const player of activePlayers) {
  const existing = catalogById.get(player.id);
  catalogById.set(player.id, {
    ...existing,
    id: player.id,
    name: player.name,
    aliases: Array.from(new Set([...(existing?.aliases ?? []), ...(player.aliases ?? [])])),
    status: "active",
    positionGroup: player.positionGroup,
    positionDetail: player.positionDetail,
    throws: player.throws,
    bats: player.bats,
    birthYear: Number.parseInt(player.birthDate.slice(0, 4), 10),
    current: { team: player.team, jerseyNumber: player.jerseyNumber },
    career: { jerseyNumbers: [player.jerseyNumber] },
    sources: [{ name: "KBO 등록 선수 명단", url: player.source.sourceUrl, role: "primary" }],
  });
}

const profileFiles = (await fs.readdir(profileDirectory)).filter((file) => file.endsWith(".json")).sort();
for (const file of profileFiles) {
  const profile = JSON.parse(await fs.readFile(`${profileDirectory}/${file}`, "utf8"));
  const existing = catalogById.get(profile.id);
  if (!existing) throw new Error(`${file}: 기본 선수 인덱스에 없는 선수 ID입니다.`);
  catalogById.set(profile.id, {
    ...existing,
    ...profile,
    aliases: Array.from(new Set([...(existing?.aliases ?? []), ...(profile.aliases ?? [])])),
    career: { ...(existing?.career ?? {}), ...(profile.career ?? {}) },
    sources: profile.sources ?? existing?.sources ?? [],
  });
}

const catalog = Array.from(catalogById.values()).sort((a, b) => a.id - b.id);
await fs.writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`공통 선수 카탈로그 생성: ${catalog.length}명 · 개별 이력 프로필 ${profileFiles.length}개`);
