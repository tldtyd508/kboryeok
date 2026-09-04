import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DailyPlayerGame } from "@/components/daily-player-game";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "오늘의 크보선수 | 크보력",
  description: "8번의 기회 안에 오늘의 KBO 선수를 맞혀보세요.",
};

export default function DailyPlayerPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> 게임 홈
        </Link>
        <DailyPlayerGame />
      </main>
    </div>
  );
}
