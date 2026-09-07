import type { Metadata } from "next";
import { DailyDateNav } from "@/components/daily-date-nav";
import { KboTenGame } from "@/components/kboten-game";
import { SiteHeader } from "@/components/site-header";
import { resolveDailyDate } from "@/lib/daily-date";
import { getKstDateKey } from "@/lib/daily-progress";
import { getDailyKboTenPuzzle, getKboTenPlayerOptions, toPublicKboTenPuzzle } from "@/lib/kboten";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "크보텐 | 크보력",
  description: "주어진 KBO 기록의 상위 10명을 찾아보세요.",
};

export default async function KboTenPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const todayKey = getKstDateKey();
  const params = await searchParams;
  const requestedDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const dateKey = resolveDailyDate(requestedDate, todayKey);
  const puzzleData = getDailyKboTenPuzzle(dateKey);
  const playerOptions = getKboTenPlayerOptions(puzzleData);
  const puzzle = toPublicKboTenPuzzle(puzzleData);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-9">
        <DailyDateNav basePath="/games/kboten" dateKey={dateKey} todayKey={todayKey} />
        <KboTenGame key={`${puzzle.id}:r${puzzle.revision}`} puzzle={puzzle} playerOptions={playerOptions} dateKey={dateKey} isToday={dateKey === todayKey} />
      </main>
    </div>
  );
}
