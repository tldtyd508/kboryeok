"use client";

import { FormEvent, useMemo, useState, useSyncExternalStore } from "react";
import { Check, CircleHelp, ExternalLink, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getKboTenGameSnapshot,
  getKstDateKey,
  getServerKboTenGameSnapshot,
  saveKboTenGame,
  subscribeToProgress,
  type DailyGameStatus,
} from "@/lib/daily-progress";
import { normalizePlayerName, type KboTenPuzzle } from "@/lib/kboten";

const GAME_URL = "https://kboryeok.vercel.app/games/kboten";

export function KboTenGame({ puzzle }: { puzzle: KboTenPuzzle }) {
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("선수 이름을 입력하세요.");
  const [shareLabel, setShareLabel] = useState("결과 공유");
  const dateKey = getKstDateKey();

  const storedSnapshot = useSyncExternalStore(
    subscribeToProgress,
    () => getKboTenGameSnapshot(puzzle.id, dateKey),
    getServerKboTenGameSnapshot,
  );
  const storedGame = JSON.parse(storedSnapshot) as {
    gameStatus: DailyGameStatus;
    correctNames: string[];
    wrongNames: string[];
  };
  const { correctNames, wrongNames } = storedGame;

  const gameStatus: DailyGameStatus = correctNames.length === puzzle.answers.length
    ? "won"
    : wrongNames.length >= puzzle.maxWrongGuesses
      ? "lost"
      : "playing";

  const answerLookup = useMemo(() => new Map(
    puzzle.answers.flatMap((answer) =>
      [answer.name, ...answer.aliases].map((name) => [normalizePlayerName(name), answer] as const),
    ),
  ), [puzzle.answers]);

  function submitGuess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (gameStatus !== "playing") return;
    const cleaned = input.trim();
    const normalized = normalizePlayerName(cleaned);
    if (!normalized) return;

    const alreadyGuessed = [...correctNames, ...wrongNames].some((name) => normalizePlayerName(name) === normalized);
    if (alreadyGuessed) {
      setMessage("이미 입력한 선수예요.");
      return;
    }

    const answer = answerLookup.get(normalized);
    if (answer) {
      const nextCorrectNames = [...correctNames, answer.name];
      const nextStatus: DailyGameStatus = nextCorrectNames.length === puzzle.answers.length ? "won" : "playing";
      saveKboTenGame({ puzzleId: puzzle.id, correctNames: nextCorrectNames, wrongNames, gameStatus: nextStatus }, dateKey);
      setMessage(`${answer.rank}위 ${answer.name}, 정답!`);
    } else {
      const nextWrongNames = [...wrongNames, cleaned];
      const nextStatus: DailyGameStatus = nextWrongNames.length >= puzzle.maxWrongGuesses ? "lost" : "playing";
      saveKboTenGame({ puzzleId: puzzle.id, correctNames, wrongNames: nextWrongNames, gameStatus: nextStatus }, dateKey);
      setMessage("TOP 10 명단에는 없어요.");
    }
    setInput("");
  }

  async function shareResult() {
    const grid = puzzle.answers.map((answer) => correctNames.includes(answer.name) ? "🟩" : "⬜").join("");
    const text = `크보텐 ${dateKey}\n${correctNames.length}/10 · 실수 ${wrongNames.length}/${puzzle.maxWrongGuesses}\n${grid}\n${GAME_URL}`;
    try {
      if (navigator.share) await navigator.share({ text, url: GAME_URL });
      else await navigator.clipboard.writeText(text);
      setShareLabel(navigator.share ? "공유 완료" : "복사 완료");
    } catch {
      setShareLabel("다시 시도");
    }
  }

  const finished = gameStatus !== "playing";

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#ff6b35]">
            <span className="size-2 animate-pulse rounded-full bg-[#ff6b35]" /> 오늘의 2번 타자
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">크보텐</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{puzzle.prompt}</p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-2xl border border-foreground/10 bg-card px-5 py-3 text-center">
            <p className="text-xs font-bold text-muted-foreground">찾은 선수</p>
            <p className="text-2xl font-black tabular-nums">{correctNames.length}<span className="ml-1 text-sm text-muted-foreground">/ 10</span></p>
          </div>
          <Dialog>
            <DialogTrigger asChild><Button variant="outline" size="icon" className="mt-2" aria-label="게임 방법"><CircleHelp className="size-4" /></Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>크보텐 게임 방법</DialogTitle><DialogDescription>주어진 기록의 상위 10명을 찾아보세요.</DialogDescription></DialogHeader>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>선수 이름을 맞히면 실제 순위 칸이 열립니다. 순서대로 입력할 필요는 없습니다.</p>
                <p>명단 밖 선수를 {puzzle.maxWrongGuesses}번 입력하면 게임이 끝나고 남은 답이 공개됩니다.</p>
                <p>현역, 은퇴, 해외 진출 선수를 모두 포함하며 문제에 적힌 조회 기준일의 기록을 사용합니다.</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border-2 border-foreground/10 bg-card shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="border-b border-foreground/10 bg-[#d9ff57] px-5 py-5 text-slate-950 sm:px-7">
          <p className="text-xs font-black tracking-[0.14em]">TODAY&apos;S TOP TEN</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-2xl font-black">{puzzle.title}</h2>
            <span className="text-xs font-bold">{puzzle.scopeLabel}</span>
          </div>
        </div>

        <div className="p-4 sm:p-7">
          <form onSubmit={submitGuess} className="mx-auto flex max-w-xl gap-2">
            <Input value={input} onChange={(event) => setInput(event.target.value)} disabled={finished} placeholder="예: 양준혁" aria-label="선수 이름" autoComplete="off" />
            <Button type="submit" disabled={finished || input.trim().length === 0}>입력</Button>
          </form>
          <div className="mt-3 flex min-h-6 items-center justify-center gap-2 text-sm font-semibold text-muted-foreground" aria-live="polite">
            {message}
          </div>

          <ol className="mt-5 grid gap-2 sm:grid-cols-2">
            {puzzle.answers.map((answer) => {
              const found = correctNames.includes(answer.name);
              const revealed = found || finished;
              return (
                <li key={answer.rank} className={`flex min-h-16 items-center gap-4 rounded-2xl border px-4 py-3 transition-colors ${found ? "border-emerald-500/40 bg-emerald-500/10" : revealed ? "border-foreground/10 bg-muted/65" : "border-foreground/10 bg-background"}`}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-xs font-black text-background">{answer.rank}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`font-black ${revealed ? "" : "text-muted-foreground"}`}>{revealed ? answer.name : "???"}</p>
                    <p className="text-xs font-semibold text-muted-foreground">{revealed ? `${puzzle.statLabel} ${answer.value}` : puzzle.statLabel}</p>
                  </div>
                  {found ? <Check className="size-5 text-emerald-600" /> : revealed ? <X className="size-5 text-muted-foreground" /> : null}
                </li>
              );
            })}
          </ol>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-muted/65 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black">실수 {wrongNames.length} / {puzzle.maxWrongGuesses}</p>
              <p className="mt-1 text-xs text-muted-foreground">{wrongNames.length > 0 ? wrongNames.join(" · ") : "아직 실수 없이 진행 중"}</p>
            </div>
            {finished && <Button type="button" onClick={shareResult} className="gap-2"><Share2 className="size-4" /> {shareLabel}</Button>}
          </div>
        </div>
      </section>

      <aside className="mt-6 rounded-2xl border border-foreground/10 bg-card p-5 text-sm">
        <p className="font-black">기록 출처와 기준</p>
        <p className="mt-2 leading-6 text-muted-foreground">{puzzle.review.note}. 기록 정정이나 시즌 진행으로 원문 수치는 달라질 수 있어, 이 문제의 답은 기준일 스냅샷으로 고정됩니다.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {puzzle.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold hover:text-primary">{source.name} · {source.accessedAt}<ExternalLink className="size-3" /></a>)}
        </div>
      </aside>
    </>
  );
}
