"use client";

import { useEffect } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  Check,
  CircleDot,
  Clock3,
  Hash,
  HelpCircle,
  Loader2,
  Network,
  Sigma,
  Sparkles,
} from "lucide-react";
import { useGameStore } from "@/lib/store";
import PlayerSearch from "@/components/PlayerSearch";
import ResultBoard from "@/components/ResultBoard";
import GameOverDialog from "@/components/GameOverDialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const upcomingGames = [
  {
    title: "크보 커넥션",
    description: "16명의 선수를 네 개의 연결고리로 묶어보세요.",
    label: "다음 타석",
    icon: Network,
    accent: "bg-[#ff6b35] text-white",
  },
  {
    title: "크보 5001",
    description: "선수들의 기록을 조합해 오늘의 목표 숫자를 완성하세요.",
    label: "개발 예정",
    icon: Sigma,
    accent: "bg-[#d9ff57] text-slate-950",
  },
  {
    title: "등번호 연대기",
    description: "등번호의 변화만 보고 한 선수의 커리어를 추리하세요.",
    label: "주간 스페셜",
    icon: Hash,
    accent: "bg-[#8ea7ff] text-slate-950",
  },
] as const;

export default function Home() {
  const { isDataLoading, error, actions, guesses } = useGameStore();

  useEffect(() => {
    actions.fetchDataAndStartGame();
  }, [actions]);

  const handleRetry = () => {
    actions.fetchDataAndStartGame();
  };

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="relative z-20 border-b border-foreground/10 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-2" aria-label="크보력 홈">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <CircleDot className="size-5" />
            </span>
            <span className="text-xl font-black tracking-[-0.08em]">크보력</span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-semibold sm:flex" aria-label="주요 메뉴">
            <a className="transition-colors hover:text-primary" href="#games">게임</a>
            <a className="transition-colors hover:text-primary" href="#daily-player">오늘의 문제</a>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <section id="top" className="field-grid relative border-b border-foreground/10">
        <div className="absolute -left-32 top-10 size-80 rounded-full bg-[#d9ff57]/25 blur-3xl" />
        <div className="absolute -right-20 bottom-0 size-72 rounded-full bg-[#ff6b35]/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background/80 px-3 py-1.5 text-xs font-bold tracking-wide shadow-sm">
              <Sparkles className="size-3.5 text-[#ff6b35]" />
              매일 새롭게 열리는 KBO 퀴즈
            </div>
            <h1 className="max-w-3xl text-balance text-5xl font-black leading-[0.95] tracking-[-0.075em] sm:text-7xl lg:text-[5.7rem]">
              당신의<br />
              <span className="text-primary">크보력</span>, 몇 점?
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              선수, 기록, 이적과 명경기까지. 외운 숫자가 아니라 당신이 쌓아온 야구 감각을 시험해 보세요.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-6 font-bold shadow-[0_8px_30px_rgba(31,69,200,0.24)]">
                <a href="#daily-player">오늘의 문제 풀기 <ArrowDown className="size-4" /></a>
              </Button>
              <span className="flex items-center gap-2 px-2 text-sm font-medium text-muted-foreground">
                <CalendarDays className="size-4" /> 하루 한 문제
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:ml-auto">
            <div className="absolute inset-4 translate-x-4 translate-y-4 rounded-[2rem] border-2 border-foreground bg-[#d9ff57]" />
            <div className="relative rounded-[2rem] border-2 border-foreground bg-card p-6 shadow-xl sm:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-black tracking-[0.18em] text-primary">TODAY&apos;S GAME</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">오늘의 크보선수</h2>
                </div>
                <span className="rounded-full bg-[#ff6b35] px-3 py-1 text-xs font-black text-white">LIVE</span>
              </div>
              <div className="my-8 grid place-items-center">
                <div className="relative grid size-44 rotate-45 place-items-center rounded-[2.2rem] border-2 border-primary/50 bg-primary/10">
                  <div className="size-24 rounded-2xl border-2 border-primary/35 bg-background" />
                  <span className="absolute -right-2 -top-2 size-4 rounded-full bg-[#ff6b35] shadow-[0_0_0_7px_rgba(255,107,53,0.18)]" />
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-foreground/10 pt-5 text-sm">
                <span className="flex items-center gap-2 font-semibold"><Clock3 className="size-4" /> 8번의 기회</span>
                <a href="#daily-player" className="flex items-center gap-1 font-black text-primary hover:underline">플레이 <ArrowRight className="size-4" /></a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="games" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-black tracking-[0.18em] text-primary">THE LINEUP</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">크보력 게임 라인업</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">선수 추리로 시작해 관계, 기록 조합, KBO 역사까지 차례로 확장됩니다.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <a href="#daily-player" className="group flex min-h-64 flex-col rounded-3xl border-2 border-primary bg-primary p-6 text-primary-foreground transition-transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">지금 플레이</span>
              <CircleDot className="size-7" />
            </div>
            <div className="mt-auto">
              <h3 className="text-2xl font-black">오늘의 크보선수</h3>
              <p className="mt-2 text-sm leading-6 text-white/75">팀과 포지션, 나이, 등번호 힌트로 오늘의 선수를 찾으세요.</p>
              <span className="mt-5 flex items-center gap-1 text-sm font-black">게임 시작 <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
            </div>
          </a>

          {upcomingGames.map((game) => {
            const Icon = game.icon;
            return (
              <article key={game.title} className="flex min-h-64 flex-col rounded-3xl border border-foreground/10 bg-card p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-black text-muted-foreground">{game.label}</span>
                  <span className={`grid size-10 place-items-center rounded-2xl ${game.accent}`}><Icon className="size-5" /></span>
                </div>
                <div className="mt-auto">
                  <h3 className="text-2xl font-black tracking-tight">{game.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{game.description}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground"><Clock3 className="size-3.5" /> 준비 중</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="daily-player" className="border-y border-foreground/10 bg-card/70">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#ff6b35]">
                  <span className="size-2 animate-pulse rounded-full bg-[#ff6b35]" /> 오늘의 게임
                </div>
                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">오늘의 크보선수</h2>
                <p className="mt-2 text-muted-foreground">선수를 입력하고 힌트를 비교해 정답을 찾아보세요.</p>
              </div>
              <div className="rounded-2xl border border-foreground/10 bg-background px-5 py-3 text-center">
                <p className="text-xs font-bold text-muted-foreground">남은 기회</p>
                <p className="text-2xl font-black tabular-nums">{8 - guesses.length}<span className="ml-1 text-sm text-muted-foreground">/ 8</span></p>
              </div>
            </div>

            <div className="rounded-[2rem] border-2 border-foreground/10 bg-background p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
              {isDataLoading ? (
                <div className="flex min-h-52 items-center justify-center">
                  <Loader2 className="size-7 animate-spin text-primary" />
                  <p className="ml-3 font-semibold">선수 명단을 불러오는 중...</p>
                </div>
              ) : error ? (
                <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl bg-destructive/10 p-8 text-center">
                  <p className="mb-4 text-destructive">오류: {error}</p>
                  <Button onClick={handleRetry}>다시 시도</Button>
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
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="font-black text-foreground">크보력 <span className="font-medium text-muted-foreground">KBORYEOK</span></p>
        <p>KBO 팬의 기억과 감각을 위한 데일리 퀴즈.</p>
      </footer>

      <GameOverDialog />
    </main>
  );
}
