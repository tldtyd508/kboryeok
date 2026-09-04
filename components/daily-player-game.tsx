"use client";

import { useEffect } from "react";
import { ArrowDown, ArrowUp, Check, HelpCircle, Loader2 } from "lucide-react";
import GameOverDialog from "@/components/GameOverDialog";
import PlayerSearch from "@/components/PlayerSearch";
import ResultBoard from "@/components/ResultBoard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getDailyPlayerStorageKey } from "@/lib/daily-progress";
import { useGameStore } from "@/lib/store";

export function DailyPlayerGame() {
  const { isDataLoading, error, actions, guesses, gameStatus } = useGameStore();

  useEffect(() => {
    actions.fetchDataAndStartGame();
  }, [actions]);

  useEffect(() => {
    if (guesses.length === 0) return;
    window.localStorage.setItem(
      getDailyPlayerStorageKey(),
      gameStatus === "playing" ? "playing" : "completed",
    );
  }, [gameStatus, guesses.length]);

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#ff6b35]">
            <span className="size-2 animate-pulse rounded-full bg-[#ff6b35]" /> 오늘의 게임
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">오늘의 크보선수</h1>
          <p className="mt-2 text-muted-foreground">선수를 입력하고 힌트를 비교해 정답을 찾아보세요.</p>
        </div>
        <div className="rounded-2xl border border-foreground/10 bg-card px-5 py-3 text-center">
          <p className="text-xs font-bold text-muted-foreground">남은 기회</p>
          <p className="text-2xl font-black tabular-nums">{8 - guesses.length}<span className="ml-1 text-sm text-muted-foreground">/ 8</span></p>
        </div>
      </div>

      <div className="rounded-[2rem] border-2 border-foreground/10 bg-card p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
        {isDataLoading ? (
          <div className="flex min-h-52 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-primary" />
            <p className="ml-3 font-semibold">선수 명단을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl bg-destructive/10 p-8 text-center">
            <p className="mb-4 text-destructive">오류: {error}</p>
            <Button onClick={actions.fetchDataAndStartGame}>다시 시도</Button>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-2">
              <div className="w-full max-w-md"><PlayerSearch /></div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="게임 방법 보기"><HelpCircle className="size-4" /></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>오늘의 크보선수 게임 방법</DialogTitle>
                    <DialogDescription>8번 안에 오늘의 선수를 맞혀보세요.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm leading-6">
                    <p>선수를 입력하면 정답과 비교한 팀, 포지션, 투타 유형, 나이와 등번호 힌트가 표시됩니다.</p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2"><Check className="size-4 text-emerald-600" /> 초록색은 정답과 일치합니다.</li>
                      <li className="flex items-center gap-2"><ArrowUp className="size-4 text-sky-600" /> 위 화살표는 정답의 숫자가 더 큽니다.</li>
                      <li className="flex items-center gap-2"><ArrowDown className="size-4 text-violet-600" /> 아래 화살표는 정답의 숫자가 더 작습니다.</li>
                    </ul>
                    <p className="rounded-xl bg-muted p-3 text-muted-foreground">모든 날짜의 정답은 한국 시간 기준으로 동일합니다.</p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <ResultBoard />
          </>
        )}
      </div>

      <GameOverDialog />
    </>
  );
}
