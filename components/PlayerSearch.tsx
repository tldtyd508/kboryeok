
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Fuse, { type FuseResult } from 'fuse.js';
import { useGameStore } from '@/lib/store';
import { Player } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';

const PlayerSearch = () => {
  const { players, actions } = useGameStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FuseResult<Player>[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 200);
  const resultContainerRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(() => new Fuse(players, {
    keys: ['name', 'nameNorm', 'aliases'],
    threshold: 0.4,
    includeScore: true,
    ignoreLocation: true,
  }), [players]);

  useEffect(() => {
    if (debouncedQuery.length > 1) {
      const searchResults = fuse.search(debouncedQuery);
      setResults(searchResults.slice(0, 5)); // Show top 5 results
    } else {
      setResults([]);
    }
    setActiveIndex(-1); // Reset active index on new query
  }, [debouncedQuery, fuse]);

  const handleSelect = (player: Player) => {
    actions.addGuess(player);
    setQuery('');
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        handleSelect(results[activeIndex].item);
      }
    } else if (e.key === 'Escape') {
      setResults([]);
    }
  };

  return (
    <div className="relative w-full">
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="선수 이름을 입력하세요..."
        className="w-full"
      />
      {results.length > 0 && (
        <div ref={resultContainerRef} className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg">
          <ul>
            {results.map((result, index) => (
              <li
                key={result.item.id}
                onClick={() => handleSelect(result.item)}
                className={`px-3 py-2 cursor-pointer hover:bg-accent ${index === activeIndex ? 'bg-accent' : ''}`}>
                {result.item.name} - {result.item.team}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PlayerSearch;
