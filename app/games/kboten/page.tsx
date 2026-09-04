import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { KboTenGame } from "@/components/kboten-game";
import { SiteHeader } from "@/components/site-header";
import { getKstDateKey } from "@/lib/daily-progress";
import { getDailyKboTenPuzzle } from "@/lib/kboten";

export const metadata: Metadata = {
  title: "크보텐 | 크보력",
  description: "주어진 KBO 기록의 상위 10명을 찾아보세요.",
};

export default function KboTenPage() {
  const puzzle = getDailyKboTenPuzzle(getKstDateKey());
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" /> 게임 홈</Link>
        <KboTenGame puzzle={puzzle} />
      </main>
    </div>
  );
}
