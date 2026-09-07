import Link from "next/link";
import { ArrowRight, Flame, Home, Share2, Trophy } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import copy from "copy-to-clipboard";
import { useGameStore } from "@/lib/store";
import {
  getDashboardSnapshot,
  getKstDateKey,
  getServerDashboardSnapshot,
  subscribeToProgress,
} from "@/lib/daily-progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GAME_URL = "https://kboryeok.vercel.app/games/player";
const RESULT_LABELS = ["팀", "포지션", "투", "타", "나이", "번호"];

function resultCell(value: string) {
  if (value === "correct") return { symbol: "✓", className: "bg-emerald-500 text-white" };
  if (value === "partial") return { symbol: "△", className: "bg-amber-400 text-slate-950" };
  if (value === "up") return { symbol: "↑", className: "bg-sky-500 text-white" };
  if (value === "down") return { symbol: "↓", className: "bg-violet-500 text-white" };
  return { symbol: "×", className: "bg-rose-500 text-white" };
}

export default function GameOverDialog() {
  const gameStatus = useGameStore((state) => state.gameStatus);
  const isGameOver = gameStatus === "won" || gameStatus === "lost";

  return isGameOver ? <FinishedGameDialog /> : null;
}

function FinishedGameDialog() {
  const { gameStatus, secretPlayer, guesses, results, activeDate } = useGameStore();
  const [shareFeedback, setShareFeedback] = useState<"idle" | "shared" | "copied">("idle");
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const dashboardSnapshot = useSyncExternalStore(
    subscribeToProgress,
    getDashboardSnapshot,
    getServerDashboardSnapshot,
  );
  const [, , , currentValue, bestValue] = dashboardSnapshot.split("|");
  const currentStreak = Number(currentValue);
  const bestStreak = Number(bestValue);

  const handleShare = async () => {
    const shareDate = activeDate ?? getKstDateKey();
    const gameUrl = shareDate === getKstDateKey() ? GAME_URL : `${GAME_URL}?date=${shareDate}`;
    const score = gameStatus === "won" ? guesses.length : "X";
    const grid = results.map((result) => [
      result.team === "correct" ? "🟩" : "🟥",
      result.position === "correct" ? "🟩" : result.position === "partial" ? "🟨" : "🟥",
      result.throws === "correct" ? "🟩" : "🟥",
      result.bats === "correct" ? "🟩" : "🟥",
      result.age === "correct" ? "🟩" : result.age === "up" ? "🔼" : "🔽",
      result.jerseyNumber === "correct" ? "🟩" : result.jerseyNumber === "up" ? "🔼" : "🔽",
    ].join("")).join("\n");
    const shareText = `크보력 ${shareDate} ${score}/8\n🔥 ${currentStreak}일 연속\n\n${grid}\n\n크보선수 도전하기`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "크보선수 | 크보력", text: shareText, url: gameUrl });
        setShareFeedback("shared");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    copy(`${shareText}\n${gameUrl}`);
    setShareFeedback("copied");
    window.setTimeout(() => setShareFeedback("idle"), 2000);
  };

  const shareLabel = shareFeedback === "shared"
    ? "공유 완료"
    : shareFeedback === "copied"
      ? "링크 포함 복사 완료"
      : "결과 공유하기";

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-h-[92vh] max-w-xl gap-0 overflow-y-auto p-0">
        <DialogHeader className={`p-7 text-left text-white ${gameStatus === "won" ? "bg-emerald-600" : "bg-rose-600"}`}>
          <p className="text-xs font-black tracking-[0.16em]">{gameStatus === "won" ? "성공" : "실패"} · {gameStatus === "won" ? guesses.length : "X"}/8</p>
          <DialogTitle className="mt-3 text-4xl font-black text-white">{secretPlayer?.name}</DialogTitle>
          <DialogDescription className="text-white/80">
            {secretPlayer?.team} · {secretPlayer?.positionDetail}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          <div className="grid grid-cols-[2rem_repeat(6,minmax(0,1fr))] gap-1.5 text-center">
            <span aria-hidden="true" />
            {RESULT_LABELS.map((label) => <span key={label} className="pb-1 text-[10px] font-bold text-muted-foreground">{label}</span>)}
            {results.flatMap((result, rowIndex) => {
              const values = [result.team, result.position, result.throws, result.bats, result.age, result.jerseyNumber];
              return [
                <span key={`number-${rowIndex}`} className="grid aspect-square place-items-center text-xs font-black text-muted-foreground">{rowIndex + 1}</span>,
                ...values.map((value, columnIndex) => {
                  const cell = resultCell(value);
                  return <span key={`${rowIndex}-${columnIndex}`} className={`grid aspect-square place-items-center rounded-md text-base font-black ${cell.className}`} aria-label={`${rowIndex + 1}번째 추측 ${RESULT_LABELS[columnIndex]} ${value}`}>{cell.symbol}</span>;
                }),
              ];
            })}
          </div>

          <div className="mt-6 grid grid-cols-3 divide-x rounded-2xl bg-muted py-4 text-center">
            <div>
              <p className="text-xs font-bold text-muted-foreground">시도</p>
              <p className="mt-1 text-2xl font-black tabular-nums">{guesses.length}</p>
            </div>
            <div>
              <p className="flex items-center justify-center gap-1 text-xs font-bold text-muted-foreground"><Flame className="size-3.5 text-[#ff6b35]" /> 연속</p>
              <p className="mt-1 text-2xl font-black tabular-nums">{currentStreak}</p>
            </div>
            <div>
              <p className="flex items-center justify-center gap-1 text-xs font-bold text-muted-foreground"><Trophy className="size-3.5 text-primary" /> 최고</p>
              <p className="mt-1 text-2xl font-black tabular-nums">{bestStreak}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={handleShare} className="w-full"><Share2 className="size-4" /> {shareLabel}</Button>
            <Button asChild variant="secondary" className="w-full"><Link href="/games/kboten">크보텐 도전 <ArrowRight className="size-4" /></Link></Button>
            <Button asChild variant="ghost" className="w-full"><Link href="/"><Home className="size-4" /> 게임 홈</Link></Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
