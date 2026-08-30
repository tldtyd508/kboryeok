import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ExcelJS from "exceljs";

const ROOT = process.cwd();
const DEFAULT_SOURCE = "data/source/kbo-team-rosters-2026.xlsx";
const SOURCE_URL = "https://www.koreabaseball.com/MediaNews/Notice/View.aspx?bdSe=11831";
const SOURCE_PUBLISHED_AT = "2026-02-10";
const POSITION_MAP = new Map([
  ["투수", "P"],
  ["포수", "C"],
  ["내야수", "IF"],
  ["외야수", "OF"],
]);
const TEAM_NAMES = [
  "LG 트윈스",
  "한화 이글스",
  "SSG 랜더스",
  "삼성 라이온즈",
  "NC 다이노스",
  "KT 위즈",
  "롯데 자이언츠",
  "KIA 타이거즈",
  "두산 베어스",
  "키움 히어로즈",
];
const TEAM_BY_COMPACT_NAME = new Map(TEAM_NAMES.map((team) => [team.replace(/\s+/g, ""), team]));

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function kstDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

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

function normalizeName(value) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function splitPlayerName(rawName) {
  const compact = rawName.replace(/\s+/g, "").trim();
  const match = compact.match(/^(.*?)\((투|타|좌|우)\)$/);
  return match ? { name: match[1], qualifier: match[2] } : { name: compact, qualifier: null };
}

function parseExpectedCount(row) {
  for (const cell of row.values.slice(1)) {
    const match = String(cell ?? "").match(/선수\s*(\d+)/);
    if (match) return Number(match[1]);
  }
  return null;
}

function parseRoster(workbook) {
  const roster = [];
  const expectedByTeam = new Map();

  for (const sheet of workbook.worksheets) {
    const headers = [];
    for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      for (let column = 1; column <= 9; column += 1) {
        const value = cellText(row.getCell(column));
        const team = TEAM_BY_COMPACT_NAME.get(value.replace(/\s+/g, ""));
        if (team && !headers.some((header) => header.rowNumber === rowNumber && header.team === team)) {
          headers.push({ rowNumber, team, expected: parseExpectedCount(row) });
        }
      }
    }

    headers.forEach((header, headerIndex) => {
      const endRow = (headers[headerIndex + 1]?.rowNumber ?? sheet.rowCount + 1) - 1;
      [1, 4, 7].forEach((startColumn) => {
        const markers = [];
        for (let rowNumber = header.rowNumber + 2; rowNumber <= endRow; rowNumber += 1) {
          const value = cellText(sheet.getRow(rowNumber).getCell(startColumn));
          if (POSITION_MAP.has(value) || value === "감독" || value === "코치") {
            markers.push({ rowNumber, value });
          }
        }

        for (let rowNumber = header.rowNumber + 2; rowNumber <= endRow; rowNumber += 1) {
          const row = sheet.getRow(rowNumber);
          const rawName = cellText(row.getCell(startColumn + 1));
          const note = cellText(row.getCell(startColumn + 2));

          if (!rawName || rawName === "성명") continue;
          if (
            startColumn === 1 &&
            rowNumber === header.rowNumber + 2 &&
            cellText(sheet.getRow(rowNumber + 1).getCell(1)) === "코치"
          ) continue;
          const previousMarkers = markers.filter((marker) => marker.rowNumber <= rowNumber);
          const firstMarker = markers[0];
          const section = previousMarkers.at(-1)?.value ??
            (firstMarker?.value && firstMarker.value !== "투수" ? "투수" : null);
          if (!POSITION_MAP.has(section)) continue;

          const { name, qualifier } = splitPlayerName(rawName);
          roster.push({
            name,
            nameNorm: normalizeName(name),
            qualifier,
            team: header.team,
            positionGroup: POSITION_MAP.get(section),
            positionDetail: section,
            note,
            rookie: note.includes("신인"),
            foreign: note.includes("외국인"),
            asiaQuota: note.includes("아시아쿼터"),
          });
        }
      });

      expectedByTeam.set(header.team, header.expected);
    });
  }

  for (const team of TEAM_NAMES) {
    const actual = roster.filter((player) => player.team === team).length;
    const expected = expectedByTeam.get(team);
    if (actual !== expected) {
      throw new Error(`${team}: XLSX 표기 ${expected}명과 파싱 결과 ${actual}명이 다릅니다.`);
    }
  }

  return roster;
}

