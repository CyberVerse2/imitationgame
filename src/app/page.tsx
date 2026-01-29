'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'interrogator' | 'human' | null>(null);
  const [username, setUsername] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const { setPlayer, setRole, startMatchmaking } = useGameStore();

  // Load existing username on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const handlePlay = async () => {
    if (!selectedRole) return;
    
    setIsRegistering(true);
    
    try {
      // Generate or get player ID
      let playerId = localStorage.getItem('playerId');
      if (!playerId) {
        playerId = uuidv4();
        localStorage.setItem('playerId', playerId);
      }
      
      // Save username locally
      if (username.trim()) {
        localStorage.setItem('username', username.trim());
      }
      
      // Register user in database
      await fetch('/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          username: username.trim() || null,
        }),
      });
      
      setPlayer(playerId);
      setRole(selectedRole);
      startMatchmaking();
      router.push('/play');
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-bold mb-4">
          <span className="text-[var(--neon-cyan)] glow-text">Imitation</span>{' '}
          <span className="text-[var(--neon-magenta)] glow-text">Game</span>
        </h1>
        <p className="text-xl text-[var(--text-secondary)] max-w-xl mx-auto">
          The classic Turing test. One human, one AI called <strong className="text-[var(--neon-cyan)]">Turing</strong> pretending to be human.
          Can the interrogator tell them apart?
        </p>
      </div>

      {/* Username Input */}
      <div className="w-full max-w-md mb-8">
        <label className="block text-sm text-[var(--text-secondary)] mb-2">
          Your name (for leaderboard)
        </label>
        <input
          className="input w-full"
          placeholder="Enter your username..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={20}
        />
      </div>

      {/* Role Selection */}
      <div className="w-full max-w-2xl mb-8">
        <h2 className="text-2xl font-semibold text-center mb-6">Choose your role</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Interrogator */}
          <div
            className={`role-card ${selectedRole === 'interrogator' ? 'selected' : ''}`}
            onClick={() => setSelectedRole('interrogator')}
          >
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-bold mb-2 text-[var(--neon-cyan)]">Interrogator</h3>
            <p className="text-[var(--text-secondary)] text-sm">
              Ask questions to two participants. One is human, one is AI pretending to be human.
              <br /><strong>Find the real human.</strong>
            </p>
          </div>

          {/* Human */}
          <div
            className={`role-card ${selectedRole === 'human' ? 'selected' : ''}`}
            onClick={() => setSelectedRole('human')}
          >
            <div className="text-4xl mb-4">🧑</div>
            <h3 className="text-xl font-bold mb-2 text-[var(--neon-magenta)]">Human</h3>
            <p className="text-[var(--text-secondary)] text-sm">
              Just be yourself! Answer questions naturally.
              <br /><strong>Prove you&apos;re human.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Play Button */}
      <button
        className={`btn btn-primary text-xl px-12 py-4 ${!selectedRole || isRegistering ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handlePlay}
        disabled={!selectedRole || isRegistering}
      >
        {isRegistering ? 'Connecting...' : 'Find Match'}
      </button>

      {/* Links */}
      <div className="mt-6 flex gap-6">
        <button
          className="text-sm text-[var(--neon-purple)] hover:underline"
          onClick={() => router.push('/leaderboard')}
        >
          🏆 Leaderboard
        </button>
      </div>

      {/* Rules */}
      <div className="mt-12 max-w-lg text-center">
        <h3 className="text-lg font-semibold mb-3 text-[var(--neon-purple)]">How it works</h3>
        <ol className="text-sm text-[var(--text-secondary)] space-y-2 text-left">
          <li><span className="text-[var(--neon-cyan)]">1.</span> Interrogator asks a question</li>
          <li><span className="text-[var(--neon-cyan)]">2.</span> Human answers naturally</li>
          <li><span className="text-[var(--neon-cyan)]">3.</span> Turing (AI) responds, pretending to be human</li>
          <li><span className="text-[var(--neon-cyan)]">4.</span> Both answers revealed simultaneously</li>
          <li><span className="text-[var(--neon-cyan)]">5.</span> After 5 rounds, interrogator guesses who&apos;s human</li>
        </ol>
      </div>
    </main>
  );
}
