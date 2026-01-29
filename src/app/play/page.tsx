'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/store';
import Timer from '@/components/Timer';
import QuestionSuggestions from '@/components/QuestionSuggestions';
import GameProgress from '@/components/GameProgress';
import { calculateScore } from '@/lib/scoring';
import { shareResults } from '@/lib/share';
import { getGameNames } from '@/lib/names';

export default function PlayPage() {
  const router = useRouter();
  const { 
    playerId, 
    role, 
    status, 
    gameId, 
    humanSlot, 
    currentRound, 
    totalRounds,
    messages,
    joinGame,
    addRoundMessages,
    nextRound,
    setResult,
    reset,
  } = useGameStore();
  
  const [isClient, setIsClient] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [waitingForReveal, setWaitingForReveal] = useState(false);
  const [guess, setGuess] = useState<'A' | 'B' | null>(null);
  const [result, setResultState] = useState<{ isCorrect: boolean; humanSlot: string; score?: number; isAborted?: boolean; guess?: string } | null>(null);

  // New states for matchmaking refactor
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [searchTimeLeft, setSearchTimeLeft] = useState(30);
  const [searchCancelled, setSearchCancelled] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
    
    // Restore Player ID
    let currentId = playerId;
    if (!currentId) {
      currentId = localStorage.getItem('imitation_player_id') || `p_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem('imitation_player_id', currentId);
      useGameStore.setState({ playerId: currentId });
    }

    // Restore Role (for page refreshes)
    if (!role) {
      const storedRole = localStorage.getItem('imitation_role') as 'interrogator' | 'human' | null;
      if (storedRole) {
        useGameStore.setState({ role: storedRole, status: 'matchmaking' });
      }
    }
  }, [playerId, role]);

  // Generate consistent random names for participants
  const participantNames = useMemo(() => {
    if (!gameId) return { nameA: 'Alex', nameB: 'Jordan' };
    return getGameNames(gameId);
  }, [gameId]);

  // Humans: Search for games
  const searchForGames = useCallback(async () => {
    if (role !== 'human' || status !== 'matchmaking' || searchCancelled) return;

    try {
      const res = await fetch('/api/matchmaking/search');
      const data = await res.json();
      setAvailableGames(data.games || []);
    } catch (error) {
      console.error('Search error:', error);
    }
  }, [role, status, searchCancelled]);

  // Humans: Join a specific game
  const handleJoinGame = async (selectedGameId: string) => {
    if (isJoining) return;
    setIsJoining(true);
    try {
      const res = await fetch('/api/matchmaking/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          role: 'HUMAN',
          gameId: selectedGameId
        }),
      });
      const data = await res.json();
      if (data.status === 'matched') {
        joinGame(data.gameId, data.humanSlot);
      } else {
        alert(data.error || 'Failed to join game');
        // Refresh searches
        searchForGames();
      }
    } catch (error) {
      console.error('Join error:', error);
    } finally {
      setIsJoining(false);
    }
  };

  // Matchmaking logic
  const pollMatchmaking = useCallback(async () => {
    if (!playerId || !role) {
      router.push('/');
      return;
    }

    try {
      // INTERROGATOR FLOW
      if (role === 'interrogator') {
        if (status === 'matchmaking') {
          // Initialize/Create game
          const joinRes = await fetch('/api/matchmaking/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, role: 'INTERROGATOR' }),
          });
          const joinData = await joinRes.json();
          
          if (joinData.status === 'waiting' || joinData.status === 'matched') {
            useGameStore.setState({ 
              status: joinData.status === 'matched' ? 'playing' : 'waiting',
              gameId: joinData.gameId,
              humanSlot: joinData.humanSlot || null
            });
          }
        }
        
        if (status === 'waiting') {
          // Poll for human join
          const statusRes = await fetch(`/api/matchmaking/status?playerId=${playerId}`, { cache: 'no-store' });
          const statusData = await statusRes.json();
          
          if (statusData.status === 'matched') {
            joinGame(statusData.gameId, statusData.humanSlot);
          }
        }
      } 
      
      // HUMAN FLOW
      if (role === 'human') {
        if (status === 'matchmaking') {
          // Humans just search. This is handled by a separate interval below.
          // But we can check if we were already matched (e.g. page refresh)
          const statusRes = await fetch(`/api/matchmaking/status?playerId=${playerId}`, { cache: 'no-store' });
          const statusData = await statusRes.json();
          if (statusData.status === 'matched') {
            joinGame(statusData.gameId, statusData.humanSlot);
          }
        }
      }
    } catch (error) {
      console.error('Matchmaking loop error:', error);
    }
  }, [playerId, role, status, joinGame, router]);

  // Main Matchmaking Interval
  useEffect(() => {
    if (!playerId) return;

    if (status === 'matchmaking' || status === 'waiting') {
      const interval = setInterval(pollMatchmaking, 2000);
      pollMatchmaking();
      return () => clearInterval(interval);
    }
  }, [playerId, status, pollMatchmaking]);

  // Human Search Interval & Timer
  useEffect(() => {
    if (role !== 'human' || status !== 'matchmaking' || searchCancelled) return;

    const searchInterval = setInterval(searchForGames, 3000);
    searchForGames();

    const timerInterval = setInterval(() => {
      setSearchTimeLeft((prev) => {
        if (prev <= 1) {
          // Only cancel if we aren't currently JOINING a game
          if (!isJoining) {
            setSearchCancelled(true);
            clearInterval(timerInterval);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(searchInterval);
      clearInterval(timerInterval);
    };
  }, [role, status, searchCancelled, searchForGames]);

  // Unified Game Loop
  useEffect(() => {
    if (status !== 'playing' || !gameId) return;

    const pollGameLoop = async () => {
      try {
        // Fetch everything in parallel
        const [msgRes, statusRes] = await Promise.all([
          fetch(`/api/game/message?gameId=${gameId}&round=${currentRound}`, { cache: 'no-store' }),
          fetch(`/api/game/status?gameId=${gameId}`, { cache: 'no-store' }),
        ]);
        const messagesData = await msgRes.json();
        const statusData = await statusRes.json();

        // 1. Sync Game Status & Round
        // If status changed to FINISHED
        if (statusData.status === 'FINISHED') {
          // Check if game was aborted (no messages exchanged OR no score/guess in statusData)
          // We now have real persistent result data in statusData
          const messageCount = Object.keys(useGameStore.getState().messages).length;
          const isAborted = messageCount === 0 || (statusData.isCorrect === null && role === 'human');

          setResultState({ 
            isCorrect: statusData.isCorrect ?? false, 
            humanSlot: statusData.humanSlot,
            score: statusData.finalScore ?? 0,
            guess: statusData.finalGuess,
            isAborted
          });
          useGameStore.setState({ status: 'finished' });
          return;
        }

        // If status changed to GUESSING
        if (statusData.status === 'GUESSING' && (status as string) !== 'guessing') {
           useGameStore.setState({ status: 'guessing' });
        }

        // Sync Round: If Server is ahead of Local, catch up
        // IMPORTANT: This creates the "lock step" - Human waits for Server to update
        if (statusData.currentRound > currentRound) {
           useGameStore.setState({ 
             currentRound: statusData.currentRound,
             currentQuestion: '',
             myAnswer: '',
             waitingForOther: false,
           });
           setQuestion('');
           setAnswer('');
           setWaitingForReveal(false);
           return; 
        }

        // 2. Handle Messages (Question & Reveal)
        // Update Question if we haven't seen it yet
        if (messagesData.question && !question) {
          setQuestion(messagesData.question);
        }

        // Check for Reveal
        // We look at messagesData.bothRevealed to know if round is done
        if (messagesData.bothRevealed) {
          // If we are currently "waiting" locally, this is the moment of reveal
          if (waitingForReveal) {
             addRoundMessages(currentRound, messagesData.question, messagesData.participantA, messagesData.participantB);
             setWaitingForReveal(false); 
             
             // INTERROGATOR ONLY: Drive the game forward
             if (role === 'interrogator') {
               if (currentRound >= totalRounds) {
                  useGameStore.setState({ status: 'guessing' });
               } else {
                  // Explicitly tell server to advance to next round
                  await fetch('/api/game/advance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gameId, playerId, nextRound: currentRound + 1 }),
                  });
                  // We do NOT call nextRound() locally here.
                  // We wait for the NEXT poll to see statusData.currentRound > currentRound
                  // This ensures perfect sync.
               }
             }
          }
        }
      } catch (error) {
        console.error('Game loop error:', error);
      }
    };

    const interval = setInterval(pollGameLoop, 1000); // 1s loop
    return () => clearInterval(interval);
  }, [status, gameId, role, currentRound, question, waitingForReveal, totalRounds, playerId, addRoundMessages]);





  // Submit question (interrogator)
  const submitQuestion = async () => {
    if (!question.trim() || !gameId || !playerId) return;
    
    setWaitingForReveal(true);
    try {
      const res = await fetch('/api/game/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          playerId,
          round: currentRound,
          content: question,
          type: 'question',
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to send question');
      }
    } catch (error) {
      console.error('Submit question error:', error);
      setWaitingForReveal(false);
      alert('Failed to send question. Please try again.');
    }
  };

  // Submit answer (human)
  const submitAnswer = async () => {
    if (!answer.trim() || !gameId || !playerId) return;
    
    setWaitingForReveal(true);
    try {
      const res = await fetch('/api/game/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          playerId,
          round: currentRound,
          content: answer,
          type: 'answer',
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to send answer');
      }
    } catch (error) {
      console.error('Submit answer error:', error);
      setWaitingForReveal(false);
      alert('Failed to send answer. Please try again.');
    }
  };

  // Submit guess (interrogator)
  const submitGuess = async () => {
    if (!guess || !gameId || !playerId) return;
    
    try {
      const roundsUsed = Object.keys(messages).length;  // How many rounds were completed
      const res = await fetch('/api/game/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId, guess, roundsUsed }),
      });
      
      const data = await res.json();
      setResultState(data);
      setResult(data.isCorrect, data.score);
      useGameStore.setState({ status: 'finished' });
    } catch (error) {
      console.error('Submit guess error:', error);
    }
  };

  // Leave and go home
  const goHome = useCallback(() => {
    if (playerId) {
      fetch('/api/matchmaking/join', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      }).catch(console.error);
    }
    reset();
    router.push('/');
  }, [playerId, reset, router]);

  // Default loading state for SSR/initial hydration  
  if (!isClient) {
    return (
      <main className="app-container flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-zinc-900 border-t-[var(--accent-cyan)] animate-spin"></div>
      </main>
    );
  }

  // If we're on the play page but have no role and aren't in a game, go home
  if (!role && status === 'idle') {
    router.push('/');
    return (
      <main className="app-container flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-zinc-900 border-t-[var(--accent-cyan)] animate-spin"></div>
      </main>
    );
  }

  // Render based on status
  if (status === 'matchmaking' || status === 'waiting') {
    // Human Matchmaking UI
    if (role === 'human' && status === 'matchmaking') {
      return (
        <main className="app-container">
          <div className="py-6 mb-8 border-b border-zinc-900">
            <h1 className="text-xl font-black italic tracking-tighter uppercase">Searching Registry</h1>
          </div>
          
          <div className="flex-1 animate-slide-up">
            <div className="flex justify-between items-end mb-6">
              <div>
                <div className="text-label">Signal Status</div>
                <h2 className="text-2xl font-black uppercase">Finding Games</h2>
              </div>
              <div className={`text-xl font-black ${searchTimeLeft < 10 ? 'text-[var(--accent-magenta)]' : 'text-[var(--accent-cyan)]'}`}>
                {searchTimeLeft}s
              </div>
            </div>

            {searchCancelled ? (
              <div className="card border-zinc-800 bg-zinc-950 mt-4">
                <p className="text-zinc-500 mb-6 text-sm">Registry search timed out. No active hosts found.</p>
                <button className="btn btn-primary mb-3" onClick={() => {
                  setSearchTimeLeft(30);
                  setSearchCancelled(false);
                }}>
                  Restart Scan
                </button>
                <button className="btn btn-outline" onClick={goHome}>
                  Back home
                </button>
              </div>
            ) : (
              <div className="space-y-3 no-scrollbar overflow-y-auto pr-1">
                {availableGames.length > 0 ? (
                  availableGames.map((g) => (
                    <button 
                      key={g.id} 
                      className="w-full card hover:border-[var(--accent-magenta)] flex justify-between items-center group transition-all"
                      onClick={() => handleJoinGame(g.id)}
                      disabled={isJoining}
                    >
                      <div className="text-left">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Game Cluster</div>
                        <div className="text-lg font-black group-hover:text-[var(--accent-magenta)] transition-colors">#{g.id.slice(-4)}</div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-[var(--accent-magenta)] group-hover:bg-[var(--accent-magenta)] transition-all">
                        <span className="text-white group-hover:text-black">→</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-20 text-center">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] mx-auto mb-4 animate-ping"></div>
                    <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Scanning local nodes...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {!searchCancelled && (
            <div className="mt-auto pb-8">
              <button className="btn btn-outline opacity-50" onClick={goHome}>
                Abort Scan
              </button>
            </div>
          )}
        </main>
      );
    }

    // Interrogator Waiting UI
    if (role === 'interrogator' && (status === 'matchmaking' || status === 'waiting')) {
      return (
        <main className="app-container">
          <div className="py-6 mb-8 border-b border-zinc-900">
            <h1 className="text-xl font-black italic tracking-tighter uppercase">Host Active</h1>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center animate-slide-up text-center">
            <div className="w-16 h-16 rounded-full border-4 border-zinc-900 border-t-[var(--accent-cyan)] animate-spin mb-8"></div>
            <div className="text-label mb-2">Host Identity</div>
            <h2 className="text-3xl font-black uppercase mb-4 tracking-tighter">Awaiting Client</h2>
            <p className="text-zinc-500 text-sm max-w-[240px] leading-relaxed">
              Game node successfully broadcasted. Waiting for a human participant to join.
            </p>
          </div>

          <div className="mt-auto pb-8">
            <button className="btn btn-outline" onClick={goHome}>
              Cancel Stream
            </button>
          </div>
        </main>
      );
    }
  }

  if (status === 'playing') {
    return (
      <main className="app-container no-scrollbar overflow-hidden flex flex-col h-screen">
        {/* Header */}
        <div className="py-6 border-b border-zinc-900 flex justify-between items-center shrink-0">
          <div>
            <div className="text-label">Active Node</div>
            <div className={`text-sm font-black uppercase ${role === 'interrogator' ? 'text-[var(--accent-cyan)]' : 'text-[var(--accent-magenta)]'}`}>
              {role === 'interrogator' ? '🔍 Interrogator' : '🧑 Human'}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <GameProgress currentRound={currentRound} totalRounds={totalRounds} />
            <Timer 
              duration={45} 
              isActive={!waitingForReveal && status === 'playing'} 
              size={40}
            />
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6 no-scrollbar">
          {Object.entries(messages).map(([round, msg]) => (
            <div key={round} className="space-y-4 animate-slide-up">
              {/* Question */}
              <div className="flex flex-col items-start max-w-[85%]">
                 <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-1 ml-4">Interrogator</div>
                 <div className="bubble bubble-interrogator text-sm font-medium leading-relaxed">
                   {msg.question}
                 </div>
              </div>

              {/* Answers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card card-gradient-cyan p-4">
                  <div className="text-[8px] font-black uppercase tracking-widest text-[var(--accent-cyan)] mb-2">{participantNames.nameA}</div>
                  <p className="text-xs text-zinc-300 leading-normal">{msg.participantA || '...'}</p>
                </div>
                <div className="card card-gradient-magenta p-4">
                  <div className="text-[8px] font-black uppercase tracking-widest text-[var(--accent-magenta)] mb-2">{participantNames.nameB}</div>
                  <p className="text-xs text-zinc-300 leading-normal">{msg.participantB || '...'}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Current Question from Interrogator */}
          {role === 'human' && question && !messages[currentRound] && (
            <div className="flex flex-col items-start max-w-[85%] animate-slide-up">
              <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-1 ml-4">Interrogator</div>
              <div className="bubble bubble-interrogator text-sm font-medium leading-relaxed">
                {question}
              </div>
            </div>
          )}
        </div>

        {/* Footer Input Area */}
        <div className="py-6 border-t border-zinc-900 bg-black shrink-0">
          {role === 'interrogator' ? (
            <div className="space-y-4">
              {Object.keys(messages).length === 0 && !waitingForReveal && (
                <QuestionSuggestions onSelect={(text) => setQuestion(text)} disabled={waitingForReveal} />
              )}
              <div className="flex gap-2">
                <input
                  className="input-field flex-1 text-sm py-2"
                  placeholder="Ask participants..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={waitingForReveal}
                  onKeyDown={(e) => e.key === 'Enter' && submitQuestion()}
                />
                <button 
                  className="btn btn-cyan !w-auto !py-2 px-6"
                  onClick={submitQuestion}
                  disabled={!question.trim() || waitingForReveal}
                >
                  {waitingForReveal ? '...' : 'Send'}
                </button>
              </div>
              {Object.keys(messages).length > 0 && !waitingForReveal && (
                <button className="btn btn-outline !py-2 text-[10px]" onClick={() => useGameStore.setState({ status: 'guessing' })}>
                  Jump to Guess
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {question ? (
                 <div className="flex gap-2">
                   <input
                     className="input-field flex-1 text-sm py-2"
                     placeholder="Type organic response..."
                     value={answer}
                     onChange={(e) => setAnswer(e.target.value)}
                     disabled={waitingForReveal}
                     onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                   />
                   <button 
                     className="btn btn-magenta !w-auto !py-2 px-6"
                     onClick={submitAnswer}
                     disabled={!answer.trim() || waitingForReveal}
                   >
                     {waitingForReveal ? '...' : 'Commit'}
                   </button>
                 </div>
              ) : (
                <div className="text-center py-4 bg-zinc-950 rounded-xl border border-zinc-900 italic text-zinc-600 text-xs">
                  Awaiting query from Interrogator...
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  if (status === 'guessing') {
    return (
      <main className="app-container flex flex-col h-screen">
        <div className="py-6 mb-8 border-b border-zinc-900">
          <h1 className="text-xl font-black italic tracking-tighter uppercase">Verification</h1>
        </div>

        <div className="flex-1 flex flex-col animate-slide-up">
          <div className="text-label mb-2">Final Phase</div>
          <h2 className="text-3xl font-black uppercase mb-8 leading-tight">
            {role === 'interrogator' ? 'Identify the Human' : 'Awaiting Verdict'}
          </h2>
          
          <p className="text-zinc-500 text-sm mb-8">
            {role === 'interrogator' 
              ? 'Analyze the responses below and select which node represents the organic human participant.' 
              : 'The interrogator is currently reviewing the conversation history to make a final determination.'}
          </p>

          {role === 'interrogator' && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                className={`role-card !p-8 ${guess === 'A' ? 'selected-cyan' : ''}`}
                onClick={() => setGuess('A')}
              >
                <div className="text-4xl mb-4">A</div>
                <div className="text-[10px] font-black uppercase tracking-widest">{participantNames.nameA}</div>
              </button>
              <button
                className={`role-card !p-8 ${guess === 'B' ? 'selected-magenta' : ''}`}
                onClick={() => setGuess('B')}
              >
                <div className="text-4xl mb-4">B</div>
                <div className="text-[10px] font-black uppercase tracking-widest">{participantNames.nameB}</div>
              </button>
            </div>
          )}
        </div>

        <div className="mt-auto pb-8">
          {role === 'interrogator' ? (
            <button
              className="btn btn-primary"
              onClick={submitGuess}
              disabled={!guess}
            >
              Verify Identity
            </button>
          ) : (
            <div className="w-full py-4 text-center border-2 border-zinc-900 rounded-2xl">
               <div className="w-2 h-2 rounded-full bg-[var(--accent-magenta)] mx-auto animate-ping"></div>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (status === 'finished' && result) {
    const isWin = role === 'interrogator' ? result.isCorrect : !result.isCorrect;

    return (
      <main className="app-container flex flex-col h-screen overflow-y-auto no-scrollbar">
        <div className="py-6 mb-8 border-b border-zinc-900">
           <h1 className="text-xl font-black italic tracking-tighter uppercase">Final Report</h1>
        </div>

        <div className="flex-1 flex flex-col animate-slide-up">
          {result.isAborted ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-6">🔌</div>
              <h2 className="text-3xl font-black uppercase mb-4">Node Disconnect</h2>
              <p className="text-zinc-500 text-sm mb-8">The connection was lost before a verdict could be reached.</p>
              <button className="btn btn-primary" onClick={goHome}>Back to Entry</button>
            </div>
          ) : (
            <>
              <div className="text-label mb-2">Verdict Status</div>
              <h2 className={`text-5xl font-black uppercase mb-4 ${isWin ? 'text-white' : 'text-zinc-700'}`}>
                {isWin ? 'COMPROMISED' : 'CAUGHT'}
              </h2>
              <div className="text-label mb-8">
                {role === 'interrogator' 
                  ? (result.isCorrect ? 'Human successfully identified' : 'AI deceived the examiner')
                  : (isWin ? 'You successfully deceived the interrogator' : 'Your human signature was detected')}
              </div>

              <div className="card bg-zinc-950 border-zinc-800 p-6 mb-8">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-zinc-900">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Subject Profile</span>
                  <span className={`badge ${result.humanSlot === 'A' ? 'badge-cyan' : 'badge-magenta'}`}>
                    Node {result.humanSlot}
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-xs text-zinc-500">Real Human</span>
                    <span className="text-xs font-bold uppercase">{result.humanSlot === 'A' ? participantNames.nameA : participantNames.nameB}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-zinc-500">Verdict Made</span>
                    <span className="text-xs font-bold uppercase">{result.guess === 'A' ? participantNames.nameA : participantNames.nameB}</span>
                  </div>
                  {result.score !== undefined && (
                    <div className="flex justify-between pt-4 border-t border-zinc-900">
                      <span className="text-xs text-zinc-500">Score Multiplier</span>
                      <span className="text-xs font-black text-[var(--accent-yellow)]">+{result.score} pts</span>
                    </div>
                  )}
                </div>
              </div>
              
              <button className="btn btn-primary mb-4" onClick={goHome}>Relaunch</button>
              <button className="btn btn-outline" onClick={() => router.push('/leaderboard')}>View Registry</button>
            </>
          )}
        </div>
      </main>
    );
  }

  // Default loading state
  return (
    <main className="app-container flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-zinc-900 border-t-[var(--accent-cyan)] animate-spin"></div>
    </main>
  );
}
