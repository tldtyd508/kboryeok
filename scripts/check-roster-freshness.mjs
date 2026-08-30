import fs from "node:fs/promises";
import process from "node:process";

function kstMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

const metadata = JSON.parse(await fs.readFile("data/roster-metadata.json", "utf8"));
const reviewedMonth = metadata.lastReviewedAt.slice(0, 7);
const currentMonth = kstMonth();

if (reviewedMonth !== currentMonth) {
  console.error(
    `선수 명단의 마지막 검수 월은 ${reviewedMonth}입니다. ` +
    `${currentMonth} 변동분을 data/manual/roster-deltas.json에 반영한 뒤 data:import를 실행하세요.`
  );
  process.exitCode = 1;
} else {
  console.log(`선수 명단 검수 상태 정상: ${metadata.lastReviewedAt}`);
}
