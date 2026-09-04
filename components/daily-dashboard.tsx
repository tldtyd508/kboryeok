"use client";

import Link from "next/link";
import { ArrowRight, Check, CircleDot, Clock3, Flame, Trophy } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  getDashboardSnapshot,
  getServerDashboardSnapshot,
  subscribeToProgress,
  type DailyPlayerProgress,
} from "@/lib/daily-progress";

const progressLabels: Record<DailyPlayerProgress, string> = {
  "not-started": "아직 시작 전",
  playing: "도전 중",
  completed: "오늘 경기 완료",
};

export function DailyDashboard() {
  const snapshot = useSyncExternalStore(
    subscribeToProgress,
    getDashboardSnapshot,
    getServerDashboardSnapshot,
  );
  const [progressValue, completedValue, gameCountValue, currentValue, bestValue, totalValue] = snapshot.split("|");
  const progress = progressValue as DailyPlayerProgress;
  const completedCount = Number(completedValue);
  const gameCount = Number(gameCountValue);
  const currentStreak = Number(currentValue);
  const bestStreak = Number(bestValue);
  const totalDays = Number(totalValue);

  const completed = progress === "completed";

  return (
    <div className="grid overflow-hidden rounded-[1.75rem] border-2 border-foreground bg-card shadow-[8px_8px_0_hsl(var(--foreground))] lg:grid-cols-[0.72fr_1.28fr]">
      <div className="flex flex-col justify-between border-b border-foreground/15 p-6 lg:border-b-0 lg:border-r lg:p-8">
        <div>
          <p className="text-xs font-black tracking-[0.16em] text-muted-foreground">TODAY&apos;S SCORECARD</p>
          <div className="mt-5 flex items-end gap-2">
            <span className="text-5xl font-black tabular-nums">{completedCount}</span>
            <span className="pb-1.5 text-lg font-bold text-muted-foreground">/ {gameCount} 완료</span>
          </div>
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[#ff6b35] transition-[width]" style={{ width: `${(completedCount / gameCount) * 100}%` }} />
          </div>
        </div>
        <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          {completed ? <Check className="size-4 text-emerald-600" /> : <Clock3 className="size-4" />}
          {progressLabels[progress]}
        </p>
        <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-foreground/10 pt-5 text-center">
          <div>
            <dt className="flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground"><Flame className="size-3 text-[#ff6b35]" /> 연속</dt>
            <dd className="mt-1 text-lg font-black tabular-nums">{currentStreak}일</dd>
          </div>
          <div>
            <dt className="flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground"><Trophy className="size-3" /> 최고</dt>
            <dd className="mt-1 text-lg font-black tabular-nums">{bestStreak}일</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold text-muted-foreground">총 출석</dt>
            <dd className="mt-1 text-lg font-black tabular-nums">{totalDays}일</dd>
          </div>
        </dl>
      </div>

      <Link href="/games/player" className="group relative flex min-h-64 flex-col justify-between overflow-hidden bg-primary p-6 text-primary-foreground sm:p-8">
        <div className="absolute -right-10 -top-16 size-56 rounded-full border-[36px] border-white/10" />
        <div className="relative flex items-start justify-between gap-5">
          <div>
            <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black">오늘의 1번 타자</span>
            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">오늘의 크보선수</h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-white/75 sm:text-base">
              8번의 기회 안에 팀, 포지션, 나이와 등번호를 비교해 오늘의 선수를 맞혀보세요.
            </p>
          </div>
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15">
            <CircleDot className="size-7" />
          </span>
        </div>

        <div className="relative mt-8 flex items-center justify-between border-t border-white/20 pt-5">
          <span className="text-xs font-bold text-white/70">데일리 · 약 3분</span>
          <span className="flex items-center gap-1 text-sm font-black">
            {progress === "playing" ? "이어서 하기" : completed ? "다시 보기" : "게임 시작"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </div>
  );
}
