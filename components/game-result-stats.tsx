"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getGameStatsSnapshot,
  getServerGameStatsSnapshot,
  subscribeToProgress,
  type DailyGameId,
  type GameStatsSummary,
} from "@/lib/daily-progress";

export function GameResultStats({
  gameId,
  dateKey,
  averageLabel,
}: {
  gameId: DailyGameId;
  dateKey: string;
  averageLabel: string;
}) {
  const snapshot = useSyncExternalStore(
    subscribeToProgress,
    () => getGameStatsSnapshot(gameId, dateKey),
    getServerGameStatsSnapshot,
  );
  const stats = useMemo(() => JSON.parse(snapshot) as GameStatsSummary, [snapshot]);

  return (
    <div className="mt-5">
      <div className="grid grid-cols-4 divide-x divide-foreground/10 rounded-2xl bg-muted py-4 text-center text-foreground">
        <Stat label="플레이" value={stats.played} />
        <Stat label="승률" value={`${stats.winRate}%`} />
        <Stat label="연속" value={stats.currentStreak} accent />
        <Stat label="최고" value={stats.bestStreak} />
      </div>
      {stats.averageWinningScore !== null ? (
        <p className="mt-2 text-center text-xs font-bold text-muted-foreground">
          성공한 게임 평균 {averageLabel} {formatAverage(stats.averageWinningScore)}
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="px-1">
      <p className="text-[10px] font-bold text-muted-foreground sm:text-xs">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums sm:text-2xl ${accent ? "text-[#f05b32]" : ""}`}>{value}</p>
    </div>
  );
}

function formatAverage(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