function applyDeltas(roster, deltaDocument) {
  let result = [...roster];
  for (const change of deltaDocument.changes ?? []) {
    const matches = (player) =>
      player.team === change.team &&
      player.nameNorm === normalizeName(change.name) &&
      (!change.positionGroup || player.positionGroup === change.positionGroup);

    if (change.op === "remove") {
      result = result.filter((player) => !matches(player));
      continue;
    }
    if (change.op === "upsert") {
      result = result.filter((player) => !matches(player));
      result.push({
        name: change.name.replace(/\s+/g, ""),
        nameNorm: normalizeName(change.name),
        qualifier: change.qualifier ?? null,
        team: change.team,
        positionGroup: change.positionGroup,
        positionDetail: change.positionDetail,
        note: change.note ?? "월간 변동분",
        rookie: Boolean(change.rookie),
        foreign: Boolean(change.foreign),
        asiaQuota: Boolean(change.asiaQuota),
        deltaSourceUrl: change.sourceUrl,
      });
      continue;
    }
    throw new Error(`지원하지 않는 roster delta 작업: ${change.op}`);
  }
  return result;
}

function chooseLegacyPlayer(rosterPlayer, candidates, allowTeamChange) {
  const samePosition = candidates.filter((player) => player.positionGroup === rosterPlayer.positionGroup);
  const exactTeam = samePosition.filter((player) => player.team === rosterPlayer.team);
  const qualifierHand = rosterPlayer.qualifier === "좌" ? "L" : rosterPlayer.qualifier === "우" ? "R" : null;
  const qualified = qualifierHand ? exactTeam.filter((player) => player.throws === qualifierHand) : exactTeam;

  if (qualified.length === 1) return { player: qualified[0], teamChanged: false };
  if (exactTeam.length === 1) return { player: exactTeam[0], teamChanged: false };
  if (allowTeamChange && samePosition.length === 1) return { player: samePosition[0], teamChanged: true };
  return { player: null, teamChanged: false };
}

function stableId(seed, usedIds) {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  let id = 900_000_000 + ((hash >>> 0) % 90_000_000);
  while (usedIds.has(id)) id += 1;
  usedIds.add(id);
  return id;
}

function applyOverride(player, overrides) {
  const override = (overrides.players ?? []).find((candidate) => {
    if (candidate.id && candidate.id === player.id) return true;
    return candidate.name && normalizeName(candidate.name) === player.nameNorm &&
      (!candidate.team || candidate.team === player.team) &&
      (!candidate.positionGroup || candidate.positionGroup === player.positionGroup);
  });
  return override ? { ...player, ...override, id: player.id, nameNorm: player.nameNorm } : player;
}

function isComplete(player) {
  return Boolean(
    player.name && player.team && player.positionGroup && player.positionDetail &&
    player.throws && player.bats && /^\d{4}-\d{2}-\d{2}$/.test(player.birthDate) &&
    Number.isInteger(player.jerseyNumber) && player.jerseyNumber >= 0
  );
}

function deterministicIndex(dateKey, length) {
  let hash = 0;
  for (const char of dateKey) hash = Math.imul(31, hash) + char.charCodeAt(0) | 0;
  return Math.abs(hash) % length;
}

function buildDailyPuzzles(players, existingPuzzles) {
  const ids = players.map((player) => player.id).sort((a, b) => a - b);
  const eligibleIds = new Set(ids);
  const puzzles = {};
  const start = new Date("2025-08-28T00:00:00Z");
  const end = new Date("2027-12-31T00:00:00Z");
  let previousId = null;

  for (let date = start; date <= end; date = new Date(date.getTime() + 86_400_000)) {
    const key = date.toISOString().slice(0, 10);
    let id = existingPuzzles[key];
    if (!eligibleIds.has(id)) id = ids[deterministicIndex(key, ids.length)];
    if (id === previousId && ids.length > 1) id = ids[(ids.indexOf(id) + 1) % ids.length];
    puzzles[key] = id;
    previousId = id;
  }
  return puzzles;
}

