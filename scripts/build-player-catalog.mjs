import fs from "node:fs/promises";
import { toRuntimeProfile } from "./lib/player-profile-schema.mjs";

const profileDirectory = "data/players/profiles";
const outputPath = "data/players/index.json";
const profileFiles = (await fs.readdir(profileDirectory)).filter((file) => file.endsWith(".json")).sort();
const catalogById = new Map();

for (const file of profileFiles) {
  const profile = JSON.parse(await fs.readFile(`${profileDirectory}/${file}`, "utf8"));
  if (catalogById.has(profile.id)) throw new Error(`${file}: 중복 선수 ID입니다.`);
  catalogById.set(profile.id, toRuntimeProfile(profile));
}

const catalog = Array.from(catalogById.values()).sort((a, b) => a.id - b.id);
await fs.writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`공통 선수 카탈로그 생성: 개별 프로필 ${profileFiles.length}개 → 런타임 ${catalog.length}명`);
