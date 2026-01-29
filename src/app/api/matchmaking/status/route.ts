import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/matchmaking/status
 * Check matchmaking status / poll for match
 */
export async function GET(request: NextRequest) {
  try {
    const playerId = request.nextUrl.searchParams.get('playerId');
    
    if (!playerId) {
      return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
    }
    
    // Only look for games created in the last 2 minutes (fresh games)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    
    // Check if player is in a game (waiting or active)
    const game = await prisma.game.findFirst({
      where: {
        OR: [
          { interrogatorId: playerId },
          { humanPlayerId: playerId },
        ],
        status: { in: ['WAITING', 'IN_PROGRESS', 'GUESSING'] },
        createdAt: { gte: twoMinutesAgo },  // Only fresh games
      },
      orderBy: { createdAt: 'desc' },
    });
    
    if (game) {
      const isInterrogator = game.interrogatorId === playerId;
      
      // If we are waiting for a human
      if (game.status === 'WAITING') {
        return NextResponse.json({ 
          status: 'waiting', 
          gameId: game.id,
          yourRole: isInterrogator ? 'INTERROGATOR' : 'HUMAN' 
        });
      }

      // If we are matched
      return NextResponse.json({
        status: 'matched',
        gameId: game.id,
        humanSlot: game.humanSlot,
        yourRole: isInterrogator ? 'INTERROGATOR' : 'HUMAN',
        gameStatus: game.status,
        currentRound: game.currentRound,
      });
    }
    
    return NextResponse.json({ status: 'idle' });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
  }
}
