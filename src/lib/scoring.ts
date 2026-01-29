// Scoring algorithm for the Imitation Game

/**
 * Calculate score for a single game
 */
export function calculateScore(
  isCorrect: boolean,
  timeRemaining = 0,
  roundsPlayed = 5,
  streak = 0
): number {
  if (!isCorrect) {
    return 0;
  }

  // Base score for correct identification
  let score = 100;

  // Speed bonus (up to 50 points)
  const speedBonus = Math.round((timeRemaining / 45) * 50);
  score += speedBonus;

  // Efficiency bonus - correctly guess with fewer questions (up to 25 points)
  if (roundsPlayed < 5) {
    const efficiencyBonus = (5 - roundsPlayed) * 5;
    score += efficiencyBonus;
  }

  // Streak multiplier (10% per streak, max 50%)
  const streakMultiplier = Math.min(streak * 0.1, 0.5);
  score = Math.round(score * (1 + streakMultiplier));

  return score;
}

/**
 * Calculate user's rank title based on stats
 */
export function calculateRankTitle(totalScore: number, gamesPlayed: number) {
  const avgScore = gamesPlayed > 0 ? totalScore / gamesPlayed : 0;
  
  if (gamesPlayed < 3) return { title: 'Novice', color: '#a0a0b0' };
  if (avgScore >= 120) return { title: 'Master Interrogator', color: '#ffd700' };
  if (avgScore >= 100) return { title: 'Expert Interrogator', color: '#c0c0c0' };
  if (avgScore >= 80) return { title: 'Skilled Interrogator', color: '#cd7f32' };
  if (avgScore >= 60) return { title: 'Apprentice', color: '#00d4ff' };
  return { title: 'Beginner', color: '#8b5cf6' };
}

/**
 * Format score for display
 */
export function formatScore(score: number): string {
  return score.toLocaleString();
}
