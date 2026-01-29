// Random names for game participants
// Used to make the game feel more natural than "Participant A/B"

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey',
  'Riley', 'Quinn', 'Avery', 'Sage', 'Drew',
  'Jamie', 'Parker', 'Skyler', 'Reese', 'Finley',
  'Charlie', 'Blake', 'Emerson', 'Hayden', 'Logan',
  'River', 'Dakota', 'Phoenix', 'Rowan', 'Peyton',
  'Kai', 'Jessie', 'Lane', 'Shawn', 'Robin',
];

/**
 * Generate consistent random names for a game based on gameId
 * @param gameId - The game's unique ID (used as seed)
 * @returns Object with names for both participants
 */
export function getGameNames(gameId: string): { nameA: string; nameB: string } {
  // Simple hash function for the gameId
  let hash = 0;
  for (let i = 0; i < gameId.length; i++) {
    hash = ((hash << 5) - hash) + gameId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Get two different indices
  const indexA = Math.abs(hash) % FIRST_NAMES.length;
  let indexB = Math.abs(hash >> 8) % FIRST_NAMES.length;
  
  // Ensure names are different
  if (indexB === indexA) {
    indexB = (indexB + 1) % FIRST_NAMES.length;
  }
  
  return {
    nameA: FIRST_NAMES[indexA],
    nameB: FIRST_NAMES[indexB],
  };
}

export { FIRST_NAMES };
