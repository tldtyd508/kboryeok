import type { Metadata } from "next";
import { DailyDateNav } from "@/components/daily-date-nav";
import { DailyPlayerGame } from "@/components/daily-player-game";
import { SiteHeader } from "@/components/site-header";
import { resolveDailyDate } from "@/lib/daily-date";
import { getKstDateKey } from "@/lib/daily-progress";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "오늘의 크보선수 | 크보력",
  description: "8번의 기회 안에 오늘의 KBO 선수를 맞혀보세요.",
};

export default async function DailyPlayerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const todayKey = getKstDateKey();
  const params = await searchParams;
  const requestedDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const dateKey = resolveDailyDate(requestedDate, todayKey);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-9">
        <DailyDateNav basePath="/games/player" dateKey={dateKey} todayKey={todayKey} />
        <DailyPlayerGame dateKey={dateKey} />
      </main>
    </div>
  );
}
