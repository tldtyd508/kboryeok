import { create } from 'zustand';
import { Player } from '@/lib/types';
import { compareGuess, JudgementResult } from '@/lib/utils';

const MAX_GUESSES = 8;
interface GameState {
  players: Player[];
  dailyPuzzles: Record<string, number>;
  secretPlayer: Player | null;
  guesses: Player[];
  results: JudgementResult[];
  gameStatus: 'playing' | 'won' | 'lost';
  isDataLoading: boolean;
  error: string | null;
  actions: {
    fetchDataAndStartGame: () => Promise<void>;
    addGuess: (player: Player) => void;
    restartGame: () => void; // 다시 시작 액션 추가
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  players: [],
  dailyPuzzles: {},
  secretPlayer: null,
  guesses: [],
  results: [],
  gameStatus: 'playing',
  isDataLoading: false,
  error: null,
  actions: {
    fetchDataAndStartGame: async () => {
      if (get().players.length > 0) return;

      set({ isDataLoading: true, error: null });
      try {
        const [playerResponse, puzzleResponse] = await Promise.all([
          fetch('/players.json'),
          fetch('/daily_puzzles.json')
        ]);

        if (!playerResponse.ok) throw new Error('선수 명단 로딩 실패');
        if (!puzzleResponse.ok) throw new Error('오늘의 문제 로딩 실패');

        const players = await playerResponse.json();
        const dailyPuzzles = await puzzleResponse.json();

        const todayKst = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());
        const secretPlayerId = dailyPuzzles[todayKst];
        const secretPlayer = players.find((p: Player) => p.id === secretPlayerId);

        if (secretPlayer) {
          set({
            players,
            dailyPuzzles,
            secretPlayer,
            guesses: [],
            results: [],
            gameStatus: 'playing',
            isDataLoading: false,
          });
        } else {
          throw new Error("오늘의 선수를 찾을 수 없습니다.");
        }

      } catch (error) {
        set({ error: (error as Error).message, isDataLoading: false });
      }
    },
    addGuess: (guess) => {
      const { secretPlayer, guesses, results } = get();
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
    },
    restartGame: () => {
      // 정답 선수는 바꾸지 않고, 추측 기록만 리셋
      set({
        guesses: [],
        results: [],
        gameStatus: 'playing',
      });
    },
  },
}));
