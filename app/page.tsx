
"use client";

import { useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import PlayerSearch from '@/components/PlayerSearch';
import ResultBoard from '@/components/ResultBoard';
import GameOverDialog from '@/components/GameOverDialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HelpCircle, Loader2 } from "lucide-react";

export default function Home() {
  const {
    isDataLoading,
    error,
    actions,
    guesses
  } = useGameStore();

  useEffect(() => {
    actions.fetchDataAndStartGame();
  }, [actions]);

  const handleRetry = () => {
    actions.fetchDataAndStartGame();
  };

  return (
    <main className="container mx-auto p-4">
      <header className="flex items-center justify-between my-6">
        <div></div> {/* For spacing */}
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tighter">크보력</h1>
          <p className="text-xs font-medium tracking-[0.24em] text-muted-foreground">KBORYEOK</p>
          <p className="text-muted-foreground">남은 기회: {8 - guesses.length}번</p>
        </div>
        <ThemeToggle />
      </header>

      <div className="max-w-4xl mx-auto">
        {isDataLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="ml-2">선수 명단을 불러오는 중...</p>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center p-8 bg-destructive/10 rounded-md">
            <p className="text-destructive mb-4">오류: {error}</p>
            <Button onClick={handleRetry}>다시 시도</Button>
          </div>
        )}
        {!isDataLoading && !error && (
          <>
            <div className="flex justify-center gap-2 mb-4">
              <div className="w-full max-w-sm">
                <PlayerSearch />
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="게임 방법 보기">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>게임 방법</DialogTitle>
                  </DialogHeader>
                  {/* ... Help content ... */}
                </DialogContent>
              </Dialog>
            </div>
            
            <ResultBoard />
          </>
        )}
      </div>
      <GameOverDialog />
      <footer className="text-center mt-12 text-sm text-muted-foreground">
        <p>오늘의 선수를 맞히고 나의 크보력을 확인해 보세요.</p>
      </footer>
    </main>
  );
}
