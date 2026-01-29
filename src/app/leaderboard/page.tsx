'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { calculateRankTitle } from '@/lib/scoring';

interface LeaderboardEntry {
  id: string;
  username: string | null;
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const data = await res.json();
          setEntries(data.entries || []);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, []);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            className="btn btn-secondary text-sm"
            onClick={() => router.push('/')}
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-center">
            🏆 <span className="text-[var(--neon-cyan)]">Leaderboard</span>
          </h1>
          <div style={{ width: 80 }}></div>
        </div>

        {/* Leaderboard Table */}
        <div className="card">
          {loading ? (
            <div className="text-center py-12">
              <div className="typing-indicator justify-center">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <p className="text-[var(--text-secondary)] mt-4">Loading...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🏆</div>
              <p className="text-lg font-semibold mb-2">No scores yet!</p>
              <p className="text-[var(--text-secondary)]">
                Be the first to play and set a record.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-[var(--text-secondary)] border-b border-[var(--dark-border)]">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4 text-right">Games</th>
                  <th className="py-3 px-4 text-right">Win %</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const rank = calculateRankTitle(entry.totalScore, entry.gamesPlayed);
                  const winRate = entry.gamesPlayed > 0 
                    ? Math.round((entry.gamesWon / entry.gamesPlayed) * 100) 
                    : 0;
                  
                  return (
                    <tr 
                      key={entry.id}
                      className="border-b border-[var(--dark-border)] last:border-0 hover:bg-[rgba(0,245,255,0.05)]"
                    >
                      <td className="py-4 px-4 text-xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold">{entry.username || 'Anonymous'}</div>
                        <div className="text-xs" style={{ color: rank.color }}>{rank.title}</div>
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-[var(--neon-cyan)]">
                        {entry.totalScore.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right text-[var(--text-secondary)]">
                        {entry.gamesPlayed}
                      </td>
                      <td className="py-4 px-4 text-right text-[var(--text-secondary)]">
                        {winRate}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Play button */}
        <div className="text-center mt-8">
          <button 
            className="btn btn-primary"
            onClick={() => router.push('/')}
          >
            Play Now
          </button>
        </div>
      </div>
    </main>
  );
}