async function readJson(relativePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, relativePath), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function main() {
  const sourceArg = argument("--source", DEFAULT_SOURCE);
  const reviewedAt = argument("--reviewed-at", kstDate());
  const season = Number(argument("--season", "2026"));
  const sourcePath = path.resolve(ROOT, sourceArg);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(sourcePath);
  const baseRoster = parseRoster(workbook);
  const deltas = await readJson("data/manual/roster-deltas.json", { changes: [] });
  const overrides = await readJson("data/manual/player-overrides.json", { players: [] });
  const legacyPlayers = await readJson("public/players_2025.json", []);
  const existingPuzzles = await readJson("public/daily_puzzles.json", {});
  const roster = applyDeltas(baseRoster, deltas);

  const legacyByName = new Map();
  for (const player of legacyPlayers) {
    const key = normalizeName(player.name);
    legacyByName.set(key, [...(legacyByName.get(key) ?? []), player]);
  }

  const usedIds = new Set(legacyPlayers.map((player) => player.id));
  const matchedLegacyIds = new Set();
  const rosterIdentityCounts = new Map();
  for (const player of roster) {
    const key = `${player.nameNorm}:${player.positionGroup}`;
    rosterIdentityCounts.set(key, (rosterIdentityCounts.get(key) ?? 0) + 1);
  }
  const generatedRoster = roster.map((rosterPlayer) => {
    const availableCandidates = (legacyByName.get(rosterPlayer.nameNorm) ?? [])
      .filter((player) => !matchedLegacyIds.has(player.id));
    const identityKey = `${rosterPlayer.nameNorm}:${rosterPlayer.positionGroup}`;
    const match = chooseLegacyPlayer(
      rosterPlayer,
      availableCandidates,
      rosterIdentityCounts.get(identityKey) === 1,
    );
    if (match.player) matchedLegacyIds.add(match.player.id);
    const base = match.player ? {
      ...match.player,
      aliases: match.player.aliases ?? [],
      team: rosterPlayer.team,
      positionGroup: rosterPlayer.positionGroup,
      positionDetail: rosterPlayer.positionDetail,
    } : {
      id: stableId(`${rosterPlayer.nameNorm}:${rosterPlayer.positionGroup}:${rosterPlayer.team}`, usedIds),
      name: rosterPlayer.name,
      nameNorm: rosterPlayer.nameNorm,
      aliases: [],
      team: rosterPlayer.team,
      positionGroup: rosterPlayer.positionGroup,
      positionDetail: rosterPlayer.positionDetail,
      throws: "",
      bats: "",
      birthDate: "",
      nationality: rosterPlayer.foreign || rosterPlayer.asiaQuota ? "" : "KR",
      jerseyNumber: null,
    };

    const overridden = applyOverride(base, overrides);
    const needsEnrichment = [];
    if (!overridden.birthDate) needsEnrichment.push("birthDate");
    if (!overridden.throws) needsEnrichment.push("throws");
    if (!overridden.bats) needsEnrichment.push("bats");
    if (!Number.isInteger(overridden.jerseyNumber)) needsEnrichment.push("jerseyNumber");
    if (match.teamChanged && !overrides.players?.some((item) => item.id === overridden.id)) {
      needsEnrichment.push("teamChangeVerification");
    }

    return {
      ...overridden,
      active: true,
      quizEligible: needsEnrichment.length === 0 && isComplete(overridden),
      roster: {
        season,
        qualifier: rosterPlayer.qualifier,
        note: rosterPlayer.note,
        rookie: rosterPlayer.rookie,
        foreign: rosterPlayer.foreign,
        asiaQuota: rosterPlayer.asiaQuota,
      },
      needsEnrichment,
      source: {
        base: "kbo-official-roster-xlsx",
        sourceUrl: rosterPlayer.deltaSourceUrl ?? SOURCE_URL,
        publishedAt: SOURCE_PUBLISHED_AT,
        reviewedAt,
      },
    };
  });

  const duplicateIds = generatedRoster.filter((player, index, all) =>
    all.findIndex((candidate) => candidate.id === player.id) !== index
  );
  if (duplicateIds.length) {
    throw new Error(`중복 선수 ID가 ${duplicateIds.length}건 있습니다: ${duplicateIds.map((player) => `${player.id}/${player.team}/${player.name}`).join(", ")}`);
  }

  const publicPlayers = generatedRoster
    .filter((player) => player.quizEligible)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  if (!publicPlayers.length) throw new Error("퀴즈 출제 가능한 선수가 없습니다.");

  const dailyPuzzles = buildDailyPuzzles(publicPlayers, existingPuzzles);
  const byTeam = Object.fromEntries(TEAM_NAMES.map((team) => [
    team,
    generatedRoster.filter((player) => player.team === team).length,
  ]));
  const metadata = {
    schemaVersion: 1,
    season,
    source: {
      title: "2026년 구단별 코칭스탭 및 소속선수 명단",
      sourceUrl: SOURCE_URL,
      publishedAt: SOURCE_PUBLISHED_AT,
      localFile: path.relative(ROOT, sourcePath),
      redistribution: "internal-source-only",
    },
    lastReviewedAt: reviewedAt,
    rosterCount: generatedRoster.length,
    quizEligibleCount: publicPlayers.length,
    needsEnrichmentCount: generatedRoster.length - publicPlayers.length,
    teamCounts: byTeam,
  };

  await fs.mkdir(path.join(ROOT, "data/generated"), { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(ROOT, `data/generated/roster-${season}.json`), `${JSON.stringify(generatedRoster, null, 2)}\n`),
    fs.writeFile(path.join(ROOT, "data/roster-metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`),
    fs.writeFile(path.join(ROOT, "public/players.json"), `${JSON.stringify(publicPlayers, null, 2)}\n`),
    fs.writeFile(path.join(ROOT, "public/daily_puzzles.json"), `${JSON.stringify(dailyPuzzles, null, 2)}\n`),
  ]);

  console.log(JSON.stringify(metadata, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
