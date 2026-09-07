import { DailyDashboard } from "@/components/daily-dashboard";
import { GameLibrary } from "@/components/game-library";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
        <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">오늘의 게임</h1>
          <DailyDashboard />
        </div>
        <GameLibrary />
      </main>
    </div>
  );
}
