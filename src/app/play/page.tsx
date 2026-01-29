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
  
  const [isPolling, setIsPolling] = useState(true);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [waitingForReveal, setWaitingForReveal] = useState(false);
  const [guess, setGuess] = useState<'A' | 'B' | null>(null);
  const [result, setResultState] = useState<{ isCorrect: boolean; humanSlot: string } | null>(null);

  // Generate consistent random names for participants
  const participantNames = useMemo(() => {
    if (!gameId) return { nameA: 'Alex', nameB: 'Jordan' };
    return getGameNames(gameId);
  }, [gameId]);

  // Matchmaking polling
  const pollMatchmaking = useCallback(async () => {
    if (!playerId || !role) {
      router.push('/');
      return;
    }

    try {
      // Try to join queue if not already matched
      if (status === 'matchmaking') {
        const joinRes = await fetch('/api/matchmaking/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            playerId, 
            role: role.toUpperCase() 
          }),
        });
        const joinData = await joinRes.json();
        
        if (joinData.status === 'matched') {
          joinGame(joinData.gameId, joinData.humanSlot);
          setIsPolling(false);
          return;
        }
      }
      
      // Check status
      const statusRes = await fetch(`/api/matchmaking/status?playerId=${playerId}`);
      const statusData = await statusRes.json();
      
      if (statusData.status === 'matched') {
        joinGame(statusData.gameId, statusData.humanSlot);
        setIsPolling(false);
      }
    } catch (error) {
      console.error('Matchmaking error:', error);
    }
  }, [playerId, role, status, joinGame, router]);

  useEffect(() => {
    if (!playerId) {
      router.push('/');
      return;
    }

    if (status === 'matchmaking' && isPolling) {
      const interval = setInterval(pollMatchmaking, 2000);
      pollMatchmaking(); // Initial call
      return () => clearInterval(interval);
    }
  }, [playerId, status, isPolling, pollMatchmaking, router]);

  // Unified Game Loop
  useEffect(() => {
    if (status !== 'playing' || !gameId) return;

    const pollGameLoop = async () => {
      try {
        // Fetch everything in parallel
        const [msgRes, statusRes] = await Promise.all([
          fetch(`/api/game/message?gameId=${gameId}&round=${currentRound}`),
          fetch(`/api/game/status?gameId=${gameId}`),
        ]);
        const messagesData = await msgRes.json();
        const statusData = await statusRes.json();

        // 1. Sync Game Status & Round
        // If status changed to FINISHED
        if (statusData.status === 'FINISHED') {
          setResultState({ isCorrect: false, humanSlot: statusData.humanSlot });
          useGameStore.setState({ status: 'finished' });
          return;
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
    
    try {
      await fetch('/api/game/message', {
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
      
      setWaitingForReveal(true);
    } catch (error) {
      console.error('Submit question error:', error);
    }
  };

  // Submit answer (human)
  const submitAnswer = async () => {
    if (!answer.trim() || !gameId || !playerId) return;
    
    try {
      await fetch('/api/game/message', {
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
      
      setWaitingForReveal(true);
    } catch (error) {
      console.error('Submit answer error:', error);
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
  const goHome = () => {
    reset();
    router.push('/');
  };

  // Render based on status
  if (status === 'matchmaking') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <div className="text-6xl mb-6">🔎</div>
          <h1 className="text-3xl font-bold mb-4">Finding Match...</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            Looking for {role === 'interrogator' ? 'a human player' : 'an interrogator'}
          </p>
          <div className="typing-indicator justify-center">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <button className="btn btn-secondary mt-8" onClick={goHome}>
            Cancel
          </button>
        </div>
      </main>
    );
  }

  if (status === 'playing') {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <span className="text-sm text-[var(--text-secondary)]">Playing as</span>
              <h2 className="text-2xl font-bold text-[var(--neon-cyan)]">
                {role === 'interrogator' ? '🔍 Interrogator' : '🧑 Human'}
              </h2>
            </div>
            
            <GameProgress currentRound={currentRound} totalRounds={totalRounds} />
            
            <div className="flex items-center gap-4">
              {/* Early Guess button - only for interrogator after at least 1 round */}
              {role === 'interrogator' && Object.keys(messages).length > 0 && (
                <button
                  className="btn btn-secondary text-sm py-2 px-4"
                  onClick={() => useGameStore.setState({ status: 'guessing' })}
                  disabled={waitingForReveal}
                >
                  🎯 Make Guess
                </button>
              )}
              
              <Timer 
                duration={45} 
                isActive={!waitingForReveal && status === 'playing'} 
                size={70}
              />
            </div>
          </div>
          
          {/* Game ID for debugging */}
          <div className="text-center mb-4">
            <span className="text-xs text-[var(--text-secondary)] font-mono opacity-50">
              Game: {gameId?.slice(-8)}
            </span>
          </div>

          {/* Chat panels */}
          <div className="chat-container mb-8">
            {/* Participant A */}
            <div className="participant-panel participant-a">
              <h3 className="text-lg font-semibold mb-4 text-[var(--neon-cyan)]">
                {participantNames.nameA}
              </h3>
              <div className="flex-1 overflow-y-auto space-y-4">
                {Object.entries(messages).map(([round, msg]) => (
                  <div key={round}>
                    <div className="message-bubble question-bubble">
                      <span className="text-sm text-[var(--neon-cyan)]">Q:</span> {msg.question}
                    </div>
                    {msg.participantA && (
                      <div className="message-bubble answer-bubble">
                        {msg.participantA}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Participant B */}
            <div className="participant-panel participant-b">
              <h3 className="text-lg font-semibold mb-4 text-[var(--neon-magenta)]">
                {participantNames.nameB}
              </h3>
              <div className="flex-1 overflow-y-auto space-y-4">
                {Object.entries(messages).map(([round, msg]) => (
                  <div key={round}>
                    <div className="message-bubble question-bubble">
                      <span className="text-sm text-[var(--neon-cyan)]">Q:</span> {msg.question}
                    </div>
                    {msg.participantB && (
                      <div className="message-bubble answer-bubble">
                        {msg.participantB}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Input area */}
          {role === 'interrogator' ? (
            <div>
              {!waitingForReveal && Object.keys(messages).length === 0 && (
                <QuestionSuggestions 
                  onSelect={(text) => setQuestion(text)} 
                  disabled={waitingForReveal}
                />
              )}
              <div className="flex gap-4">
                <input
                  className="input flex-1"
                  placeholder="Ask a question to both participants..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={waitingForReveal}
                  onKeyDown={(e) => e.key === 'Enter' && submitQuestion()}
                />
                <button
                  className="btn btn-primary"
                  onClick={submitQuestion}
                  disabled={!question.trim() || waitingForReveal}
                >
                  {waitingForReveal ? 'Waiting...' : 'Send'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {question ? (
                <>
                  {/* Show the question to human */}
                  <div className="message-bubble question-bubble mb-4">
                    <span className="text-sm text-[var(--neon-cyan)]">Question:</span> {question}
                  </div>
                  <div className="flex gap-4">
                    <input
                      className="input flex-1"
                      placeholder="Write your answer naturally..."
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      disabled={waitingForReveal}
                      onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                    />
                    <button
                      className="btn btn-magenta"
                      onClick={submitAnswer}
                      disabled={!answer.trim() || waitingForReveal}
                    >
                      {waitingForReveal ? 'Waiting...' : 'Submit'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center w-full py-4 text-[var(--text-secondary)] pulse">
                  Waiting for interrogator&apos;s question...
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
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-lg">
          <h1 className="text-4xl font-bold mb-6">Time to Guess!</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            {role === 'interrogator' 
              ? 'Which participant is the HUMAN?' 
              : 'Waiting for interrogator to guess...'}
          </p>
          
          {role === 'interrogator' && (
            <div className="grid grid-cols-2 gap-6 mb-8">
              <button
                className={`role-card ${guess === 'A' ? 'selected' : ''}`}
                onClick={() => setGuess('A')}
              >
                <div className="text-3xl mb-2">🧑</div>
                <span className="text-sm text-[var(--neon-cyan)]">{participantNames.nameA}</span>
              </button>
              <button
                className={`role-card ${guess === 'B' ? 'selected' : ''}`}
                onClick={() => setGuess('B')}
              >
                <div className="text-3xl mb-2">🧑</div>
                <span className="text-sm text-[var(--neon-magenta)]">{participantNames.nameB}</span>
              </button>
            </div>
          )}
          
          {role === 'interrogator' && (
            <button
              className="btn btn-primary"
              onClick={submitGuess}
              disabled={!guess}
            >
              Confirm Guess
            </button>
          )}
        </div>
      </main>
    );
  }

  if (status === 'finished' && result) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-lg card">
          <div className="text-6xl mb-6">
            {role === 'interrogator' 
              ? (result.isCorrect ? '🎉' : '😔')
              : (!result.isCorrect ? '🎭' : '😬')}
          </div>
          <h1 className="text-4xl font-bold mb-4">
            {role === 'interrogator'
              ? (result.isCorrect ? 'Correct!' : 'Wrong!')
              : (!result.isCorrect ? 'You Fooled Them!' : 'You were caught!')}
          </h1>
          <p className="text-[var(--text-secondary)] mb-6">
            The human was <strong className="text-[var(--neon-cyan)]">{result.humanSlot === 'A' ? participantNames.nameA : participantNames.nameB}</strong>
          </p>
          <button className="btn btn-primary" onClick={goHome}>
            Play Again
          </button>
        </div>
      </main>
    );
  }

  // Default loading state
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </main>
  );
}
