import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/game/advance
 * Advance the game to the next round
 */
export async function POST(request: NextRequest) {
  try {
    const { gameId, playerId, nextRound } = await request.json();
    
    if (!gameId || !playerId || !nextRound) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    
    // Only interrogator can advance rounds
    if (game.interrogatorId !== playerId) {
      return NextResponse.json({ error: 'Not the interrogator' }, { status: 403 });
    }
    
    // Validate nextRound
    if (nextRound > game.totalRounds) {
       await prisma.game.update({
         where: { id: gameId },
         data: { status: 'GUESSING' },
       });
       return NextResponse.json({ status: 'ready_to_guess' });
    }

    // Update game round
    await prisma.game.update({
      where: { id: gameId },
      data: { currentRound: nextRound },
    });
    
    return NextResponse.json({ 
      status: 'advanced',
      currentRound: nextRound 
    });
  } catch (error) {
    console.error('Advance round error:', error);
    return NextResponse.json({ error: 'Failed to advance round' }, { status: 500 });
  }
}
