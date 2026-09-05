import fs from "node:fs/promises";

const SEARCH_URL = "https://www.koreabaseball.com/ws/Controls.asmx/GetSearchPlayer";
const ORIGIN = "https://www.koreabaseball.com";
const TEAM_ID = {
  "KT 위즈": "KT",
  "삼성 라이온즈": "SS",
  "LG 트윈스": "LG",
  "KIA 타이거즈": "HT",
  "두산 베어스": "OB",
  "NC 다이노스": "NC",
  "롯데 자이언츠": "LT",
  "SSG 랜더스": "SK",
  "한화 이글스": "HH",
  "키움 히어로즈": "WO",
};

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function compact(value) {
  return String(value ?? "").replace(/\s+/g, "");
}

function birthDateHint(note) {
  const match = String(note ?? "").match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (!match) return "";
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function hand(value, kind) {
  const normalized = compact(value);
  if (kind === "throws") return normalized.startsWith("좌") ? "L" : "R";
  const batting = /(우|좌|양)타/.exec(normalized)?.[1];
  return batting === "좌" ? "L" : batting === "양" ? "S" : batting === "우" ? "R" : "";
}

async function searchPlayer(name) {
  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Referer": `${ORIGIN}/Player/Search.aspx`,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams({ name }),
  });
  if (!response.ok) throw new Error(`선수 검색 실패: ${name} (${response.status})`);
  return response.json();
}

async function getBirthDate(link) {
  const response = await fetch(new URL(link, ORIGIN), { headers: { Referer: `${ORIGIN}/Player/Search.aspx` } });
  if (!response.ok) return "";
  const html = await response.text();
  const birthday = html.match(/playerProfile_lblBirthday[^>]*>(\d{4})년\s*(\d{2})월\s*(\d{2})일</);
  return birthday ? `${birthday[1]}-${birthday[2]}-${birthday[3]}` : "";
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run));
  return results;
}

async function main() {
  const rosterPath = argument("--roster", "data/generated/roster-2026.json");
  const outputPath = argument("--output", "data/manual/player-overrides.json");
  const roster = JSON.parse(await fs.readFile(rosterPath, "utf8"));
  const document = JSON.parse(await fs.readFile(outputPath, "utf8"));
  const targets = roster.filter((player) => !player.quizEligible);

  const synced = await mapWithConcurrency(targets, 4, async (player) => {
    try {
      const data = await searchPlayer(player.name);
      const candidates = [...(data.now ?? []), ...(data.retire ?? [])]
        .filter((candidate) => compact(candidate.P_NM) === compact(player.name));
      const exactCandidates = candidates.filter((candidate) =>
        candidate.T_ID === TEAM_ID[player.team] && candidate.POS_NO === player.positionDetail);
      let match = exactCandidates.length === 1 ? exactCandidates[0] : null;
      let birthDate = "";
      const hint = birthDateHint(player.roster?.note);
      if (!match && exactCandidates.length > 1 && hint) {
        const withBirthDates = await Promise.all(exactCandidates.map(async (candidate) => ({
          candidate,
          birthDate: await getBirthDate(candidate.P_LINK),
        })));
        const selected = withBirthDates.find((candidate) => candidate.birthDate === hint);
        match = selected?.candidate ?? null;
        birthDate = selected?.birthDate ?? "";
      }
      match ??= candidates.length === 1 ? candidates[0] : null;
      if (!match?.P_LINK) return { player, reason: candidates.length ? "ambiguous" : "not-found" };
      birthDate ||= await getBirthDate(match.P_LINK);
      const jerseyNumber = Number.parseInt(match.BACK_NO, 10);
      const override = {
        id: Number(match.P_ID),
        name: player.name,
        team: player.team,
        positionGroup: player.positionGroup,
        positionDetail: player.positionDetail,
        rosterNote: player.roster?.note ?? "",
        throws: hand(match.P_TYPE, "throws"),
        bats: hand(match.P_TYPE, "bats"),
        birthDate,
        jerseyNumber: Number.isInteger(jerseyNumber) ? jerseyNumber : null,
        sourceUrl: new URL(match.P_LINK, ORIGIN).toString(),
        reviewedAt: new Date().toISOString().slice(0, 10),
      };
      const complete = override.throws && override.bats && override.birthDate && override.jerseyNumber !== null;
      return complete ? { player, override } : { player, reason: "incomplete-profile" };
    } catch (error) {
      return { player, reason: error.message };
    }
  });

  const merged = new Map((document.players ?? [])
    .filter((player) => !player.sourceUrl?.startsWith(ORIGIN))
    .map((player) => [
      `${compact(player.name)}:${player.team}:${player.positionGroup ?? ""}:${player.rosterNote ?? ""}`,
      player,
    ]));
  for (const result of synced) {
    if (!result.override) continue;
    const key = `${compact(result.override.name)}:${result.override.team}:${result.override.positionGroup}:${result.override.rosterNote}`;
    merged.set(key, result.override);
  }
  const players = Array.from(merged.values()).sort((a, b) =>
    a.team.localeCompare(b.team, "ko") || a.name.localeCompare(b.name, "ko"));
  await fs.writeFile(outputPath, `${JSON.stringify({ players }, null, 2)}\n`);

  const failures = synced.filter((result) => !result.override);
  console.log(JSON.stringify({ requested: targets.length, synced: synced.length - failures.length, failures: failures.map(({ player, reason }) => ({ name: player.name, team: player.team, reason })) }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
