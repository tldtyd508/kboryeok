"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight, Check, CircleHelp, ExternalLink, Share2, Target, Trophy } from "lucide-react";
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
  getKbo5001GameSnapshot,
  getServerKbo5001GameSnapshot,
  saveKbo5001Game,
  subscribeToProgress,
  type DailyGameStatus,
  type Kbo5001Submission,
} from "@/lib/daily-progress";
import type { Kbo5001Puzzle } from "@/lib/kbo5001";

const GAME_URL = "https://kboryeok.vercel.app/games/5001";

function submissionKey(names: string[]) {
  return [...names].sort((a, b) => a.localeCompare(b, "ko-KR")).join("|");
}

function differenceLabel(sum: number, target: number) {
  const difference = sum - target;
  if (difference === 0) return "정답";
  return difference > 0 ? `${difference.toLocaleString("ko-KR")} 초과` : `${Math.abs(difference).toLocaleString("ko-KR")} 부족`;
}

export function Kbo5001Game({
  puzzle,
  dateKey,
  isToday,
}: {
  puzzle: Kbo5001Puzzle;
  dateKey: string;
  isToday: boolean;
}) {
  const [message, setMessage] = useState(`${puzzle.selectionCount}명을 선택해 목표 숫자를 만들어 보세요.`);
  const [feedback, setFeedback] = useState<"neutral" | "correct" | "wrong">("neutral");
  const [shareLabel, setShareLabel] = useState("결과 공유");
  const progressId = `${puzzle.id}:r${puzzle.revision}`;
  const storedSnapshot = useSyncExternalStore(
    subscribeToProgress,
    () => getKbo5001GameSnapshot(progressId, dateKey),
    getServerKbo5001GameSnapshot,
  );
  const storedGame = useMemo(() => JSON.parse(storedSnapshot) as {
    gameStatus: DailyGameStatus;
    selectedNames: string[];
    submissions: Kbo5001Submission[];
  }, [storedSnapshot]);
  const { selectedNames, submissions, gameStatus } = storedGame;
  const candidateByName = useMemo(
    () => new Map(puzzle.candidates.map((candidate) => [candidate.name, candidate])),
    [puzzle.candidates],
  );
  const selectedCandidates = selectedNames
    .map((name) => candidateByName.get(name))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  const currentSum = selectedCandidates.reduce((sum, candidate) => sum + candidate.value, 0);
  const submittedKeys = useMemo(() => new Set(submissions.map((submission) => submissionKey(submission.names))), [submissions]);
  const currentKey = submissionKey(selectedNames);
  const finished = gameStatus !== "playing";
  const remainingSubmissions = Math.max(0, puzzle.maxSubmissions - submissions.length);
  const solutionNames = new Set(puzzle.solutions.flat());
  const displayMessage = feedback === "neutral" && gameStatus === "won"
    ? `정확히 ${puzzle.target.toLocaleString("ko-KR")}! 완성한 조합을 다시 보고 있어요.`
    : feedback === "neutral" && gameStatus === "lost"
      ? "제출 기회를 모두 사용했어요. 정답 조합을 확인해 보세요."
      : message;

  function persistSelection(nextSelectedNames: string[]) {
    saveKbo5001Game({
      puzzleId: progressId,
      selectedNames: nextSelectedNames,
      submissions,
      gameStatus: "playing",
    }, dateKey);
  }

  function toggleCandidate(name: string) {
    if (finished) return;
    setFeedback("neutral");
    if (selectedNames.includes(name)) {
      persistSelection(selectedNames.filter((selectedName) => selectedName !== name));
      setMessage("선수를 뺐어요. 다른 조합을 만들어 보세요.");
      return;
    }
    if (selectedNames.length >= puzzle.selectionCount) {
      setMessage(`선수는 ${puzzle.selectionCount}명까지만 선택할 수 있어요.`);
      return;
    }
    const nextSelectedNames = [...selectedNames, name];
    persistSelection(nextSelectedNames);
    setMessage(nextSelectedNames.length === puzzle.selectionCount ? "라인업 완성! 합계를 확인하고 제출하세요." : `${puzzle.selectionCount - nextSelectedNames.length}명 더 선택하세요.`);
  }

  function submitCombination() {
    if (finished || selectedNames.length !== puzzle.selectionCount) return;
    if (submittedKeys.has(currentKey)) {
      setFeedback("wrong");
      setMessage("이미 제출한 조합이에요. 선수를 바꿔 보세요.");
      return;
    }
    const nextSubmissions = [...submissions, { names: selectedNames, sum: currentSum }];
    const won = currentSum === puzzle.target;
    const nextStatus: DailyGameStatus = won ? "won" : nextSubmissions.length >= puzzle.maxSubmissions ? "lost" : "playing";
    saveKbo5001Game({
      puzzleId: progressId,
      selectedNames,
      submissions: nextSubmissions,
      gameStatus: nextStatus,
    }, dateKey);
    setFeedback(won ? "correct" : "wrong");
    setMessage(won ? `정확히 ${puzzle.target.toLocaleString("ko-KR")}! 조합을 완성했어요.` : `${currentSum.toLocaleString("ko-KR")} · 목표보다 ${differenceLabel(currentSum, puzzle.target)}`);
  }

  async function shareResult() {
    const rows = submissions.map((submission) => {
      const difference = submission.sum - puzzle.target;
      return difference === 0 ? "🟩 정답" : difference > 0 ? `⬆️ +${difference}` : `⬇️ ${difference}`;
    });
    const gameUrl = isToday ? GAME_URL : `${GAME_URL}?date=${dateKey}`;
    const text = `크보 5001 ${dateKey}\n${gameStatus === "won" ? "성공" : "실패"} · ${submissions.length}/${puzzle.maxSubmissions}회\n${rows.join("\n")}\n${gameUrl}`;
    try {
      if (navigator.share) await navigator.share({ text, url: gameUrl });
      else await navigator.clipboard.writeText(text);
      setShareLabel(navigator.share ? "공유 완료" : "복사 완료");
    } catch {
      setShareLabel("다시 시도");
    }
  }

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#6d63d8] dark:text-[#aebdff]">
            <span className="size-2 animate-pulse rounded-full bg-[#8ea7ff]" /> {isToday ? "오늘의 3번 타자" : "지난 크보 5001"}
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">크보 5001</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{puzzle.prompt}</p>
        </div>
        <Dialog>
          <DialogTrigger asChild><Button variant="outline" className="gap-2"><CircleHelp className="size-4" /> 게임 방법</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>크보 5001 게임 방법</DialogTitle><DialogDescription>선수들의 기록을 조합해 목표 숫자를 완성하세요.</DialogDescription></DialogHeader>
            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>후보 {puzzle.candidates.length}명 중 정확히 {puzzle.selectionCount}명을 선택합니다. 선수 카드를 다시 누르면 선택을 취소할 수 있어요.</p>
              <p>선택 중에는 기록 합계를 자유롭게 확인할 수 있고, 제출할 때만 기회가 차감됩니다.</p>
              <p>같은 조합을 다시 제출해도 기회는 줄지 않습니다. {puzzle.maxSubmissions}번 안에 목표값을 정확히 맞히면 성공입니다.</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <section className="overflow-hidden rounded-[2rem] border-2 border-foreground/10 bg-card shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="bg-[#8ea7ff] px-5 py-6 text-slate-950 sm:px-7">
          <p className="text-xs font-black tracking-[0.14em]">TODAY&apos;S NUMBER</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">{puzzle.title}</h2>
              <p className="mt-1 text-xs font-bold text-slate-800/75">{puzzle.scopeLabel}</p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-5 py-3 text-right text-white shadow-lg">
              <p className="text-[10px] font-black tracking-[0.14em] text-white/65">TARGET</p>
              <p className="text-3xl font-black tabular-nums">{puzzle.target.toLocaleString("ko-KR")}</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-7">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="rounded-2xl border border-foreground/10 bg-muted/45 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-black tracking-[0.12em] text-muted-foreground">선택 라인업</p>
                <p className="text-xs font-bold text-muted-foreground">{selectedNames.length} / {puzzle.selectionCount}명</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: puzzle.selectionCount }, (_, index) => {
                  const candidate = selectedCandidates[index];
                  return (
                    <button
                      key={candidate?.name ?? index}
                      type="button"
                      onClick={() => candidate && toggleCandidate(candidate.name)}
                      disabled={!candidate || finished}
                      aria-label={candidate ? `${candidate.name} 선택 취소` : `빈 선택 칸 ${index + 1}`}
                      className={`min-h-20 rounded-xl border px-2 py-2 text-center transition ${candidate ? "border-[#8ea7ff] bg-background hover:-translate-y-0.5" : "border-dashed border-foreground/15 bg-background/40"}`}
                    >
                      {candidate ? <><span className="block truncate text-sm font-black">{candidate.name}</span><span className="mt-1 block text-xs font-bold tabular-nums text-[#6d63d8] dark:text-[#aebdff]">{candidate.value.toLocaleString("ko-KR")}</span></> : <span className="text-xl font-black text-foreground/15">{index + 1}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`flex min-w-52 flex-col justify-center rounded-2xl border-2 p-4 text-center transition-colors ${feedback === "correct" ? "kbo5001-correct-pop border-emerald-500 bg-emerald-500 text-white" : feedback === "wrong" ? "border-rose-400 bg-rose-500/10" : "border-foreground/10 bg-background"}`}>
              <p className={`text-[11px] font-black tracking-[0.12em] ${feedback === "correct" ? "text-white/75" : "text-muted-foreground"}`}>CURRENT TOTAL</p>
              <p className="mt-1 text-3xl font-black tabular-nums">{currentSum.toLocaleString("ko-KR")}</p>
              <p className={`mt-1 text-xs font-bold ${feedback === "correct" ? "text-white/85" : currentSum > puzzle.target ? "text-rose-600 dark:text-rose-300" : "text-muted-foreground"}`}>{differenceLabel(currentSum, puzzle.target)}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-muted/55 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black">제출 기회 <span className="text-[#6d63d8] dark:text-[#aebdff]">{remainingSubmissions}회</span></p>
              <p className="mt-1 min-h-5 text-xs font-semibold text-muted-foreground" aria-live="polite">{displayMessage}</p>
            </div>
            {!finished ? (
              <Button type="button" onClick={submitCombination} disabled={selectedNames.length !== puzzle.selectionCount || submittedKeys.has(currentKey)} className="gap-2 sm:min-w-36">
                <Target className="size-4" /> 조합 제출
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={shareResult} variant="outline" className="gap-2"><Share2 className="size-4" /> {shareLabel}</Button>
                <Button asChild className="gap-2"><Link href="/games/kboten">크보텐 가기 <ArrowRight className="size-4" /></Link></Button>
              </div>
            )}
          </div>

          {submissions.length > 0 ? (
            <ol className="mt-4 grid gap-2 sm:grid-cols-3" aria-label="제출 기록">
              {submissions.map((submission, index) => (
                <li key={`${submissionKey(submission.names)}-${index}`} className={`rounded-xl border p-3 ${submission.sum === puzzle.target ? "border-emerald-500 bg-emerald-500/10" : "border-foreground/10 bg-background"}`}>
                  <p className="text-[10px] font-black tracking-[0.12em] text-muted-foreground">{index + 1}차 제출</p>
                  <p className="mt-1 text-lg font-black tabular-nums">{submission.sum.toLocaleString("ko-KR")}</p>
                  <p className={`text-xs font-bold ${submission.sum === puzzle.target ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground"}`}>{differenceLabel(submission.sum, puzzle.target)}</p>
                </li>
              ))}
            </ol>
          ) : null}

          {gameStatus === "lost" ? (
            <div className="mt-4 rounded-2xl border border-[#8ea7ff] bg-[#8ea7ff]/15 p-4">
              <p className="flex items-center gap-2 font-black"><Trophy className="size-4" /> 정답 조합</p>
              <div className="mt-2 space-y-1 text-sm font-semibold text-muted-foreground">
                {puzzle.solutions.map((solution, index) => <p key={submissionKey(solution)}>{puzzle.solutions.length > 1 ? `${index + 1}. ` : ""}{solution.join(" · ")}</p>)}
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-[0.12em] text-[#6d63d8] dark:text-[#aebdff]">PLAYER POOL</p>
                <h3 className="mt-1 text-xl font-black">후보 선수 {puzzle.candidates.length}명</h3>
              </div>
              <p className="text-xs font-semibold text-muted-foreground">카드를 눌러 선택</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {puzzle.candidates.map((candidate) => {
                const selected = selectedNames.includes(candidate.name);
                const revealedSolution = finished && solutionNames.has(candidate.name);
                return (
                  <button
                    key={candidate.name}
                    type="button"
                    onClick={() => toggleCandidate(candidate.name)}
                    disabled={finished}
                    aria-pressed={selected}
                    className={`relative min-h-24 rounded-2xl border-2 p-4 text-left transition ${revealedSolution ? "border-emerald-500 bg-emerald-500/12" : selected ? "border-[#6d63d8] bg-[#8ea7ff]/20 shadow-md" : "border-foreground/10 bg-background hover:-translate-y-0.5 hover:border-[#8ea7ff]"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black">{candidate.name}</span>
                      {selected || revealedSolution ? <span className={`grid size-5 place-items-center rounded-full ${revealedSolution ? "bg-emerald-500 text-white" : "bg-[#6d63d8] text-white"}`}><Check className="size-3 stroke-[3]" /></span> : null}
                    </div>
                    <p className="mt-3 text-xl font-black tabular-nums">{candidate.value.toLocaleString("ko-KR")}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">{puzzle.statLabel} · {candidate.status === "active" ? "현역" : "은퇴"}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <aside className="mt-6 rounded-2xl border border-foreground/10 bg-card p-5 text-sm">
        <p className="font-black">기록 출처와 출제 검증</p>
        <p className="mt-2 leading-6 text-muted-foreground">{puzzle.review.note}. 기록 정정이나 시즌 진행으로 원문 수치는 달라질 수 있어, 이 문제는 기준일 스냅샷으로 고정됩니다.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {puzzle.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold hover:text-primary">{source.name} · {source.accessedAt}<ExternalLink className="size-3" /></a>)}
        </div>
      </aside>
    </>
  );
}
