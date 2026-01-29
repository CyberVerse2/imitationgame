'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { shareResults } from '@/lib/share';

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const isCorrect = searchParams.get('correct') === 'true';
  const score = parseInt(searchParams.get('score') || '0');
  const humanSlot = searchParams.get('humanSlot') || 'A';
  const guess = searchParams.get('guess') || 'A';
  
  const [shareMessage, setShareMessage] = useState('');
  
  const handleShare = async () => {
    const result = await shareResults(isCorrect, score, 1, score);
    if (result.success) {
      setShareMessage(result.method === 'share' ? 'Shared!' : 'Copied to clipboard!');
      setTimeout(() => setShareMessage(''), 3000);
    }
  };
  
  const handlePlayAgain = () => {
    router.push('/');
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="card max-w-md w-full text-center">
        {/* Emoji */}
        <div className="text-6xl mb-6">
          {isCorrect ? '🎉' : '🤖'}
        </div>
        
        {/* Result text */}
        <h1 className="text-3xl font-bold mb-4">
          {isCorrect 
            ? 'You spotted the human!' 
            : 'The AI fooled you!'}
        </h1>
        
        {/* Reveal */}
        <div className="bg-[var(--dark-bg)] rounded-lg p-4 mb-6">
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            Your guess: <span className="text-white">Participant {guess}</span>
          </p>
          <p className="text-sm">
            The human was: 
            <span className={`ml-2 font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              Participant {humanSlot}
            </span>
          </p>
        </div>
        
        {/* Score */}
        <div className="text-5xl font-bold text-[var(--neon-cyan)] mb-2">
          +{score}
        </div>
        <p className="text-[var(--text-secondary)] mb-8">points earned</p>
        
        {/* Actions */}
        <div className="flex gap-4 justify-center flex-wrap">
          <button className="btn btn-primary" onClick={handlePlayAgain}>
            Play Again
          </button>
          <button className="btn btn-secondary" onClick={handleShare}>
            {shareMessage || 'Share Results'}
          </button>
        </div>
        
        {/* Leaderboard link */}
        <button 
          className="mt-6 text-sm text-[var(--neon-purple)] hover:underline"
          onClick={() => router.push('/leaderboard')}
        >
          View Leaderboard →
        </button>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
