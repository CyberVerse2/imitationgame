import { create } from 'zustand';

interface Player {
  id: string;
  role: 'interrogator' | 'human';
}

interface GameState {
  // Connection
  playerId: string | null;
  gameId: string | null;
  role: 'interrogator' | 'human' | null;
  status: 'idle' | 'matchmaking' | 'waiting' | 'playing' | 'guessing' | 'finished';
  
  // Game data
  currentRound: number;
  totalRounds: number;
  humanSlot: 'A' | 'B' | null;
  
  // Messages per round: { round: { participantA: string, participantB: string } }
  messages: Record<number, { 
    question: string; 
    participantA: string | null; 
    participantB: string | null;
    revealed: boolean;
  }>;
  
  // Current round state
  currentQuestion: string;
  myAnswer: string;
  waitingForOther: boolean;
  
  // Results  
  guess: 'A' | 'B' | null;
  isCorrect: boolean | null;
  score: number;
  
  // Actions
  setPlayer: (id: string) => void;
  setRole: (role: 'interrogator' | 'human') => void;
  startMatchmaking: () => void;
  joinGame: (gameId: string, humanSlot: 'A' | 'B') => void;
  setQuestion: (q: string) => void;
  setMyAnswer: (a: string) => void;
  addRoundMessages: (round: number, question: string, a: string, b: string) => void;
  nextRound: () => void;
  makeGuess: (guess: 'A' | 'B') => void;
  setResult: (isCorrect: boolean, score: number) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  playerId: null,
  gameId: null,
  role: null,
  status: 'idle',
  currentRound: 1,
  totalRounds: 3,
  humanSlot: null,
  messages: {},
  currentQuestion: '',
  myAnswer: '',
  waitingForOther: false,
  guess: null,
  isCorrect: null,
  score: 0,

  setPlayer: (id) => set({ playerId: id }),
  
  setRole: (role) => set({ role }),
  
  startMatchmaking: () => set({ status: 'matchmaking' }),
  
  joinGame: (gameId, humanSlot) => set({ 
    gameId, 
    humanSlot, 
    status: 'playing',
    currentRound: 1,
  }),
  
  setQuestion: (q) => set({ currentQuestion: q }),
  
  setMyAnswer: (a) => set({ myAnswer: a }),
  
  addRoundMessages: (round, question, a, b) => set((state) => ({
    messages: {
      ...state.messages,
      [round]: { question, participantA: a, participantB: b, revealed: true },
    },
  })),
  
  nextRound: () => {
    const { currentRound, totalRounds } = get();
    if (currentRound >= totalRounds) {
      set({ status: 'guessing' });
    } else {
      set({ 
        currentRound: currentRound + 1,
        currentQuestion: '',
        myAnswer: '',
        waitingForOther: false,
      });
    }
  },
  
  makeGuess: (guess) => set({ guess, status: 'finished' }),
  
  setResult: (isCorrect, score) => set({ isCorrect, score }),
  
  reset: () => set({
    gameId: null,
    role: null,
    status: 'idle',
    currentRound: 1,
    humanSlot: null,
    messages: {},
    currentQuestion: '',
    myAnswer: '',
    waitingForOther: false,
    guess: null,
    isCorrect: null,
    score: 0,
  }),
}));
