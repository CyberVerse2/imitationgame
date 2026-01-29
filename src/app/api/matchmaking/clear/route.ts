import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/matchmaking/clear
 * Clear all stale matchmaking queue entries and stuck games (for dev/testing)
 */
export async function DELETE() {
  try {
    // Delete all games that are not finished
    const gameResult = await prisma.game.deleteMany({
      where: { 
        status: { in: ['WAITING', 'IN_PROGRESS', 'GUESSING'] }
      },
    });
    
    return NextResponse.json({ 
      cleared: true, 
      gamesDeleted: gameResult.count,
    });
  } catch (error) {
    console.error('Clear queue error:', error);
    return NextResponse.json({ error: 'Failed to clear queue' }, { status: 500 });
  }
}
