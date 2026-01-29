import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/game/status
 * Get current game status for both players
 */
export async function GET(request: NextRequest) {
  try {
    const gameId = request.nextUrl.searchParams.get('gameId');
    
    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }
    
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      status: game.status,
      currentRound: game.currentRound,
      totalRounds: game.totalRounds,
      humanSlot: game.humanSlot,
      isCorrect: game.isCorrect,
      finalGuess: game.finalGuess,
      finalScore: game.finalScore,
    });
  } catch (error) {
    console.error('Game status error:', error);
    return NextResponse.json({ error: 'Failed to get game status' }, { status: 500 });
  }
}
