import { create } from 'zustand';
import { Player } from '@/lib/types';
import { compareGuess, JudgementResult } from '@/lib/utils';
import { getKstDateKey, loadDailyPlayerGame, saveDailyPlayerGame } from '@/lib/daily-progress';

const MAX_GUESSES = 8;
interface GameState {
  players: Player[];
  dailyPuzzles: Record<string, number>;
  activeDate: string | null;
  secretPlayer: Player | null;
  guesses: Player[];
  results: JudgementResult[];
  gameStatus: 'playing' | 'won' | 'lost';
  isDataLoading: boolean;
  error: string | null;
  actions: {
    fetchDataAndStartGame: (dateKey?: string) => Promise<void>;
    addGuess: (player: Player) => void;
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  players: [],
  dailyPuzzles: {},
  activeDate: null,
  secretPlayer: null,
  guesses: [],
  results: [],
  gameStatus: 'playing',
  isDataLoading: false,
  error: null,
  actions: {
    fetchDataAndStartGame: async (dateKey) => {
      const targetDate = dateKey ?? getKstDateKey();
      if (get().players.length > 0 && get().activeDate === targetDate) return;

      set({ isDataLoading: true, error: null });
      try {
        let { players, dailyPuzzles } = get();
        if (players.length === 0) {
          const [playerResponse, puzzleResponse] = await Promise.all([
            fetch('/players.json'),
            fetch('/daily_puzzles.json')
          ]);

          if (!playerResponse.ok) throw new Error('선수 명단 로딩 실패');
          if (!puzzleResponse.ok) throw new Error('오늘의 문제 로딩 실패');

          players = await playerResponse.json();
          dailyPuzzles = await puzzleResponse.json();
        }

        const secretPlayerId = dailyPuzzles[targetDate];
        const secretPlayer = players.find((p: Player) => p.id === secretPlayerId);

        if (secretPlayer) {
          const storedGame = loadDailyPlayerGame(targetDate);
          const storedIds = storedGame?.guessIds.slice(0, MAX_GUESSES) ?? [];
          const guesses = storedIds
            .map((id) => players.find((player: Player) => player.id === id))
            .filter((player): player is Player => Boolean(player));
          const results = guesses.map((guess) => compareGuess(secretPlayer, guess));
          const hasCorrectGuess = results.some((result) => result.isCorrect);
          const gameStatus: GameState['gameStatus'] = hasCorrectGuess
            ? 'won'
            : guesses.length >= MAX_GUESSES
              ? 'lost'
              : 'playing';

          set({
            players,
            dailyPuzzles,
            activeDate: targetDate,
            secretPlayer,
            guesses,
            results,
            gameStatus,
            isDataLoading: false,
          });
        } else {
          throw new Error("선택한 날짜의 선수를 찾을 수 없습니다.");
        }

      } catch (error) {
        set({ error: (error as Error).message, isDataLoading: false });
      }
    },
    addGuess: (guess) => {
      const { secretPlayer, guesses, results, activeDate } = get();
      if (!secretPlayer || get().gameStatus !== 'playing') return;

      const result = compareGuess(secretPlayer, guess);
      const newGuesses = [...guesses, guess];
      const newResults = [...results, result];

      let newGameStatus: GameState['gameStatus'] = 'playing';
      if (result.isCorrect) {
        newGameStatus = 'won';
      } else if (newGuesses.length >= MAX_GUESSES) {
        newGameStatus = 'lost';
      }

      set({ guesses: newGuesses, results: newResults, gameStatus: newGameStatus });

      saveDailyPlayerGame(
        newGuesses.map((player) => player.id),
        newGameStatus,
        activeDate ?? getKstDateKey(),
      );
    },
  },
}));
