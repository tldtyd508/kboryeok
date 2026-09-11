import fs from "node:fs/promises";
import { TEAM_IDS, toCanonicalProfile, unique } from "./lib/player-profile-schema.mjs";

const profileDirectory = "data/players/profiles";
const activePlayers = JSON.parse(await fs.readFile("data/generated/roster-2026.json", "utf8"));
const historicalHitters = JSON.parse(await fs.readFile("data/player-index/historical.json", "utf8"));
const historicalPitchers = JSON.parse(await fs.readFile("data/player-index/historical-pitchers.json", "utf8"));
const existingFiles = (await fs.readdir(profileDirectory)).filter((file) => file.endsWith(".json"));
const existingById = new Map();
const valueOrNull = (...values) => values.find((value) => value !== null && value !== undefined && value !== "") ?? null;

for (const file of existingFiles) {
  const value = JSON.parse(await fs.readFile(`${profileDirectory}/${file}`, "utf8"));
  existingById.set(value.id, toCanonicalProfile(value));
}

const baseById = new Map();
for (const player of historicalHitters.players) {
  baseById.set(player.id, {
    id: player.id, name: player.name, aliases: player.aliases ?? [], status: "retired",
    positionGroup: null, positionDetail: null, throws: null, bats: null, birthYear: null,
    profileUrl: player.profileUrl,
  });
}
for (const player of historicalPitchers.players) {
  const existing = baseById.get(player.id);
  baseById.set(player.id, {
    ...existing, ...player,
    aliases: unique([...(existing?.aliases ?? []), ...(player.aliases ?? [])]),
    status: "retired", positionGroup: "P", positionDetail: existing?.positionDetail ?? "투수",
  });
}
for (const player of activePlayers) {
  const existing = baseById.get(player.id);
  baseById.set(player.id, {
    ...existing, ...player,
    aliases: unique([...(existing?.aliases ?? []), ...(player.aliases ?? [])]),
    status: "active",
    birthYear: /^\d{4}-/.test(player.birthDate ?? "") ? Number.parseInt(player.birthDate.slice(0, 4), 10) : null,
    profileUrl: null,
  });
}
for (const previous of existingById.values()) {
  if (baseById.has(previous.id)) continue;
  baseById.set(previous.id, {
    id: previous.id,
    name: previous.name,
    aliases: previous.aliases,
    status: previous.status === "active" ? "inactive" : previous.status,
    positionGroup: previous.bio.positionGroup,
    positionDetail: previous.bio.positionDetail,
    throws: previous.bio.throws,
    bats: previous.bio.bats,
    birthYear: previous.bio.birthYear,
    profileUrl: previous.sources.find((source) => source.role === "primary")?.url,
  });
}

for (const base of baseById.values()) {
  const previous = existingById.get(base.id);
  const isActive = base.status === "active";
  const current = isActive ? {
    season: base.roster?.season ?? 2026,
    teamId: TEAM_IDS.get(base.team) ?? null,
    team: base.team,
    jerseyNumber: base.jerseyNumber,
  } : null;
  const currentStint = current ? { teamId: current.teamId, team: current.team, from: current.season, to: current.season } : null;
  const teamStints = unique([
    ...(previous?.career?.teamStints ?? []).map((stint) => JSON.stringify(stint)),
    ...(currentStint ? [JSON.stringify(currentStint)] : []),
  ]).map((stint) => JSON.parse(stint));
  const primarySource = isActive
    ? { name: "KBO 등록 선수 명단", url: base.source.sourceUrl, role: "primary" }
    : { name: "KBO 선수 기록", url: base.profileUrl, role: "primary" };
  const sources = Array.from(new Map([primarySource, ...(previous?.sources ?? [])].map((source) => [source.url, source])).values());
  const bio = {
    birthYear: valueOrNull(previous?.bio?.birthYear, base.birthYear),
    throws: valueOrNull(previous?.bio?.throws, base.throws),
    bats: valueOrNull(previous?.bio?.bats, base.bats),
    positionGroup: valueOrNull(previous?.bio?.positionGroup, base.positionGroup),
    positionDetail: valueOrNull(previous?.bio?.positionDetail, base.positionDetail),
  };
  const jerseyNumbers = unique([
    ...(previous?.career?.jerseyNumbers ?? []),
    ...(Number.isInteger(current?.jerseyNumber) ? [current.jerseyNumber] : []),
  ]).sort((a, b) => a - b);
  const complete = Boolean(
    bio.birthYear && bio.throws && bio.bats && bio.positionGroup
    && (!isActive || (current?.teamId && Number.isInteger(current.jerseyNumber))),
  );
  const profile = {
    schemaVersion: 1,
    id: base.id,
    name: base.name,
    aliases: unique([...(base.aliases ?? []), ...(previous?.aliases ?? [])]),
    status: base.status,
    bio,
    current,
    career: {
      debutYear: previous?.career?.debutYear ?? null,
      retirementYear: previous?.career?.retirementYear ?? null,
      jerseyNumbers,
      ...(previous?.career?.jerseyNumberHistory ? { jerseyNumberHistory: previous.career.jerseyNumberHistory } : {}),
      ...(previous?.career?.jerseyNumberSources ? { jerseyNumberSources: previous.career.jerseyNumberSources } : {}),
      teamStints,
    },
    sources,
    review: {
      status: previous?.review?.status === "verified" ? "verified" : "generated",
      reviewedAt: previous?.review?.reviewedAt ?? base.source?.reviewedAt ?? null,
      completeness: complete ? "game-ready" : "index-only",
      ...(previous?.review?.note ? { note: previous.review.note } : {}),
    },
  };
  await fs.writeFile(`${profileDirectory}/${profile.id}.json`, `${JSON.stringify(profile, null, 2)}\n`);
}

console.log(`개별 선수 프로필 동기화: ${baseById.size}명 (${activePlayers.length}명 현역)`);
