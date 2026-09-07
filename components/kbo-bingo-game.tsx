"use client";

import Link from "next/link";
import { ArrowRight, Check, CircleHelp, Share2, SkipForward, Trophy, X } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import copy from "copy-to-clipboard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getKboBingoGameSnapshot,
  getServerKboBingoGameSnapshot,
  saveKboBingoGame,
  subscribeToProgress,
  type DailyGameStatus,
  type KboBingoTurn,
} from "@/lib/daily-progress";
import type { KboBingoPublicPuzzle } from "@/lib/kbo-bingo";

const GAME_URL = "https://kboryeok.vercel.app/games/bingo";

export function KboBingoGame({
  puzzle,
  dateKey,
  isToday,
}: {
  puzzle: KboBingoPublicPuzzle;
  dateKey: string;
  isToday: boolean;
}) {
  const [feedback, setFeedback] = useState<"neutral" | "correct" | "wrong">("neutral");
  const [message, setMessage] = useState("");
  const [shareLabel, setShareLabel] = useState("결과 공유");
  const progressId = `${puzzle.id}:r${puzzle.revision}`;
  const storedSnapshot = useSyncExternalStore(
    subscribeToProgress,
    () => getKboBingoGameSnapshot(progressId, dateKey),
    getServerKboBingoGameSnapshot,
  );
  const storedGame = useMemo(() => JSON.parse(storedSnapshot) as {
    gameStatus: DailyGameStatus;
    turns: KboBingoTurn[];
  }, [storedSnapshot]);
  const { turns, gameStatus } = storedGame;
  const playerById = useMemo(() => new Map(puzzle.players.map((player) => [player.id, player])), [puzzle.players]);
  const filledByCell = useMemo(() => new Map(
    turns.filter((turn) => turn.correct && turn.cellId).map((turn) => [turn.cellId as string, turn.playerId]),
  ), [turns]);
  const finished = gameStatus !== "playing";
  const currentPlayer = puzzle.players[turns.length];
  const mistakes = turns.filter((turn) => !turn.correct && turn.cellId !== null).length;
  const passes = turns.filter((turn) => turn.cellId === null).length;
  const remainingCards = Math.max(0, puzzle.maxCards - turns.length);

  function saveTurn(turn: KboBingoTurn) {
    if (finished || !currentPlayer) return;
    const nextTurns = [...turns, turn];
    const filledCount = nextTurns.filter((candidate) => candidate.correct).length;
    const nextStatus: DailyGameStatus = filledCount === puzzle.board.length
      ? "won"
      : nextTurns.length >= puzzle.maxCards
        ? "lost"
        : "playing";
    saveKboBingoGame({ puzzleId: progressId, turns: nextTurns, gameStatus: nextStatus }, dateKey);
  }

  function placePlayer(cellId: string) {
    if (finished || !currentPlayer || filledByCell.has(cellId)) return;
    const cell = puzzle.board.find((candidate) => candidate.id === cellId);
    if (!cell) return;
    const correct = cell.validPlayerIds.includes(currentPlayer.id);
    setFeedback(correct ? "correct" : "wrong");
    setMessage(correct ? "정답" : "이 칸에는 들어가지 않습니다.");
    saveTurn({ playerId: currentPlayer.id, cellId, correct });
  }

  function passPlayer() {
    if (finished || !currentPlayer) return;
    setFeedback("neutral");
    setMessage("패스");
    saveTurn({ playerId: currentPlayer.id, cellId: null, correct: false });
  }

  function shareResult() {
    const grid = puzzle.board.map((cell, index) => `${filledByCell.has(cell.id) ? "🟩" : "⬜"}${index % 4 === 3 ? "\n" : ""}`).join("").trim();
    const gameUrl = isToday ? GAME_URL : `${GAME_URL}?date=${dateKey}`;
    const text = `크보 빙고 ${dateKey}\n${gameStatus === "won" ? "성공" : "실패"} · ${turns.length}/${puzzle.maxCards}장\n${grid}\n${gameUrl}`;
    setShareLabel(copy(text) ? "복사 완료" : "다시 시도");
  }

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">크보 빙고</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{puzzle.prompt}</p>
        </div>
        <Dialog>
          <DialogTrigger asChild><Button variant="outline" size="icon" aria-label="게임 방법"><CircleHelp className="size-4" /></Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>크보 빙고 게임 방법</DialogTitle><DialogDescription>선수 카드를 어디에 쓸지 선택하세요.</DialogDescription></DialogHeader>
            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>매 턴 선수 한 명이 등장합니다. 그 선수가 만족하는 빈칸 하나를 선택하세요.</p>
              <p>한 선수는 한 칸에만 쓸 수 있습니다. 여러 조건을 만족하는 선수일수록 어디에 배치할지가 중요합니다.</p>
              <p>오답과 패스도 카드를 한 장 사용합니다. 36장이 끝나기 전에 16칸을 모두 채우면 성공입니다.</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <section className="overflow-hidden rounded-[2rem] border-2 border-foreground/10 bg-card">
        <div className="bg-[#e98fc6] px-5 py-5 text-slate-950 sm:px-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black">{puzzle.title}</p>
              <p className="mt-1 text-sm font-bold text-slate-800/70">채운 칸 {filledByCell.size}/16</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800/65">남은 카드</p>
              <p className="text-3xl font-black tabular-nums">{remainingCards}</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950/15">
            <div className="h-full rounded-full bg-slate-950 transition-[width]" style={{ width: `${(turns.length / puzzle.maxCards) * 100}%` }} />
          </div>
        </div>

        <div className="p-4 sm:p-7">
          {!finished && currentPlayer ? (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border-2 border-foreground/10 bg-background p-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-muted-foreground">{turns.length + 1}번째 선수</p>
                <p className="mt-1 truncate text-2xl font-black">{currentPlayer.name}</p>
              </div>
              <Button type="button" variant="outline" onClick={passPlayer} className="shrink-0 gap-2"><SkipForward className="size-4" /> 패스</Button>
            </div>
          ) : null}

          {message && !finished ? (
            <p className={`mb-4 flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black ${feedback === "correct" ? "bg-emerald-500 text-white" : feedback === "wrong" ? "bg-rose-500/12 text-rose-700 dark:text-rose-300" : "bg-muted text-muted-foreground"}`} aria-live="polite">
              {feedback === "correct" ? <Check className="size-4" /> : feedback === "wrong" ? <X className="size-4" /> : null}{message}
            </p>
          ) : null}

          <div className="grid grid-cols-4 gap-1.5 sm:gap-2" aria-label="크보 빙고 4×4 조건판">
            {puzzle.board.map((cell) => {
              const playerId = filledByCell.get(cell.id);
              const player = playerId ? playerById.get(playerId) : null;
              const example = playerById.get(cell.examplePlayerId);
              return (
                <button
                  key={cell.id}
                  type="button"
                  onClick={() => placePlayer(cell.id)}
                  disabled={finished || Boolean(player)}
                  className={`aspect-square min-w-0 rounded-xl border p-1.5 text-center transition sm:rounded-2xl sm:p-3 ${player ? "border-emerald-600 bg-emerald-500 text-white" : finished ? "border-foreground/10 bg-muted/55" : "border-foreground/10 bg-background hover:border-[#e98fc6] hover:bg-[#e98fc6]/10"}`}
                >
                  <span className={`block text-[10px] font-bold leading-tight sm:text-xs ${player ? "text-white/80" : "text-muted-foreground"}`}>{cell.label}</span>
                  <span className="mt-1 block truncate text-xs font-black sm:text-base">{player?.name ?? (gameStatus === "lost" ? `예: ${example?.name ?? "-"}` : "")}</span>
                </button>
              );
            })}
          </div>

          {finished ? (
            <div className={`mt-5 rounded-2xl p-5 ${gameStatus === "won" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
              <p className="flex items-center gap-2 text-sm font-black"><Trophy className="size-4" /> {gameStatus === "won" ? "빙고 완성" : "오늘의 도전 종료"}</p>
              <p className="mt-2 text-3xl font-black">{filledByCell.size}/16</p>
              <p className="mt-1 text-sm font-bold text-white/80">사용 {turns.length}장 · 오답 {mistakes} · 패스 {passes}</p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button type="button" onClick={shareResult} variant="secondary" className="flex-1 gap-2"><Share2 className="size-4" /> {shareLabel}</Button>
                <Button asChild variant="outline" className="flex-1 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link href="/">게임 홈 <ArrowRight className="size-4" /></Link></Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
