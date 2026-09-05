import React, { useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { useGameStore } from "@/lib/store";
import { Player } from "@/lib/types";
import { Input } from "@/components/ui/input";

function normalizeName(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/[\s.·_-]/g, "");
}

const PlayerSearch = () => {
  const { players, guesses, actions } = useGameStore();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const isComposingRef = useRef(false);
  const lastSubmissionAtRef = useRef(0);

  const fuse = useMemo(() => new Fuse(players, {
    keys: ["name", "nameNorm", "aliases"],
    threshold: 0.35,
    ignoreLocation: true,
  }), [players]);
  const guessedIds = useMemo(() => new Set(guesses.map((player) => player.id)), [guesses]);

  const results = useMemo<Player[]>(() => {
    const normalizedQuery = normalizeName(query);
    if (!normalizedQuery) return [];
    const available = players.filter((player) => !guessedIds.has(player.id));
    const directMatches = available
      .filter((player) => [player.name, ...(player.aliases ?? [])]
        .some((name) => normalizeName(name).includes(normalizedQuery)))
      .sort((a, b) => {
        const aName = normalizeName(a.name);
        const bName = normalizeName(b.name);
        const prefixDifference = Number(bName.startsWith(normalizedQuery)) - Number(aName.startsWith(normalizedQuery));
        if (prefixDifference !== 0) return prefixDifference;
        return aName.indexOf(normalizedQuery) - bName.indexOf(normalizedQuery) || a.name.localeCompare(b.name, "ko-KR");
      });
    if (directMatches.length >= 6 || normalizedQuery.length < 2) return directMatches.slice(0, 6);
    const directIds = new Set(directMatches.map((player) => player.id));
    const fuzzyMatches = fuse.search(normalizedQuery)
      .map((result) => result.item)
      .filter((player) => !guessedIds.has(player.id) && !directIds.has(player.id));
    return [...directMatches, ...fuzzyMatches].slice(0, 6);
  }, [fuse, guessedIds, players, query]);

  const handleSelect = (player: Player) => {
    const submittedAt = performance.now();
    if (submittedAt - lastSubmissionAtRef.current < 300) return;
    lastSubmissionAtRef.current = submittedAt;
    actions.addGuess(player);
    setQuery("");
    setActiveIndex(0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposingRef.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const normalizedQuery = normalizeName(event.currentTarget.value);
      const exactMatch = results.find((player) => [player.name, ...(player.aliases ?? [])]
        .some((name) => normalizeName(name) === normalizedQuery));
      handleSelect(activeIndex === 0 ? exactMatch ?? results[0] : results[activeIndex] ?? results[0]);
    } else if (event.key === "Escape") {
      setQuery("");
      setActiveIndex(0);
    }
  };

  return (
    <div className="relative w-full">
      <Input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={() => { isComposingRef.current = false; }}
        onKeyDown={handleKeyDown}
        placeholder="선수 이름을 입력하세요..."
        aria-label="선수 이름 검색"
        aria-autocomplete="list"
        aria-controls="daily-player-options"
        aria-expanded={isFocused && query.trim().length > 0}
        aria-activedescendant={results[activeIndex] ? `daily-player-option-${results[activeIndex].id}` : undefined}
        role="combobox"
        autoComplete="off"
        className="w-full"
      />
      {isFocused && query.trim().length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-card shadow-lg">
          {results.length > 0 ? (
            <ul id="daily-player-options" role="listbox" aria-label="검색된 선수">
              {results.map((player, index) => (
                <li key={player.id} role="presentation">
                  <button
                    id={`daily-player-option-${player.id}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(player)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent"}`}
                  >
                    <span className="font-bold">{player.name}</span>
                    <span className="text-xs font-semibold text-muted-foreground">{player.team} · {player.positionDetail}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm font-semibold text-muted-foreground">현재 선수 명단에서 찾지 못했어요.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerSearch;
