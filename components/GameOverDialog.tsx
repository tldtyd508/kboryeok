import Link from "next/link";
import { Check, Flame, Home, Link2, Share2, Trophy } from "lucide-react";
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

export default function GameOverDialog() {
  const gameStatus = useGameStore((state) => state.gameStatus);
  const isGameOver = gameStatus === "won" || gameStatus === "lost";

  return isGameOver ? <FinishedGameDialog /> : null;
}

function FinishedGameDialog() {
  const { gameStatus, secretPlayer, guesses, results } = useGameStore();
  const [shareFeedback, setShareFeedback] = useState<"idle" | "shared" | "copied">("idle");
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const dashboardSnapshot = useSyncExternalStore(
    subscribeToProgress,
    getDashboardSnapshot,
    getServerDashboardSnapshot,
  );
  const [, currentValue, bestValue] = dashboardSnapshot.split("|");
  const currentStreak = Number(currentValue);
  const bestStreak = Number(bestValue);

  const handleShare = async () => {
    const score = gameStatus === "won" ? guesses.length : "X";
    const grid = results.map((result) => [
      result.team === "correct" ? "🟩" : "🟥",
      result.position === "correct" ? "🟩" : result.position === "partial" ? "🟨" : "🟥",
      result.throws === "correct" ? "🟩" : "🟥",
      result.bats === "correct" ? "🟩" : "🟥",
      result.age === "correct" ? "🟩" : result.age === "up" ? "🔼" : "🔽",
      result.jerseyNumber === "correct" ? "🟩" : result.jerseyNumber === "up" ? "🔼" : "🔽",
    ].join("")).join("\n");
    const shareText = `크보력 ${getKstDateKey()} ${score}/8\n🔥 ${currentStreak}일 연속\n\n${grid}\n\n오늘의 크보선수 도전하기`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "오늘의 크보선수 | 크보력", text: shareText, url: GAME_URL });
        setShareFeedback("shared");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    copy(`${shareText}\n${GAME_URL}`);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{gameStatus === "won" ? "오늘도 정답!" : "오늘의 도전 완료"}</DialogTitle>
          <DialogDescription>
            {gameStatus === "won"
              ? `${guesses.length}번 만에 오늘의 선수를 맞혔습니다.`
              : <>정답은 <strong>{secretPlayer?.name}</strong> 선수였습니다.</>}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#ff6b35]/10 p-4 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground"><Flame className="size-4 text-[#ff6b35]" /> 현재 연속</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{currentStreak}일</p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-4 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground"><Trophy className="size-4 text-primary" /> 최고 기록</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{bestStreak}일</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
          <Link2 className="size-4 shrink-0" />
          <span className="truncate">{GAME_URL}</span>
          {shareFeedback !== "idle" ? <Check className="ml-auto size-4 shrink-0 text-emerald-600" /> : null}
        </div>

        <div className="mt-1 flex flex-col gap-2">
          <Button onClick={handleShare} className="w-full">
            <Share2 className="size-4" /> {shareLabel}
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/"><Home className="size-4" /> 게임 홈으로</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
