"use client";

import { Flame } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  getDashboardSnapshot,
  getServerDashboardSnapshot,
  subscribeToProgress,
} from "@/lib/daily-progress";

export function DailyDashboard() {
  const snapshot = useSyncExternalStore(
    subscribeToProgress,
    getDashboardSnapshot,
    getServerDashboardSnapshot,
  );
  const [, completedValue, gameCountValue, currentValue] = snapshot.split("|");
  const completedCount = Number(completedValue);
  const gameCount = Number(gameCountValue);
  const currentStreak = Number(currentValue);

  return (
    <div className="flex shrink-0 items-center gap-3 text-sm font-bold" aria-label={`오늘 ${gameCount}개 중 ${completedCount}개 완료, ${currentStreak}일 연속`}>
      <span className="tabular-nums">{completedCount}/{gameCount} 완료</span>
      <span className="h-4 w-px bg-foreground/15" />
      <span className="flex items-center gap-1 tabular-nums"><Flame className="size-4 text-[#ff6b35]" /> {currentStreak}일</span>
    </div>
  );
}
