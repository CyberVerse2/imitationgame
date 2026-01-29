'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }
    
    setIsRegistering(true);
    
    try {
      // Use username as playerId
      const playerId = username.trim().toLowerCase().replace(/\s+/g, '_');
      
      // Save username locally
      localStorage.setItem('username', username.trim());
      
      // Register user in database
      await fetch('/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          username: username.trim(),
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
    <main className="app-container">
      {/* Header */}
      <div className="flex justify-between items-center py-6 mb-8 border-b border-zinc-900">
        <h1 className="text-xl font-black italic tracking-tighter">
          IMITATION GAME<span className="text-[var(--accent-cyan)]">.</span>
        </h1>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Online</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Hero Section */}
        <div className="mb-12 animate-slide-up">
          <div className="text-label">Game Mode: Classic</div>
          <h2 className="h1-display mb-4">
            Imitation<br />
            <span className="text-[var(--accent-magenta)]">Game</span>
          </h2>
          <p className="text-zinc-500 text-sm leading-relaxed max-w-[280px]">
            The Turing test. One human, one AI. Identify the organic signal among the noise.
          </p>
        </div>

        {/* Username Input */}
        <div className="mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="text-label">Player Identity</div>
          <input
            className="input-field"
            placeholder="Enter Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
          />
        </div>

        {/* Role Selection */}
        <div className="mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="text-label mb-4">Choose Signature</div>
          <div className="role-grid">
            <button
              className={`role-card ${selectedRole === 'interrogator' ? 'selected-cyan' : ''}`}
              onClick={() => setSelectedRole('interrogator')}
            >
              <div className="text-3xl mb-3">🔍</div>
              <div className="text-[10px] font-black uppercase tracking-widest">Interrogator</div>
            </button>
            <button
              className={`role-card ${selectedRole === 'human' ? 'selected-magenta' : ''}`}
              onClick={() => setSelectedRole('human')}
            >
              <div className="text-3xl mb-3">🧑</div>
              <div className="text-[10px] font-black uppercase tracking-widest">Human</div>
            </button>
          </div>
        </div>

        {/* Play Button */}
        <div className="mt-auto pb-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <button
            className={`btn btn-primary ${!selectedRole || isRegistering ? 'opacity-30' : ''}`}
            onClick={handlePlay}
            disabled={!selectedRole || isRegistering}
          >
            {isRegistering ? 'Connecting...' : 'Initialize Match'}
          </button>
          
          <div className="flex justify-center gap-6 mt-6">
            <button
              className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors"
              onClick={() => router.push('/leaderboard')}
            >
              Leaderboard
            </button>
            <span className="text-zinc-800">|</span>
            <button
              className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors"
            >
              Rules
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
