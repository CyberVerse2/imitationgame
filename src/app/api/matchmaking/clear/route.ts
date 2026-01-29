import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/matchmaking/clear
 * Clear all stale matchmaking queue entries and stuck games (for dev/testing)
 */
export async function DELETE() {
  try {
    // Delete all entries in the queue
    const queueResult = await prisma.matchmakingQueue.deleteMany({});
    
    // Delete any games that are not finished
    const gameResult = await prisma.game.deleteMany({
      where: { 
        status: { in: ['WAITING', 'IN_PROGRESS', 'GUESSING'] }
      },
    });
    
    return NextResponse.json({ 
      cleared: true, 
      queueEntriesDeleted: queueResult.count,
      gamesDeleted: gameResult.count,
    });
  } catch (error) {
    console.error('Clear queue error:', error);
    return NextResponse.json({ error: 'Failed to clear queue' }, { status: 500 });
  }
}
