import { CalendarDays, CircleDot, Flame, Trophy } from "lucide-react";
import { DailyDashboard } from "@/components/daily-dashboard";
import { GameLibrary } from "@/components/game-library";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        <section className="field-grid border-b border-foreground/10">
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
            <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-black tracking-[0.18em] text-primary">
                  <CircleDot className="size-4" /> KBO DAILY ARCADE
                </div>
                <h1 className="text-4xl font-black tracking-[-0.055em] sm:text-5xl">
                  오늘의 <span className="text-primary">크보력</span>
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                  오늘 열린 게임을 모두 뛰고 나만의 KBO 감각을 확인해 보세요.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-bold text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-2">
                  <CalendarDays className="size-3.5" /> 매일 자정 새 문제
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-2">
                  <Flame className="size-3.5 text-[#ff6b35]" /> 연속 기록 준비 중
                </span>
              </div>
            </div>

            <DailyDashboard />
          </div>
        </section>

        <section id="all-games" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-12 sm:px-8 sm:py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.18em] text-primary">GAME ROOM</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">전체 게임</h2>
            </div>
            <div className="hidden items-center gap-2 text-sm font-semibold text-muted-foreground sm:flex">
              <Trophy className="size-4 text-[#ff6b35]" /> 하나씩 라인업에 합류합니다
            </div>
          </div>

          <GameLibrary />
        </section>
      </main>

      <footer className="border-t border-foreground/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-black text-foreground">크보력 <span className="font-medium text-muted-foreground">KBORYEOK</span></p>
          <p>KBO 팬을 위한 데일리 야구 아케이드.</p>
        </div>
      </footer>
    </div>
  );
}
