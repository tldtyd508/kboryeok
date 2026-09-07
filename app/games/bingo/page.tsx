import type { Metadata } from "next";
import { DailyDateNav } from "@/components/daily-date-nav";
import { KboBingoGame } from "@/components/kbo-bingo-game";
import { SiteHeader } from "@/components/site-header";
import { resolveDailyDate } from "@/lib/daily-date";
import { getKstDateKey } from "@/lib/daily-progress";
import { getDailyKboBingoPuzzle, KBO_BINGO_LAUNCH_DATE, toPublicKboBingoPuzzle } from "@/lib/kbo-bingo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "크보 빙고 | 크보력",
  description: "등장하는 KBO 선수를 조건판에 배치해 4×4 빙고를 완성하세요.",
};

export default async function KboBingoPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const todayKey = getKstDateKey();
  const params = await searchParams;
  const requestedDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const dateKey = resolveDailyDate(requestedDate, todayKey, KBO_BINGO_LAUNCH_DATE);
  const puzzle = getDailyKboBingoPuzzle(dateKey);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-9">
        <DailyDateNav basePath="/games/bingo" dateKey={dateKey} todayKey={todayKey} launchDate={KBO_BINGO_LAUNCH_DATE} />
        <KboBingoGame key={`${puzzle.id}:r${puzzle.revision}`} puzzle={toPublicKboBingoPuzzle(puzzle)} dateKey={dateKey} isToday={dateKey === todayKey} />
      </main>
    </div>
  );
}
