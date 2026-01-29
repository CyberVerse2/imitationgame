import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/game/guess
 * Submit the interrogator's guess
 */
export async function POST(request: NextRequest) {
  try {
    const { gameId, playerId, guess } = await request.json();
    
    if (!gameId || !playerId || !guess) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    
    if (game.interrogatorId !== playerId) {
      return NextResponse.json({ error: 'Not the interrogator' }, { status: 403 });
    }
    
    const isCorrect = guess === game.humanSlot;
    const score = isCorrect ? 100 : 0;
    
    // Update game status
    await prisma.game.update({
      where: { id: gameId },
      data: { status: 'FINISHED' },
    });
    
    return NextResponse.json({
      isCorrect,
      humanSlot: game.humanSlot,
      score,
    });
  } catch (error) {
    console.error('Guess error:', error);
    return NextResponse.json({ error: 'Failed to process guess' }, { status: 500 });
  }
}
