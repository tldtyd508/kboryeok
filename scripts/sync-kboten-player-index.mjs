import fs from "node:fs/promises";

const ORIGIN = "https://www.koreabaseball.com";
const PAGE_TARGET_PREFIX = "ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ucPager$";
const INDEXES = [
  {
    path: "/Record/Player/HitterBasic/BasicTotal.aspx",
    output: "data/player-index/historical.json",
    playerLink: /<a href="(\/Record\/(?:Retire\/Hitter|Player\/HitterDetail\/Basic)\.aspx\?playerId=(\d+))">([^<]+)<\/a>/gi,
  },
  {
    path: "/Record/Player/PitcherBasic/BasicTotal.aspx",
    output: "data/player-index/historical-pitchers.json",
    playerLink: /<a href="(\/Record\/(?:Retire\/Pitcher|Player\/PitcherDetail\/Basic)\.aspx\?playerId=(\d+))">([^<]+)<\/a>/gi,
  },
];

function decodeAttribute(value) {
  return value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'");
}

function attributes(tag) {
  return Object.fromEntries(Array.from(tag.matchAll(/([\w$:-]+)="([^"]*)"/g), (match) => [match[1], decodeAttribute(match[2])]));
}

function formState(html) {
  const state = {};
  for (const match of html.matchAll(/<input\b[^>]*>/gi)) {
    const input = attributes(match[0]);
    if (input.type === "hidden" && input.name) state[input.name] = input.value ?? "";
  }
  return state;
}

function currentPage(html) {
  return Number(html.match(/id="cphContents_cphContents_cphContents_hfPage" value="(\d+)"/)?.[1] ?? 1);
}

function pagePlayers(html, pattern) {
  return Array.from(html.matchAll(pattern), (match) => ({
    id: Number(match[2]),
    name: match[3].replace(/^\*\s*/, "").trim(),
    status: match[1].includes("/Retire/") ? "retired" : "active",
    profileUrl: new URL(match[1], ORIGIN).toString(),
  }));
}

async function fetchPage(path, html, eventTarget) {
  const body = new URLSearchParams({
    ...formState(html),
    __EVENTTARGET: eventTarget,
    __EVENTARGUMENT: "",
  });
  const response = await fetch(new URL(path, ORIGIN), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: new URL(path, ORIGIN).toString(),
    },
    body,
  });
  if (!response.ok) throw new Error(`${path} 페이지 이동 실패 (${response.status})`);
  return response.text();
}

async function syncIndex(config) {
  const initial = await fetch(new URL(config.path, ORIGIN));
  if (!initial.ok) throw new Error(`${config.path} 조회 실패 (${initial.status})`);
  let html = await initial.text();
  const players = new Map();
  let previousPage = 0;

  for (let guard = 0; guard < 20; guard += 1) {
    const page = currentPage(html);
    if (page <= previousPage) break;
    previousPage = page;
    for (const player of pagePlayers(html, config.playerLink)) players.set(player.id, player);

    const numberedTarget = `${PAGE_TARGET_PREFIX}btnNo${page + 1}`;
    const nextTarget = `${PAGE_TARGET_PREFIX}btnNext`;
    const eventTarget = html.includes(numberedTarget) ? numberedTarget : html.includes(nextTarget) ? nextTarget : null;
    if (!eventTarget) break;
    html = await fetchPage(config.path, html, eventTarget);
  }

  const previous = JSON.parse(await fs.readFile(config.output, "utf8"));
  const aliases = new Map(previous.players.map((player) => [player.name, player.aliases ?? []]));
  const output = {
    reviewedAt: new Date().toISOString().slice(0, 10),
    sourceUrl: new URL(config.path, ORIGIN).toString(),
    selectionPolicy: "KBO 공식 통산 기록실의 해당 최소 규정 충족 선수 전체",
    players: Array.from(players.values()).map((player) => ({ ...player, aliases: aliases.get(player.name) ?? [] })),
  };
  await fs.writeFile(config.output, `${JSON.stringify(output, null, 2)}\n`);
  return { output: config.output, pages: previousPage, players: players.size };
}

const results = [];
for (const config of INDEXES) results.push(await syncIndex(config));
console.log(JSON.stringify(results, null, 2));
