"use client";

import { useDeferredValue, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import Fuse from "fuse.js";
import { Check, CheckCircle2, CircleHelp, ExternalLink, Heart, Search, Share2, X, XCircle } from "lucide-react";
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
import {
  normalizePlayerName,
  type KboTenPlayerOption,
  type KboTenPuzzle,
} from "@/lib/kboten";

const GAME_URL = "https://kboryeok.vercel.app/games/kboten";

export function KboTenGame({
  puzzle,
  playerOptions,
}: {
  puzzle: KboTenPuzzle;
  playerOptions: KboTenPlayerOption[];
}) {
  const [input, setInput] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [message, setMessage] = useState("선수를 검색한 뒤 후보를 선택하세요.");
  const [feedback, setFeedback] = useState<{ kind: "neutral" | "correct" | "wrong"; playerName: string }>({ kind: "neutral", playerName: "" });
  const [shareLabel, setShareLabel] = useState("결과 공유");
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const deferredInput = useDeferredValue(input);
  const dateKey = getKstDateKey();

  const storedSnapshot = useSyncExternalStore(
    subscribeToProgress,
    () => getKboTenGameSnapshot(puzzle.id, dateKey),
    getServerKboTenGameSnapshot,
  );
  const storedGame = useMemo(() => JSON.parse(storedSnapshot) as {
      gameStatus: DailyGameStatus;
      correctNames: string[];
      wrongNames: string[];
    }, [storedSnapshot]);
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

  const fuse = useMemo(() => new Fuse(playerOptions, {
    keys: ["name", "aliases"],
    threshold: 0.35,
    ignoreLocation: true,
  }), [playerOptions]);

  const guessedNames = useMemo(() => new Set(
    [...correctNames, ...wrongNames].map(normalizePlayerName),
  ), [correctNames, wrongNames]);

  const searchResults = useMemo(() => {
    const query = normalizePlayerName(deferredInput.trim());
    if (!query) return [];

    const available = playerOptions.filter((player) => !guessedNames.has(normalizePlayerName(player.name)));
    const directMatches = available
      .filter((player) => [player.name, ...player.aliases].some((name) => normalizePlayerName(name).includes(query)))
      .sort((a, b) => {
        const aName = normalizePlayerName(a.name);
        const bName = normalizePlayerName(b.name);
        const startDifference = Number(bName.startsWith(query)) - Number(aName.startsWith(query));
        if (startDifference !== 0) return startDifference;
        const positionDifference = aName.indexOf(query) - bName.indexOf(query);
        return positionDifference !== 0 ? positionDifference : a.name.localeCompare(b.name, "ko-KR");
      });

    if (directMatches.length >= 6 || query.length < 2) return directMatches.slice(0, 6);
    const directIds = new Set(directMatches.map((player) => player.id));
    const fuzzyMatches = fuse.search(query)
      .map((result) => result.item)
      .filter((player) => !guessedNames.has(normalizePlayerName(player.name)) && !directIds.has(player.id));
    return [...directMatches, ...fuzzyMatches].slice(0, 6);
  }, [deferredInput, fuse, guessedNames, playerOptions]);

  function submitPlayer(player: KboTenPlayerOption) {
    if (gameStatus !== "playing") return;
    const answer = answerLookup.get(normalizePlayerName(player.name));
    if (answer) {
      const nextCorrectNames = [...correctNames, answer.name];
      const nextStatus: DailyGameStatus = nextCorrectNames.length === puzzle.answers.length ? "won" : "playing";
      saveKboTenGame({ puzzleId: puzzle.id, correctNames: nextCorrectNames, wrongNames, gameStatus: nextStatus }, dateKey);
      setMessage(`${answer.rank}위 ${answer.name}, 정답!`);
      setFeedback({ kind: "correct", playerName: answer.name });
    } else {
      const nextWrongNames = [...wrongNames, player.name];
      const nextStatus: DailyGameStatus = nextWrongNames.length >= puzzle.maxWrongGuesses ? "lost" : "playing";
      saveKboTenGame({ puzzleId: puzzle.id, correctNames, wrongNames: nextWrongNames, gameStatus: nextStatus }, dateKey);
      setMessage("TOP 10 명단에는 없어요.");
      setFeedback({ kind: "wrong", playerName: player.name });
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        searchContainerRef.current?.animate(
          [
            { transform: "translateX(0)" },
            { transform: "translateX(-9px)" },
            { transform: "translateX(8px)" },
            { transform: "translateX(-5px)" },
            { transform: "translateX(0)" },
          ],
          { duration: 360, easing: "ease-out" },
        );
      }
    }
    setInput("");
    setActiveIndex(0);
    setIsSearchFocused(true);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (searchResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % searchResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + searchResults.length) % searchResults.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      submitPlayer(searchResults[activeIndex] ?? searchResults[0]);
    } else if (event.key === "Escape") {
      setInput("");
    }
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
  const remainingLives = Math.max(0, puzzle.maxWrongGuesses - wrongNames.length);

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
          <div className="mx-auto mb-4 flex max-w-xl items-center justify-between rounded-2xl border border-foreground/10 bg-muted/55 px-4 py-3">
            <div>
              <p className="text-[11px] font-black tracking-[0.12em] text-muted-foreground">LIFE</p>
              <p className="mt-0.5 text-sm font-bold">틀릴 때마다 하나씩 사라져요</p>
            </div>
            <div className="flex gap-1.5" aria-label={`남은 라이프 ${remainingLives}개`}>
              {Array.from({ length: puzzle.maxWrongGuesses }, (_, index) => {
                const active = index < remainingLives;
                const justLost = feedback.kind === "wrong" && index === remainingLives;
                return (
                  <span key={index} className={justLost ? "kboten-life-lost" : ""} aria-hidden="true">
                    <Heart className={`size-6 ${active ? "fill-rose-500 text-rose-500" : "fill-transparent text-foreground/20"}`} />
                  </span>
                );
              })}
            </div>
          </div>

          <div ref={searchContainerRef} className="relative mx-auto max-w-xl" role="search">
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setActiveIndex(0);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onKeyDown={handleSearchKeyDown}
              disabled={finished}
              placeholder="선수 이름 검색..."
              aria-label="선수 이름 검색"
              aria-autocomplete="list"
              aria-controls="kboten-player-options"
              aria-expanded={isSearchFocused && input.trim().length > 0}
              aria-activedescendant={searchResults[activeIndex] ? `kboten-option-${searchResults[activeIndex].id}` : undefined}
              role="combobox"
              autoComplete="off"
              className="h-12 rounded-2xl pl-11 pr-4 text-base"
            />
            {isSearchFocused && input.trim().length > 0 ? (
              <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-foreground/10 bg-card shadow-[0_16px_45px_rgba(15,23,42,0.16)]">
                {searchResults.length > 0 ? (
                  <ul id="kboten-player-options" role="listbox" aria-label="검색된 선수">
                    {searchResults.map((player, index) => (
                      <li key={player.id} role="presentation">
                        <button
                          id={`kboten-option-${player.id}`}
                          type="button"
                          role="option"
                          aria-selected={index === activeIndex}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => submitPlayer(player)}
                          className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors ${index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                        >
                          <span className="font-black">{player.name}</span>
                          <span className="text-xs font-semibold text-muted-foreground">{player.detail}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-4 text-sm font-semibold text-muted-foreground">검색 결과가 없어요.</p>
                )}
              </div>
            ) : null}
          </div>
          <div className={`mx-auto mt-3 flex min-h-11 max-w-xl items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition-colors ${feedback.kind === "correct" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : feedback.kind === "wrong" ? "bg-rose-500/12 text-rose-700 dark:text-rose-300" : "text-muted-foreground"}`} aria-live="polite">
            {feedback.kind === "correct" ? <CheckCircle2 className="size-5" /> : feedback.kind === "wrong" ? <XCircle className="size-5" /> : null}
            {message}
          </div>

          <ol className="mt-5 grid gap-2 sm:grid-cols-2">
            {puzzle.answers.map((answer) => {
              const found = correctNames.includes(answer.name);
              const revealed = found || finished;
              return (
                <li key={answer.rank} className={`relative flex min-h-16 items-center gap-4 overflow-hidden rounded-2xl border px-4 py-3 transition-colors ${found ? "border-emerald-500/40 bg-emerald-500/10" : revealed ? "border-foreground/10 bg-muted/65" : "border-foreground/10 bg-background"} ${feedback.kind === "correct" && feedback.playerName === answer.name ? "kboten-correct-pop" : ""}`}>
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
