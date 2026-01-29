/**
 * Share functionality for game results
 */

/**
 * Generate shareable text for game results
 */
export function generateShareText(
  isCorrect: boolean,
  score: number,
  gamesPlayed: number,
  totalScore: number
): string {
  const emoji = isCorrect ? '🎉' : '🤖';
  const result = isCorrect 
    ? "I spotted the human!" 
    : "The AI fooled me!";
  
  return `${emoji} Imitation Game ${result}

Score: +${score} pts
Total: ${totalScore} pts (${gamesPlayed} games)

Can you tell human from AI? 
Play at: imitation-game.app`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Share using Web Share API (mobile-friendly)
 */
export async function shareResults(
  isCorrect: boolean,
  score: number,
  gamesPlayed: number,
  totalScore: number
): Promise<{ success: boolean; method: string }> {
  const text = generateShareText(isCorrect, score, gamesPlayed, totalScore);
  
  // Check if Web Share API is available
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Imitation Game Results',
        text: text,
      });
      return { success: true, method: 'share' };
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  }
  
  // Fallback to clipboard
  const copied = await copyToClipboard(text);
  return { success: copied, method: 'clipboard' };
}
