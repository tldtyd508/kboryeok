import type { Metadata } from "next";
import { DailyDateNav } from "@/components/daily-date-nav";
import { Kbo5001Game } from "@/components/kbo5001-game";
import { SiteHeader } from "@/components/site-header";
import { resolveDailyDate } from "@/lib/daily-date";
import { getKstDateKey } from "@/lib/daily-progress";
import { getDailyKbo5001Puzzle, KBO5001_LAUNCH_DATE } from "@/lib/kbo5001";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "크보 5001 | 크보력",
  description: "후보 선수들의 KBO 기록을 조합해 오늘의 목표 숫자를 완성하세요.",
};

export default async function Kbo5001Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const todayKey = getKstDateKey();
  const params = await searchParams;
  const requestedDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const dateKey = resolveDailyDate(requestedDate, todayKey, KBO5001_LAUNCH_DATE);
  const puzzle = getDailyKbo5001Puzzle(dateKey);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-9">
        <DailyDateNav basePath="/games/5001" dateKey={dateKey} todayKey={todayKey} launchDate={KBO5001_LAUNCH_DATE} />
        <Kbo5001Game key={`${puzzle.id}:r${puzzle.revision}`} puzzle={puzzle} dateKey={dateKey} isToday={dateKey === todayKey} />
      </main>
    </div>
  );
}
