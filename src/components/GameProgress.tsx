'use client';

interface GameProgressProps {
  currentRound: number;
  totalRounds: number;
}

export default function GameProgress({ currentRound, totalRounds }: GameProgressProps) {
  return (
    <div className="game-progress">
      <div className="progress-label">
        Round {currentRound} of {totalRounds}
      </div>
      <div className="progress-dots">
        {Array.from({ length: totalRounds }, (_, i) => (
          <div
            key={i}
            className={`progress-dot ${i + 1 === currentRound ? 'active' : ''} ${i + 1 < currentRound ? 'complete' : ''}`}
          />
        ))}
      </div>
      
      <style jsx>{`
        .game-progress {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        
        .progress-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        
        .progress-dots {
          display: flex;
          gap: 8px;
        }
        
        .progress-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--dark-border);
          transition: all 0.3s;
        }
        
        .progress-dot.active {
          background: var(--neon-cyan);
          box-shadow: 0 0 10px var(--neon-cyan);
        }
        
        .progress-dot.complete {
          background: var(--neon-purple);
        }
      `}</style>
    </div>
  );
}
