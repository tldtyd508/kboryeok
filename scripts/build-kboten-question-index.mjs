import fs from "node:fs/promises";

const directory = "data/questions/kboten";
const outputPath = `${directory}/index.json`;
const files = (await fs.readdir(directory))
  .filter((file) => file.endsWith(".json") && file !== "index.json")
  .sort();
const puzzles = await Promise.all(files.map(async (file) =>
  JSON.parse(await fs.readFile(`${directory}/${file}`, "utf8"))));

const duplicateDates = puzzles.filter((puzzle, index) =>
  puzzles.findIndex((candidate) => candidate.publishDate === puzzle.publishDate) !== index);
if (duplicateDates.length) {
  throw new Error(`중복 공개일: ${duplicateDates.map((puzzle) => puzzle.publishDate).join(", ")}`);
}

const verifiedPuzzles = puzzles
  .filter((puzzle) => puzzle.review?.status === "verified")
  .sort((a, b) => a.publishDate.localeCompare(b.publishDate));
const draftCount = puzzles.length - verifiedPuzzles.length;

await fs.writeFile(outputPath, `${JSON.stringify(verifiedPuzzles, null, 2)}\n`);
console.log(
  `크보텐 날짜 인덱스 생성: 검증 완료 ${verifiedPuzzles.length}개` +
    (draftCount ? `, 초안 제외 ${draftCount}개` : ""),
);
